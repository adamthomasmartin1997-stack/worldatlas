/** Great-circle helpers for games that compare where countries are. Points are [lat, lng] in degrees. */
const R = 6371; // Earth's mean radius, km
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceKm([lat1, lon1]: number[], [lat2, lon2]: number[]) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial compass bearing from a to b, 0–360 degrees (0 = north). */
export function bearing([lat1, lon1]: number[], [lat2, lon2]: number[]) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
export const compass = (deg: number) => POINTS[Math.round(deg / 45) % 8];

/** 100% = same place, 0% = the opposite side of the world (about 20,000 km). */
export const closeness = (km: number) => Math.max(0, Math.round(100 * (1 - km / 20015)));
