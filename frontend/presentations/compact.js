import './compact.css';

export function mount(host) {
  host.classList.add('profile-compact');
  const toggle = host.querySelector('.filter-toggle');
  const controls = host.querySelector('.filter-controls');
  // Reuse the existing controls; selected filters and keyboard focus survive resize.
  const focused = controls.contains(document.activeElement);
  toggle.hidden = false;
  controls.hidden = !focused;
  toggle.setAttribute('aria-expanded', String(focused));
  const change = () => {
    controls.hidden = !controls.hidden;
    toggle.setAttribute('aria-expanded', String(!controls.hidden));
  };
  toggle.addEventListener('click', change);
  return () => {
    toggle.removeEventListener('click', change);
    controls.hidden = false;
    toggle.hidden = true;
    host.classList.remove('profile-compact');
    if (document.activeElement === toggle) controls.querySelector('select')?.focus();
  };
}
