/**
 * Essai du générateur dans le terminal : `npm run demo`
 *
 * Modifie les préférences ci-dessous, relance la commande et observe les 3 sorties proposées.
 * Ce script sert uniquement au développement ; il ne fait pas partie du site.
 */
import { readFile } from 'node:fs/promises';
import { parseActivities } from '../src/data/activitySchema.js';
import { generateOuting } from '../src/engine/generator.js';
import { CATEGORIES } from '../src/config/categories.js';

const preferences = {
  budgetEur: 15, // par personne
  availableMinutes: 240, // 4 h
  categories: ['thrift', 'gaming', 'food'], // food, thrift, gaming, culture, sport, cinema, shows, nature
  audience: 'solo', // solo, couple, friends
  arrondissement: 11, // 1 à 20, ou null pour « peu importe »
  hasNavigo: false,
};

const catalogUrl = new URL('../public/data/activities.json', import.meta.url);
const { activities } = parseActivities(JSON.parse(await readFile(catalogUrl, 'utf8')));

const formatEuros = (value) => `${value.toFixed(2).replace('.', ',')} €`;
const formatPriceRange = ({ min_eur: min, max_eur: max }) =>
  max === 0 ? 'gratuit' : min === max ? formatEuros(max) : `${formatEuros(min)} à ${formatEuros(max)}`;
const formatDuration = (minutes) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
const categoryLabel = (code) => CATEGORIES.find((category) => category.code === code);
const formatArrondissement = (number) => (number === 1 ? '1er' : `${number}e`);

// Activités déjà proposées : chaque nouvelle sortie évite TOUTES celles des sorties précédentes,
// comme le fera le bouton « Générer une autre sortie ».
let previousActivityIds = [];
for (const attempt of [1, 2, 3]) {
  const result = generateOuting(activities, preferences, { previousActivityIds });
  console.log(`\n=== Sortie n° ${attempt} ===`);

  if (!result.ok) {
    console.log('Aucune sortie possible :', result.reason, result.details);
    break;
  }

  for (const step of result.steps) {
    const { activity, travelFromPrevious } = step;
    if (travelFromPrevious) {
      const mode = travelFromPrevious.mode === 'walk' ? 'à pied' : 'en métro';
      console.log(`      ↓ ${travelFromPrevious.minutes} min ${mode}${travelFromPrevious.costEur ? ` (${formatEuros(travelFromPrevious.costEur)})` : ''}`);
    }
    const { emoji, label } = categoryLabel(activity.category);
    console.log(`  Étape ${step.number} ${emoji} ${activity.name} [${label}]`);
    console.log(`      Paris ${formatArrondissement(activity.location.arrondissement)}${step.isOutsideArea ? ' (hors du secteur choisi)' : ''} · ${formatPriceRange(activity.cost)}`);
  }

  const { totals } = result;
  console.log(`  Budget estimé : ${formatEuros(totals.costMinEur)} à ${formatEuros(totals.costMaxEur)} (dont trajets : ${formatEuros(totals.transportCostEur)})`);
  console.log(`  Durée indicative : ${formatDuration(totals.durationMinMinutes)} à ${formatDuration(totals.durationMaxMinutes)}, trajets compris`);
  if (result.notices.length > 0) console.log('  Remarques :', result.notices.map((notice) => notice.code).join(', '));

  previousActivityIds = [...previousActivityIds, ...result.steps.map((step) => step.activity.id)];
}
