import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

/**
 * Lit les en-têtes d'une route du fichier public/_headers (format Netlify).
 * Ainsi, `npm run preview` applique EXACTEMENT les mêmes en-têtes de sécurité
 * que la production : une CSP trop stricte se repère en local, avant la mise en ligne.
 * (Le serveur de développement `npm run dev` n'en tient pas compte : il a besoin
 * de scripts et styles injectés pour le rechargement automatique.)
 */
function readNetlifyHeaders(fileUrl, route = '/*') {
  const headers = {};
  let inRoute = false;

  for (const line of readFileSync(fileUrl, 'utf8').split(/\r?\n/)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    // Ligne non indentée = début d'une route ; ligne indentée = « Nom: valeur ».
    if (!/^\s/.test(line)) {
      inRoute = line.trim() === route;
    } else if (inRoute) {
      const separator = line.indexOf(':');
      headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
  }
  return headers;
}

export default defineConfig({
  preview: {
    headers: readNetlifyHeaders(new URL('./public/_headers', import.meta.url)),
  },
});
