/**
 * Icônes de l'interface (bibliothèque Lucide, licence ISC).
 *
 * On importe uniquement les icônes utilisées : Vite n'embarque que celles-ci
 * dans le site final (« tree shaking »), pas les 1 600 icônes de la bibliothèque.
 * Lucide construit le SVG avec createElementNS/setAttribute, sans innerHTML.
 */
import {
  createElement,
  Check,
  Clapperboard,
  Clock,
  Dumbbell,
  ExternalLink,
  Footprints,
  Gamepad2,
  Heart,
  Info,
  Landmark,
  Map as MapIcon, // renommée pour ne pas masquer l'objet Map natif de JavaScript
  MapPin,
  Mic,
  Route,
  Shirt,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  TramFront,
  Trees,
  User,
  Users,
  Utensils,
  Wallet,
} from 'lucide';

const ICONS = {
  // Catégories (mêmes codes que dans config/categories.js)
  food: Utensils,
  thrift: Shirt,
  gaming: Gamepad2,
  culture: Landmark,
  sport: Dumbbell,
  cinema: Clapperboard,
  shows: Mic,
  nature: Trees,
  // Publics
  solo: User,
  couple: Heart,
  friends: Users,
  // Trajets
  walk: Footprints,
  metro: TramFront,
  // Informations et actions
  cost: Wallet,
  duration: Clock,
  place: MapPin,
  route: Route,
  info: Info,
  map: MapIcon,
  external: ExternalLink,
  shuffle: Shuffle,
  edit: SlidersHorizontal,
  sparkles: Sparkles,
  check: Check,
};

/**
 * Crée une icône SVG décorative (masquée aux lecteurs d'écran : le texte voisin porte le sens).
 * @param {keyof typeof ICONS} name
 * @param {{ size?: number, className?: string }} [options]
 * @returns {SVGElement}
 */
export function icon(name, { size = 20, className = '' } = {}) {
  const iconNode = ICONS[name];
  if (!iconNode) throw new Error(`Icône inconnue : ${name}`);
  return createElement(iconNode, {
    width: size,
    height: size,
    'aria-hidden': 'true',
    focusable: 'false',
    class: `icon ${className}`.trim(),
  });
}

/** Ajoute l'icône indiquée par l'attribut data-icon au début de chaque élément concerné (HTML statique). */
export function addStaticIcons(root = document) {
  for (const element of root.querySelectorAll('[data-icon]')) {
    element.prepend(icon(element.dataset.icon, { size: Number(element.dataset.iconSize) || 20 }));
  }
}
