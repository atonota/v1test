import { installAdaptiveFilters } from '../loader.js';

/** Catalog factory using the same production loader and presentation modules. */
export function createFilterPanel({ profile, projects = ['Birinci proje', 'İkinci proje'] } = {}) {
  const section = document.createElement('section');
  section.className = 'toolbar card';
  section.setAttribute('aria-label', 'Görev filtreleri');
  const id = 'filters-' + crypto.randomUUID();
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'btn filter-toggle'; toggle.textContent = 'Filtreler';
  toggle.hidden = true; toggle.setAttribute('aria-expanded', 'true'); toggle.setAttribute('aria-controls', id);
  const controls = document.createElement('div'); controls.className = 'filter-controls'; controls.id = id;
  for (const [name, entries] of [['Proje', projects], ['Durum', ['RUNNING', 'ERROR', 'RELEASED']]]) {
    const field = document.createElement('div'); field.className = 'field';
    const label = document.createElement('label'); label.textContent = name; label.htmlFor = id + name;
    const select = document.createElement('select'); select.className = 'select'; select.id = label.htmlFor;
    select.add(new Option('Tümünü', ''));
    entries.forEach(value => select.add(new Option(value, value)));
    field.append(label, select); controls.append(field);
  }
  const refresh = document.createElement('button'); refresh.type = 'button'; refresh.className = 'btn btn-primary'; refresh.textContent = 'Yenile';
  section.append(toggle, controls, refresh);
  installAdaptiveFilters(section, { profile });
  return section;
}
