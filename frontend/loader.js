const loaders = {
  compact: () => import('./presentations/compact.js'),
  wide: () => import('./presentations/wide.js'),
};

export function installAdaptiveFilters(host, { profile } = {}) {
  const media = matchMedia('(min-width: 768px)');
  let cleanup = () => {};
  let generation = 0;
  let disposed = false;
  async function select() {
    const ticket = ++generation;
    const selected = profile || (media.matches ? 'wide' : 'compact');
    const presentation = await loaders[selected]();
    if (disposed || ticket !== generation) return;
    cleanup();
    cleanup = presentation.mount(host);
    host.dataset.profile = selected;
  }
  // Universal labeled controls remain usable if an enhancement cannot load.
  const update = () => select().catch(() => { host.dataset.profile = 'baseline'; });
  if (!profile) media.addEventListener('change', update);
  const ready = update();
  return { ready, dispose() { disposed = true; generation++; cleanup(); media.removeEventListener('change', update); } };
}
