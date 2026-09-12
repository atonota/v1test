"""Observe the real application handler through a loopback HTTP server."""

import http.client
import importlib.util
from http.server import HTTPServer
from pathlib import Path
import threading
import unittest


class HTTPAcceptanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app_path = Path(__file__).resolve().parents[1] / "app.py"
        spec = importlib.util.spec_from_file_location("validation_native_python_v8", app_path)
        app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(app)

        cls.server = HTTPServer(("127.0.0.1", 0), app.Handler)
        cls.addClassCleanup(cls.server.server_close)
        cls.server_thread = threading.Thread(
            target=cls.server.serve_forever,
            kwargs={"poll_interval": 0.01},
            daemon=True,
        )
        cls.server_thread.start()
        cls.addClassCleanup(cls.stop_server)

    @classmethod
    def stop_server(cls):
        cls.server.shutdown()
        cls.server_thread.join(timeout=5)
        if cls.server_thread.is_alive():
            raise AssertionError("Acceptance HTTP server did not stop")

    def assert_http_response(self, path, expected_body):
        connection = http.client.HTTPConnection(*self.server.server_address, timeout=5)
        self.addCleanup(connection.close)
        connection.request("GET", path)
        response = connection.getresponse()
        body = response.read()

        with self.subTest(path=path, field="status"):
            self.assertEqual(response.status, 200)
        with self.subTest(path=path, field="content_type"):
            self.assertEqual(
                response.getheader("Content-Type"), "text/plain; charset=utf-8"
            )
        with self.subTest(path=path, field="body"):
            self.assertEqual(body, expected_body)

    def test_health_returns_ok_as_utf8_plain_text(self):
        self.assert_http_response("/health", b"ok")

    def test_value_returns_baseline_as_utf8_plain_text(self):
        self.assert_http_response("/value", b"baseline")


if __name__ == "__main__":
    unittest.main()
