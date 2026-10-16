/**
 * Données géographiques de Paris utilisées par DAYOUT.
 *
 * Les centres des arrondissements sont des points APPROXIMATIFS, suffisants pour
 * estimer des distances « à vol d'oiseau ». Pour le 12e et le 16e, le point est
 * placé dans la partie urbaine (hors bois de Vincennes et de Boulogne).
 */
export const ARRONDISSEMENT_CENTERS = {
  1: { latitude: 48.8625, longitude: 2.3364 },
  2: { latitude: 48.8683, longitude: 2.3428 },
  3: { latitude: 48.863, longitude: 2.36 },
  4: { latitude: 48.8543, longitude: 2.3576 },
  5: { latitude: 48.8445, longitude: 2.3497 },
  6: { latitude: 48.8491, longitude: 2.3329 },
  7: { latitude: 48.8562, longitude: 2.3122 },
  8: { latitude: 48.8727, longitude: 2.3125 },
  9: { latitude: 48.877, longitude: 2.3375 },
  10: { latitude: 48.8761, longitude: 2.3608 },
  11: { latitude: 48.859, longitude: 2.38 },
  12: { latitude: 48.84, longitude: 2.388 },
  13: { latitude: 48.8283, longitude: 2.3623 },
  14: { latitude: 48.8292, longitude: 2.3266 },
  15: { latitude: 48.8401, longitude: 2.2934 },
  16: { latitude: 48.86, longitude: 2.275 },
  17: { latitude: 48.8873, longitude: 2.3067 },
  18: { latitude: 48.8925, longitude: 2.3484 },
  19: { latitude: 48.8871, longitude: 2.3848 },
  20: { latitude: 48.8634, longitude: 2.4011 },
};

/**
 * Rectangle englobant Paris intra-muros (avec une petite marge).
 * Sert à rejeter des coordonnées manifestement fausses dans les données.
 */
export const PARIS_BOUNDS = {
  minLatitude: 48.81,
  maxLatitude: 48.91,
  minLongitude: 2.22,
  maxLongitude: 2.47,
};
