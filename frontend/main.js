import "./core.css";
import { installAdaptiveFilters } from "./loader.js";
"use strict";
const byId = (id) => document.getElementById(id);
const projectFilter = byId("project-filter");
const statusFilter = byId("status-filter");
let snapshot = null;
let requestNumber = 0;
const number = new Intl.NumberFormat("tr-TR");

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function validSnapshot(data) {
  const string = (value) => typeof value === "string";
  const counter = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
  return data && string(data.updated_at) && string(data.credit_note) &&
    typeof data.paused === "boolean" && Array.isArray(data.projects) && Array.isArray(data.jobs) &&
    data.projects.every((p) => p && string(p.id) && string(p.name) && typeof p.enabled === "boolean") &&
    data.jobs.every((j) => j && [j.id, j.project_key, j.name, j.status].every(string) &&
      (j.stage === null || string(j.stage)) &&
      [j.agent_calls, j.uncached_input_tokens, j.output_tokens].every(counter));
}

function options(select, entries) {
  const previous = select.selectedOptions[0]?.dataset.key;
  // Keep factory values selectable directly, including empty identifiers.
  const keys = new Set(entries.map(([, key]) => key));
  let allValue = "";
  while (keys.has(allValue)) allValue += "_";
  select.replaceChildren(new Option("Tümünü", allValue));
  entries.forEach(([label, key]) => {
    const option = new Option(label, key);
    option.dataset.key = key;
    select.add(option);
    if (key === previous) option.selected = true;
  });
}

function renderJobs() {
  if (!snapshot) return;
  const project = projectFilter.selectedOptions[0]?.dataset.key ?? null;
  const status = statusFilter.selectedOptions[0]?.dataset.key ?? null;
  const jobs = snapshot.jobs.filter((job) => (project === null || job.project_key === project) &&
    (status === null || job.status === status));
  const container = byId("jobs");
  container.replaceChildren();
  byId("result-count").textContent = `${jobs.length} görev`;
  const projects = new Map(snapshot.projects.map((p) => [p.id, p.name]));
  jobs.forEach((job) => {
    const card = element("article", "", "card job-card");
    const heading = element("div", "", "job-heading");
    const title = element("div", "");
    title.append(element("p", projects.get(job.project_key) ?? job.project_key, "project-name"), element("h3", job.name));
    heading.append(title, element("span", job.status, "badge status-badge"));
    card.append(heading);
    const details = element("dl", "", "job-details");
    [["Aşama", job.stage ?? "Belirtilmedi"], ["Ajan çağrıları", number.format(job.agent_calls)],
      ["Önbelleksiz girdi tokenları", number.format(job.uncached_input_tokens)],
      ["Çıktı tokenları", number.format(job.output_tokens)]].forEach(([label, value]) => {
      const group = element("div", "");
      group.append(element("dt", label), element("dd", value));
      details.append(group);
    });
    card.append(details);
    container.append(card);
  });
  byId("feedback").textContent = jobs.length ? `${jobs.length} görev gösteriliyor.` :
    "Görev bulunamadı. Seçili filtrelere uygun sonuç yok.";
}

function renderSnapshot() {
  options(projectFilter, snapshot.projects.map((p) => [p.name, p.id]));
  options(statusFilter, [...new Set(snapshot.jobs.map((j) => j.status))].map((status) => [status, status]));
  byId("project-count").textContent = number.format(snapshot.projects.length);
  byId("job-count").textContent = number.format(snapshot.jobs.length);
  byId("factory-state").textContent = snapshot.paused ? "Duraklatıldı" : "Etkin";
  byId("updated-at").textContent = snapshot.updated_at;
  byId("credit-note").textContent = snapshot.credit_note;
  const projects = byId("projects");
  projects.replaceChildren();
  snapshot.projects.forEach((project) => {
    const item = element("div", "", "project-chip");
    item.append(element("span", project.name), element("span", project.enabled ? "Etkin" : "Devre dışı", "project-state"));
    projects.append(item);
  });
  if (!snapshot.projects.length) projects.append(element("p", "Henüz proje yok.", "muted"));
  byId("content").hidden = false;
  renderJobs();
}

async function refresh() {
  const current = ++requestNumber;
  snapshot = null;
  byId("content").hidden = true;
  byId("jobs").replaceChildren();
  byId("projects").replaceChildren();
  byId("feedback").textContent = "Yükleniyor… Fabrika verisi alınıyor.";
  byId("content").setAttribute("aria-busy", "true");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("/api/overview", { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error("unavailable");
    const data = await response.json();
    if (!validSnapshot(data)) throw new Error("invalid");
    if (current !== requestNumber) return;
    snapshot = data;
    renderSnapshot();
  } catch {
    if (current !== requestNumber) return;
    snapshot = null;
    byId("content").hidden = true;
    byId("feedback").textContent = "Fabrika verisi yüklenemedi. Güncel sonuçlar gösterilemiyor. Yenile düğmesiyle tekrar deneyin.";
  } finally {
    clearTimeout(timeout);
    if (current === requestNumber) byId("content").setAttribute("aria-busy", "false");
  }
}
projectFilter.addEventListener("change", renderJobs);
statusFilter.addEventListener("change", renderJobs);
byId("refresh").addEventListener("click", refresh);
refresh();

installAdaptiveFilters(document.getElementById("filter-panel"));
