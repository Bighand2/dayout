/**
 * Outils de hasard.
 *
 * Le générateur reçoit une fonction `random()` (par défaut Math.random) au lieu
 * de l'appeler directement. Dans les tests, on lui passe un générateur « à graine » :
 * avec la même graine, il produit toujours la même suite de nombres, donc le même
 * résultat. Un test qui dépend du hasard deviendrait sinon imprévisible.
 */

/**
 * Générateur pseudo-aléatoire reproductible (algorithme mulberry32).
 * ⚠️ Prévisible par construction : ne jamais l'utiliser pour de la sécurité
 * (jetons, mots de passe…). Pour cela, on utilise crypto.getRandomValues().
 * @param {number} seed entier quelconque
 * @returns {() => number} fonction renvoyant un nombre dans [0, 1[
 */
export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Renvoie une copie mélangée du tableau (mélange de Fisher-Yates). */
export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Tirage pondéré : chaque élément a une chance proportionnelle à son poids.
 * Exemple : poids [3, 1] → le premier sort 3 fois sur 4 en moyenne.
 * @param {T[]} items tableau non vide
 * @param {(item: T) => number} getWeight poids strictement positif
 * @template T
 */
export function pickWeighted(items, getWeight, random = Math.random) {
  const weights = items.map(getWeight);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  let threshold = random() * totalWeight;
  for (let index = 0; index < items.length; index++) {
    threshold -= weights[index];
    if (threshold < 0) return items[index];
  }
  return items[items.length - 1]; // filet de sécurité pour les arrondis
}
