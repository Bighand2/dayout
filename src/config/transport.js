/**
 * Hypothèses utilisées pour ESTIMER les trajets entre deux étapes.
 *
 * Ce ne sont pas des calculs d'itinéraire : on part de la distance à vol d'oiseau
 * et on applique des moyennes. Modifier ces valeurs change les estimations
 * sans toucher au générateur.
 */
export const TRANSPORT = {
  // Les rues ne vont pas en ligne droite : distance réelle ≈ vol d'oiseau × 1,3.
  detourFactor: 1.3,

  // Jusqu'à cette distance (déjà corrigée du détour), on considère qu'on marche.
  walkMaxKm: 1.5,
  walkSpeedKmh: 4.5,

  // Au-delà : métro. Vitesse moyenne arrêts compris, plus un temps fixe
  // pour rejoindre la station, attendre la rame et ressortir.
  metroSpeedKmh: 20,
  metroAccessMinutes: 10,

  // Ticket Métro-Train-RER plein tarif, en vigueur depuis le 1er janvier 2026.
  // Source : https://www.iledefrance-mobilites.fr/tarifs-titre-de-transport-en-commun-2026
  // À mettre à jour à chaque changement de tarif (en général en janvier).
  metroTicketEur: 2.55,
};
