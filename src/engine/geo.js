/**
 * Calculs géographiques : distance entre deux points et estimation d'un trajet.
 * Un « point » est tout objet possédant `latitude` et `longitude`
 * (la `location` d'une activité ou le centre d'un arrondissement).
 */
import { TRANSPORT } from '../config/transport.js';

const EARTH_RADIUS_KM = 6371;

/**
 * Distance à vol d'oiseau en kilomètres (formule de haversine, qui tient
 * compte de la courbure de la Terre).
 */
export function distanceKm(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Estime le trajet entre deux points.
 * @param {{ hasNavigo?: boolean }} [options] avec un pass Navigo, le métro ne coûte rien de plus
 * @returns {{ mode: 'walk' | 'metro', distanceKm: number, minutes: number, costEur: number }}
 */
export function estimateTravel(from, to, { hasNavigo = false } = {}) {
  const routeKm = distanceKm(from, to) * TRANSPORT.detourFactor;
  const roundedKm = Math.round(routeKm * 10) / 10;

  if (routeKm <= TRANSPORT.walkMaxKm) {
    return {
      mode: 'walk',
      distanceKm: roundedKm,
      minutes: Math.ceil((routeKm / TRANSPORT.walkSpeedKmh) * 60),
      costEur: 0,
    };
  }

  return {
    mode: 'metro',
    distanceKm: roundedKm,
    minutes: Math.ceil(TRANSPORT.metroAccessMinutes + (routeKm / TRANSPORT.metroSpeedKmh) * 60),
    costEur: hasNavigo ? 0 : TRANSPORT.metroTicketEur,
  };
}
