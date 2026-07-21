import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteConfig } from '../types';

// The admin will replace this placeholder with their published Google Sheet CSV URL
// Example: https://docs.google.com/spreadsheets/d/e/2PACX-1v.../pub?output=csv
const SHEETS_CSV_URL = 'YOUR_GOOGLE_SHEETS_CSV_URL';
const STORAGE_KEY_ROUTES = '@cached_routes';

/**
 * Parses a standard CSV string into an array of RouteConfig objects.
 * Handles headers: Origin, Destination, Distance, AC_Fare, Non_AC_Fare (case-insensitive)
 */
export const parseCSV = (csvText: string): RouteConfig[] => {
  const routes: RouteConfig[] = [];
  const lines = csvText.split(/\r?\n/);
  
  if (lines.length < 2) return [];

  // Parse headers to find indexes
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const originIdx = headers.indexOf('origin');
  const destIdx = headers.indexOf('destination');
  const distIdx = headers.indexOf('distance');
  const acFareIdx = headers.indexOf('ac_fare');
  const nonAcFareIdx = headers.indexOf('non_ac_fare');

  if (originIdx === -1 || destIdx === -1) {
    throw new Error('CSV is missing required Origin or Destination headers.');
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parser for comma split (ignoring commas inside quotes if needed, 
    // but assuming simple location names for this community app)
    const columns = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());

    if (columns.length < Math.max(originIdx, destIdx) + 1) continue;

    const origin = columns[originIdx];
    const destination = columns[destIdx];
    
    // Fallbacks if distance or fares aren't defined
    const distanceKm = distIdx !== -1 ? parseFloat(columns[distIdx]) || 0 : 0;
    const acFare = acFareIdx !== -1 ? parseFloat(columns[acFareIdx]) || 0 : 0;
    const nonAcFare = nonAcFareIdx !== -1 ? parseFloat(columns[nonAcFareIdx]) || 0 : 0;

    if (origin && destination) {
      routes.push({
        origin,
        destination,
        distanceKm: parseFloat(distanceKm.toFixed(1)),
        acFare: parseFloat(acFare.toFixed(2)),
        nonAcFare: parseFloat(nonAcFare.toFixed(2)),
      });
    }
  }

  return routes;
};

/**
 * Fetches the Google Sheet CSV, parses, caches, and returns routes.
 * Gracefully falls back to cache if network fails.
 */
export const fetchRoutes = async (): Promise<RouteConfig[]> => {
  try {
    if (SHEETS_CSV_URL === 'YOUR_GOOGLE_SHEETS_CSV_URL') {
      console.warn('[SheetService] Using demo placeholder URL. Returning mock route lists.');
      const demoRoutes = getDemoRoutes();
      await AsyncStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify(demoRoutes));
      return demoRoutes;
    }

    const response = await fetch(SHEETS_CSV_URL);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const csvText = await response.text();
    const routes = parseCSV(csvText);

    if (routes.length > 0) {
      await AsyncStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify(routes));
      return routes;
    }
    
    throw new Error('Parsed sheet contained no valid routes.');
  } catch (error) {
    console.warn('[SheetService] Fetch failed, loading from cache:', error);
    const cached = await getCachedRoutes();
    if (cached && cached.length > 0) {
      return cached;
    }
    // Final fallback
    return getDemoRoutes();
  }
};

/**
 * Gets cached routes from AsyncStorage
 */
export const getCachedRoutes = async (): Promise<RouteConfig[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_ROUTES);
    if (raw) {
      return JSON.parse(raw) as RouteConfig[];
    }
  } catch (e) {
    console.error('[SheetService] Error reading cached routes:', e);
  }
  return null;
};

/**
 * Extracts unique origin and destination names sorted alphabetically.
 */
export const getUniqueLocations = (routes: RouteConfig[]): string[] => {
  const set = new Set<string>();
  routes.forEach(r => {
    if (r.origin) set.add(r.origin);
    if (r.destination) set.add(r.destination);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

/**
 * Matches selection to preconfigured routes (case-insensitive)
 */
export const matchRoute = (
  routes: RouteConfig[],
  origin: string,
  destination: string
): RouteConfig | null => {
  const oClean = origin.trim().toLowerCase();
  const dClean = destination.trim().toLowerCase();

  const found = routes.find(
    r => r.origin.toLowerCase() === oClean && r.destination.toLowerCase() === dClean
  );
  return found || null;
};

/**
 * Returns hardcoded demo routes as a default fallback.
 */
const getDemoRoutes = (): RouteConfig[] => {
  return [
    { origin: 'Saddar', destination: 'Clifton', distanceKm: 5.2, acFare: 250, nonAcFare: 180 },
    { origin: 'Saddar', destination: 'Gulshan', distanceKm: 12.0, acFare: 500, nonAcFare: 400 },
    { origin: 'Gulshan', destination: 'Clifton', distanceKm: 15.4, acFare: 650, nonAcFare: 500 },
    { origin: 'DHA', destination: 'Saddar', distanceKm: 8.5, acFare: 350, nonAcFare: 250 },
    { origin: 'DHA', destination: 'Gulshan', distanceKm: 18.2, acFare: 750, nonAcFare: 600 },
  ];
};
