"""Pilot AC 1–5 and HTTP-observable safeguards from AC 9–10.

Browser rendering, keyboard/mobile behavior, and axe belong to the host gate.
Responsibility separation and absence of arbitrary host/LLM/DB execution also
need source review: a finite HTTP suite cannot prove those properties.
Automated checks are not a complete human WCAG audit or certification.
"""

import builtins
from copy import deepcopy
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

import pytest
from fastapi.testclient import TestClient

from app.main import app


LIMIT = 2 * 1024 * 1024
SECRET = "private-canary-credential-do-not-expose"
JOB_FIELDS = {
    "id", "project_key", "name", "status", "stage", "agent_calls",
    "uncached_input_tokens", "output_tokens",
}


@pytest.fixture
def client():
    with TestClient(app) as instance:
        yield instance


@pytest.fixture
def snapshot():
    return {
        "updated_at": "2026-09-11T15:04:05+03:00",
        "projects": [
            {"id": "pilot", "name": "Örnek üretim", "enabled": True},
            {"id": "disabled", "name": "Bekleyen proje", "enabled": False},
        ],
        "jobs": [
            {
                "id": "job-1", "project_key": "pilot", "name": "Türkçe görev",
                "status": "running", "stage": "review", "agent_calls": 7,
                "uncached_input_tokens": 1234, "output_tokens": 56,
            },
            {
                "id": "job-2", "project_key": "disabled", "name": "İkinci görev",
                "status": "queued", "stage": None, "agent_calls": 0,
                "uncached_input_tokens": 0, "output_tokens": 0,
            },
        ],
        "paused": False,
        "credit_note": "Kredi durumu fabrika tarafından sağlanır.",
    }


@pytest.fixture
def status_file(tmp_path, monkeypatch):
    path = tmp_path / "private-status.json"
    monkeypatch.setenv("FACTORY_STATUS_FILE", str(path))
    return path


