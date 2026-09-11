import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Source ownership, not a guessed output filename, determines exclusivity.
function deliveryGraph() {
  return {
    name: 'factory-delivery-graph',
    generateBundle(_, bundle) {
      const graph = { version: 1, chunks: {}, entries: [], profiles: {} };
      for (const [file, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const modules = Object.keys(chunk.modules).map(id => id.replaceAll('\\', '/').split('/frontend/')[1]).filter(Boolean);
        const profiles = ['compact', 'wide'].filter(profile => modules.some(id => id === `presentations/${profile}.js`));
        graph.chunks[file] = { modules, profiles, imports: chunk.imports, dynamicImports: chunk.dynamicImports, css: [...(chunk.viteMetadata?.importedCss || [])] };
        if (chunk.isEntry) graph.entries.push(file);
        profiles.forEach(profile => { graph.profiles[profile] = file; });
      }
      for (const [file, asset] of Object.entries(bundle)) {
        if (asset.type !== 'asset' || !file.endsWith('.css')) continue;
        graph.chunks[file] = { profiles: ['compact', 'wide'].filter(profile => String(asset.source).includes(`.profile-${profile}`)), imports: [], css: [], modules: [] };
      }
      function closure(file, visited = new Set()) {
        if (visited.has(file)) return visited;
        visited.add(file);
        const item = graph.chunks[file];
        if (!item) throw new Error(`Unknown built dependency: ${file}`);
        [...item.imports, ...item.css].forEach(child => closure(child, visited));
        return visited;
      }
      for (const entry of graph.entries) for (const file of closure(entry)) {
        if (graph.chunks[file].profiles.length) throw new Error(`Exclusive presentation leaked into common entry: ${file}`);
      }
      for (const profile of ['compact', 'wide']) {
        if (!graph.profiles[profile]) throw new Error(`Missing independent profile: ${profile}`);
        for (const file of closure(graph.profiles[profile])) {
          if (graph.chunks[file].profiles.some(p => p !== profile)) throw new Error(`Cross-profile dependency in ${profile}: ${file}`);
        }
      }
      this.emitFile({ type: 'asset', fileName: 'delivery-manifest.json', source: JSON.stringify(graph, null, 2) });
    },
  };
}

export default defineConfig({ root: resolve('frontend'), plugins: [deliveryGraph()],
  build: { outDir: resolve('app/dist'), emptyOutDir: true, manifest: true, cssCodeSplit: true, sourcemap: false },
});
