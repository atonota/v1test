import { createFilterPanel } from './filter-panel.js';
function render({ profile, projects = ['Birinci proje', 'İkinci proje'] }) {
  const snapshot = {
    projects: projects.map((name, index) => ({ id: `p${index + 1}`, name })),
    jobs: ['RUNNING', 'ERROR', 'RELEASED'].map(status => ({ status })),
  };
  const panel = createFilterPanel({ profile, onRefresh: () => panel.update(snapshot) });
  panel.update(snapshot);
  return panel.element;
}

export default { title: 'Fabrika/Filtreleme', render,
  argTypes: { profile: { control: 'select', options: ['compact', 'wide'] } },
  parameters: { docs: { description: { component: 'Aynı filtre durumu ve semantik; dar alanda açılır panel, geniş alanda görünür kontroller. Production yükleme testi ayrıca çalışır.' } } },
};
export const DarAlan = { args: { profile: 'compact' } };
export const GenisAlan = { args: { profile: 'wide' } };
export const BosProjeler = { args: { profile: 'compact', projects: [] } };
export const UzunEtiketler = { args: { profile: 'wide', projects: ['Uluslararası operasyon ve tedarik yönetimi projesi'] } };
