/**
 * Geocoding via OpenStreetMap Nominatim.
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 * - Max 1 request per second; provide a valid User-Agent.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'BiteDash/1.0 (Store location)';

async function fetchNominatim<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error('Geocoding request failed');
  return res.json() as Promise<T>;
}

export interface ForwardResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Forward geocode: address query → coordinates and display name.
 * Use for "Search address" to place the marker.
 */
export async function forwardGeocode(query: string): Promise<ForwardResult | null> {
  if (!query?.trim()) return null;
  const q = encodeURIComponent(query.trim());
  const url = `${NOMINATIM_BASE}/search?q=${q}&format=json&limit=1`;
  const data = await fetchNominatim<Array<{ lat: string; lon: string; display_name: string }>>(url);
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  const lat = parseFloat(first.lat);
  const lng = parseFloat(first.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng, displayName: first.display_name };
}

/**
 * Reverse geocode: coordinates → address string.
 * Use when user selects a point on the map or uses "Use my location".
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`;
  const data = await fetchNominatim<{ display_name?: string }>(url);
  return data?.display_name?.trim() ?? null;
}
