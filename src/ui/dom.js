/**
 * Création d'éléments HTML, SANS innerHTML.
 *
 * Sécurité (XSS) : avec innerHTML, un nom d'activité comme
 * « <img src=x onerror=alert(1)> » serait interprété comme du HTML et exécuterait
 * du code. Ici, les textes passent par textContent / append(texte) : ils sont
 * toujours affichés tels quels, jamais interprétés.
 *
 * Attention : un ATTRIBUT href reste dangereux s'il contient « javascript:… ».
 * Les URL affichées sont donc validées en amont (https uniquement, voir activitySchema.js).
 *
 * @param {string} tag nom de la balise
 * @param {{ className?: string, text?: string, attrs?: Record<string, string | number | boolean | null | undefined>, dataset?: Record<string, string> }} [options]
 * @param {(Node | string | null | false)[] | Node | string} [children] éléments ou textes à ajouter
 * @returns {HTMLElement}
 */
export function el(tag, { className, text, attrs = {}, dataset = {} } = {}, children = []) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    element.setAttribute(name, value === true ? '' : String(value));
  }
  Object.assign(element.dataset, dataset);

  // append() transforme les chaînes en nœuds texte : pas d'interprétation HTML.
  for (const child of [children].flat()) {
    if (child !== null && child !== false && child !== undefined) element.append(child);
  }
  return element;
}