def write_snapshot(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")


def assert_unavailable(response, path=None):
    assert response.status_code == 503
    body = response.text
    for forbidden in (SECRET, "Traceback", "PermissionError", "JSONDecodeError",
                      "FileNotFoundError", "NotADirectoryError"):
        assert forbidden not in body
    if path is not None:
        assert str(path) not in body
        assert path.name not in body
        assert str(path.parent) not in body


def test_overview_returns_exact_factory_values(client, snapshot, status_file):
    """First RED must be the stub's HTTP 501, not a collection/import failure."""
    write_snapshot(status_file, snapshot)
    response = client.get("/api/overview")
    assert response.status_code == 200
    assert response.json() == snapshot
    assert set(response.json()) == {"updated_at", "projects", "jobs", "paused", "credit_note"}
    assert all(set(project) == {"id", "name", "enabled"} for project in response.json()["projects"])
    assert all(set(job) == JOB_FIELDS for job in response.json()["jobs"])


@pytest.mark.parametrize("state", ["unset", "missing", "malformed", "valid"])
def test_health_is_independent_of_snapshot(client, snapshot, status_file, monkeypatch, state):
    if state == "unset":
        monkeypatch.delenv("FACTORY_STATUS_FILE", raising=False)
    elif state == "malformed":
        status_file.write_text("{invalid", encoding="utf-8")
    elif state == "valid":
        write_snapshot(status_file, snapshot)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_missing_environment_is_unavailable(client, monkeypatch):
    monkeypatch.delenv("FACTORY_STATUS_FILE", raising=False)
    assert_unavailable(client.get("/api/overview"))


def test_missing_file_is_unavailable(client, status_file):
    assert_unavailable(client.get("/api/overview"), status_file)


def test_directory_is_not_a_snapshot(client, status_file):
    status_file.mkdir()
    assert_unavailable(client.get("/api/overview"), status_file)


@pytest.mark.parametrize("raw", [b"", b"{", b'{"credentials":"' + SECRET.encode() + b'",', b"\xff\xfe"])
def test_malformed_snapshot_is_sanitized(client, status_file, raw):
    status_file.write_bytes(raw)
    assert_unavailable(client.get("/api/overview"), status_file)


def is_target(file, target):
    return isinstance(file, (str, bytes, os.PathLike)) and os.fsdecode(file) == str(target)


def test_unreadable_snapshot_is_sanitized(client, snapshot, status_file, monkeypatch):
    write_snapshot(status_file, snapshot)
    # Deterministic PermissionError even when the test runner can bypass chmod.
    for owner, name in ((builtins, "open"), (io, "open"), (os, "open")):
        original = getattr(owner, name)

        def denied(file, *args, _original=original, **kwargs):
            if is_target(file, status_file):
                raise PermissionError(f"{SECRET}: {status_file}")
            return _original(file, *args, **kwargs)

        monkeypatch.setattr(owner, name, denied)
    assert_unavailable(client.get("/api/overview"), status_file)


@pytest.mark.parametrize("value", [None, [], "snapshot", 1, True, {}])
def test_invalid_root_is_unavailable(client, status_file, value):
    write_snapshot(status_file, value)
    assert_unavailable(client.get("/api/overview"), status_file)


REQUIRED_PATHS = (
    [(key,) for key in ("updated_at", "projects", "jobs", "paused", "credit_note")]
    + [("projects", 0, key) for key in ("id", "name", "enabled")]
    + [("jobs", 0, key) for key in sorted(JOB_FIELDS)]
)


def parent_at(snapshot, path):
    parent = snapshot
    for key in path[:-1]:
        parent = parent[key]
    return parent


@pytest.mark.parametrize("path", REQUIRED_PATHS, ids=lambda path: ".".join(map(str, path)))
def test_every_required_field_is_required(client, snapshot, status_file, path):
    del parent_at(snapshot, path)[path[-1]]
    write_snapshot(status_file, snapshot)
    assert_unavailable(client.get("/api/overview"), status_file)


INVALID_FIELDS = [
    (("updated_at",), None), (("updated_at",), 123),
    (("projects",), {}), (("projects",), None), (("projects",), "projects"),
    (("jobs",), {}), (("jobs",), None), (("jobs",), "jobs"),
    (("projects", 0), None), (("projects", 0), []),
    (("jobs", 0), "job"), (("jobs", 0), None),
    (("paused",), "false"), (("paused",), 0), (("paused",), None),
    (("credit_note",), None), (("credit_note",), {}),
    (("projects", 0, "enabled"), "true"),
    (("projects", 0, "enabled"), 1), (("projects", 0, "enabled"), None),
]
for field in ("id", "name"):
    INVALID_FIELDS.extend([(("projects", 0, field), 42), (("projects", 0, field), None)])
for field in ("id", "project_key", "name", "status"):
    INVALID_FIELDS.extend([(("jobs", 0, field), 42), (("jobs", 0, field), None)])
for value in (False, 42, [], {}):
    INVALID_FIELDS.append((("jobs", 0, "stage"), value))
for field in ("agent_calls", "uncached_input_tokens", "output_tokens"):
    for value in (-1, "3", True, None, [], {}):
        INVALID_FIELDS.append((("jobs", 0, field), value))


@pytest.mark.parametrize("path,value", INVALID_FIELDS)
def test_wrong_types_and_negative_counters_are_unavailable(client, snapshot, status_file, path, value):
    parent_at(snapshot, path)[path[-1]] = value
    write_snapshot(status_file, snapshot)
    assert_unavailable(client.get("/api/overview"), status_file)


def test_empty_lists_are_valid(client, snapshot, status_file):
    snapshot.update(projects=[], jobs=[], paused=True)
    write_snapshot(status_file, snapshot)
    response = client.get("/api/overview")
    assert response.status_code == 200
    assert response.json() == snapshot


def test_unknown_fields_are_removed_at_every_level(client, snapshot, status_file):
    extra = {"reason": SECRET, "credentials": {"token": SECRET},
             "private_path": str(status_file), "unknown": [SECRET]}
    contaminated = deepcopy(snapshot)
    contaminated.update(extra)
    for item in contaminated["projects"] + contaminated["jobs"]:
        item.update(extra)
    write_snapshot(status_file, contaminated)
    response = client.get("/api/overview")
    assert response.status_code == 200
    assert response.json() == snapshot
    assert SECRET not in response.text
    assert str(status_file) not in response.text


def test_each_request_reads_current_file_and_never_serves_stale_success(client, snapshot, status_file):
    write_snapshot(status_file, snapshot)
    assert client.get("/api/overview").json() == snapshot
    snapshot.update(paused=True, credit_note="Yeni kredi notu", updated_at="yeni zaman")
    snapshot["jobs"][0].update(stage=None, status="custom-factory-status", agent_calls=99)
    write_snapshot(status_file, snapshot)
    response = client.get("/api/overview")
    assert response.status_code == 200
    assert response.json() == snapshot
    status_file.write_text("{broken", encoding="utf-8")
    assert_unavailable(client.get("/api/overview"), status_file)
    status_file.unlink()
    assert_unavailable(client.get("/api/overview"), status_file)
    write_snapshot(status_file, snapshot)
    assert client.get("/api/overview").json() == snapshot


def test_client_cannot_select_snapshot_file(client, snapshot, status_file, tmp_path):
    write_snapshot(status_file, snapshot)
    other = tmp_path / "client-selected.json"
    alternate = dict(snapshot, credit_note=SECRET)
    write_snapshot(other, alternate)
    params = {key: str(other) for key in ("path", "file", "filename", "status_file", "snapshot_path", "FACTORY_STATUS_FILE")}
    response = client.get("/api/overview", params=params)
    assert response.status_code in (200, 400, 422)
    if response.status_code == 200:
        assert response.json() == snapshot
    assert SECRET not in response.text
    # A parameter under another spelling must not advertise file selection.
    assert app.openapi()["paths"]["/api/overview"]["get"].get("parameters", []) == []


def test_exact_two_mib_valid_snapshot_is_accepted(client, snapshot, status_file):
    raw = json.dumps(snapshot, ensure_ascii=False).encode("utf-8")
    status_file.write_bytes(raw + b" " * (LIMIT - len(raw)))
    response = client.get("/api/overview")
    assert response.status_code == 200
    assert response.json() == snapshot


def test_oversized_snapshot_is_rejected_before_reading(client, status_file, monkeypatch):
    status_file.write_bytes(b" " * (LIMIT + 1))
    reads = []

    class ReadGuard:
        def __init__(self, stream):
            self.stream = stream

        def __enter__(self):
            self.stream.__enter__()
            return self

        def __exit__(self, *args):
            return self.stream.__exit__(*args)

        def __getattr__(self, name):
            if name.startswith("read"):
                def forbidden(*args, **kwargs):
                    reads.append(name)
                    raise AssertionError("Oversized snapshot was read before rejection")
                return forbidden
            return getattr(self.stream, name)

        def __iter__(self):
            reads.append("iteration")
            raise AssertionError("Oversized snapshot was iterated before rejection")

    for owner in (builtins, io):
        original = owner.open

        def guarded(file, *args, _original=original, **kwargs):
            stream = _original(file, *args, **kwargs)
            return ReadGuard(stream) if is_target(file, status_file) else stream

        monkeypatch.setattr(owner, "open", guarded)
    assert_unavailable(client.get("/api/overview"), status_file)
    assert reads == [], "Catching a read error does not satisfy the pre-read size limit"


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.nodes = []
        self.stack = []

    def handle_starttag(self, tag, attrs):
        node = {"tag": tag, "attrs": dict(attrs), "text": "", "parents": list(self.stack)}
        self.nodes.append(node)
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]["tag"] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        for node in self.stack:
            node["text"] += data

    def select(self, tag):
        return [node for node in self.nodes if node["tag"] == tag]


