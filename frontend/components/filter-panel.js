import { installAdaptiveFilters } from '../loader.js';

function options(select, entries) {
  const previous = select.selectedOptions[0]?.dataset.key;
  // Keep factory values selectable directly, including empty identifiers.
  const keys = new Set(entries.map(([, key]) => key));
  let allValue = '';
  while (keys.has(allValue)) allValue += '_';
  select.replaceChildren(new Option('Tümünü', allValue));
  entries.forEach(([label, key]) => {
    const option = new Option(label, key);
    option.dataset.key = key;
    select.add(option);
    if (key === previous) option.selected = true;
  });
}

function createControls(id) {
  const section = document.createElement('section');
  section.id = id;
  section.className = 'toolbar card';
  section.setAttribute('aria-label', 'Görev filtreleri');
  // Preserve the dashboard's existing control IDs; isolate catalog instances.
  const controlId = name => id === 'filter-panel' ? name : `${id}-${name}`;
  const toggle = document.createElement('button');
  toggle.id = controlId('filter-toggle');
  toggle.type = 'button'; toggle.className = 'btn filter-toggle'; toggle.textContent = 'Filtreler';
  toggle.hidden = true; toggle.setAttribute('aria-expanded', 'true');
  const controls = document.createElement('div');
  controls.className = 'filter-controls'; controls.id = controlId('filter-controls');
  toggle.setAttribute('aria-controls', controls.id);
  ['project-filter', 'status-filter'].forEach((name, index) => {
    const field = document.createElement('div'); field.className = 'field';
    const label = document.createElement('label'); label.textContent = ['Proje', 'Durum'][index];
    label.htmlFor = controlId(name);
    const select = document.createElement('select'); select.className = 'select'; select.id = label.htmlFor;
    options(select, []);
    field.append(label, select); controls.append(field);
  });
  const refresh = document.createElement('button');
  refresh.id = controlId('refresh');
  refresh.type = 'button'; refresh.className = 'btn btn-primary'; refresh.textContent = 'Yenile';
  section.append(toggle, controls, refresh);
  return section;
}

/** Enhance existing HTML or create catalog controls with the same behavior. */
export function createFilterPanel({
  id = 'filters-' + crypto.randomUUID(), profile, element,
  onChange = () => {}, onRefresh = () => {},
} = {}) {
  const section = element ?? createControls(id);
  const selects = [...section.querySelectorAll('select')];
  const [projectFilter, statusFilter] = selects;
  const refresh = section.querySelector('.btn-primary');
  selects.forEach(select => select.addEventListener('change', onChange));
  refresh.addEventListener('click', onRefresh);
  const adaptive = installAdaptiveFilters(section, { profile });
  return {
    element: section,
    get selection() {
      return {
        project: projectFilter.selectedOptions[0]?.dataset.key ?? null,
        status: statusFilter.selectedOptions[0]?.dataset.key ?? null,
      };
    },
    update({ projects, jobs }) {
      options(projectFilter, projects.map(p => [p.name, p.id]));
      options(statusFilter, [...new Set(jobs.map(j => j.status))].map(status => [status, status]));
    },
    dispose() {
      adaptive.dispose();
      selects.forEach(select => select.removeEventListener('change', onChange));
      refresh.removeEventListener('click', onRefresh);
    },
  };
}
