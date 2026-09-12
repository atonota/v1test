import './wide.css';

export function mount(host) {
  host.classList.add('profile-wide');
  const controls = host.querySelector('.filter-controls');
  controls.hidden = false;
  host.querySelector('.filter-toggle').hidden = true;
  return () => host.classList.remove('profile-wide');
}