def test_home_has_turkish_semantics_and_labeled_controls(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    document = Document()
    document.feed(response.text)
    assert any(node["attrs"].get("lang") == "tr" for node in document.select("html"))
    assert any(node["text"].strip() for node in document.select("title"))
    assert document.select("main")
    assert any(node["text"].strip() == "Fabrika durum ve görev panosu" for node in document.select("h1"))
    assert any(node["text"].strip() == "Yenile" and "disabled" not in node["attrs"] for node in document.select("button"))
    for text in ("Proje", "Durum"):
        labels = [node for node in document.select("label") if node["text"].strip().rstrip(":") == text]
        assert labels, f"Missing Turkish label: {text}"
        assert any(
            "disabled" not in control["attrs"] and control["attrs"].get("tabindex") != "-1"
            and any((label["attrs"].get("for") and label["attrs"]["for"] == control["attrs"].get("id"))
                    or label in control["parents"] for label in labels)
            for control in document.select("select")
        ), f"No accessible select associated with {text}"


def test_home_serves_local_daisyui_and_has_no_external_resource_markup(client):
    response = client.get("/")
    assert response.status_code == 200
    document = Document()
    document.feed(response.text)
    stylesheets = []
    for node in document.nodes:
        attrs = node["attrs"]
        urls = [attrs[key] for key in ("src", "poster", "data") if attrs.get(key)]
        if node["tag"] == "link" and attrs.get("href"):
            urls.append(attrs["href"])
            if "stylesheet" in attrs.get("rel", "").split():
                stylesheets.append(attrs["href"])
        for url in urls:
            parsed = urlsplit(url)
            assert not parsed.netloc and not parsed.scheme, f"Non-local resource: {url}"
    assert stylesheets, "The dashboard must load local DaisyUI CSS"
    css = []
    for url in stylesheets:
        resource = client.get(url)
        assert resource.status_code == 200
        assert "text/css" in resource.headers["content-type"]
        css.append(resource.text)
    combined = "\n".join(css)
    assert "daisyui" in combined.lower(), "Local CSS must contain the DaisyUI distribution"
    assert ".btn" in combined and ".select" in combined


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
@pytest.mark.parametrize("route", ["/", "/health", "/api/overview", "/api/control", "/api/run", "/api/pause"])
def test_http_surface_is_read_only(client, snapshot, status_file, method, route):
    write_snapshot(status_file, snapshot)
    before = status_file.read_bytes()
    response = getattr(client, method)(route)
    assert response.status_code in (404, 405)
    assert status_file.read_bytes() == before


@pytest.mark.parametrize("route", [
    "/.env", "/.git/config", "/app/main.py", "/AGENTS.md",
    "/private-status.json", "/static/../.env", "/static/%2e%2e/.env",
    "/static/%2e%2e/app/main.py", "/api/control", "/api/run", "/api/pause",
])
def test_private_files_and_host_controls_are_not_http_resources(client, status_file, route):
    status_file.write_text(SECRET, encoding="utf-8")
    response = client.get(route)
    assert response.status_code in (403, 404)
    assert SECRET not in response.text


def test_configured_snapshot_cannot_be_downloaded_by_its_path(client, status_file):
    status_file.write_text(SECRET, encoding="utf-8")
    for route in (str(status_file), "/static" + str(status_file)):
        response = client.get(route)
        assert response.status_code in (403, 404)
        assert SECRET not in response.text
