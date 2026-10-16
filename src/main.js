/**
 * Point d'entrée de l'application.
 *
 * Étape actuelle : on vérifie seulement que la chaîne « fichier JSON → validation
 * → affichage » fonctionne. Le formulaire et le générateur viendront ensuite.
 */
import { loadActivities } from './data/activityRepository.js';

const statusElement = document.querySelector('#catalog-status');

try {
  const activities = await loadActivities();
  // textContent (et non innerHTML) : le texte est affiché tel quel, jamais interprété comme du HTML.
  statusElement.textContent = `Catalogue chargé : ${activities.length} activités de démonstration.`;
} catch (error) {
  console.error(error);
  statusElement.textContent = 'Impossible de charger les activités. Réessaie dans un instant.';
}
