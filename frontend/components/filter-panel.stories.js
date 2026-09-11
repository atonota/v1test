import { createFilterPanel } from './filter-panel.js';
export default { title: 'Fabrika/Filtreleme', render: args => createFilterPanel(args),
  argTypes: { profile: { control: 'select', options: ['compact', 'wide'] } },
  parameters: { docs: { description: { component: 'Aynı filtre durumu ve semantik; dar alanda açılır panel, geniş alanda görünür kontroller. Production yükleme testi ayrıca çalışır.' } } },
};
export const DarAlan = { args: { profile: 'compact' } };
export const GenisAlan = { args: { profile: 'wide' } };
export const BosProjeler = { args: { profile: 'compact', projects: [] } };
export const UzunEtiketler = { args: { profile: 'wide', projects: ['Uluslararası operasyon ve tedarik yönetimi projesi'] } };
