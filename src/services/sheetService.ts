import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteConfig } from '../types';

// Published CSV URL for live fare rates
const SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTX3Op8Amm6UlS5Rd4Ab9g6tizZMpWWwF61yW7gByPJmQujdB8ZK6yHLVbD2_TqU1dUjH7pCQ2R4iFo/pub?output=csv';

const STORAGE_KEY_ROUTES = '@cached_routes';

/**
 * Parses CSV text with headers: Date, Origin, Destination, AC Fare, non-AC Fare (case-insensitive)
 */
export const parseCSV = (csvText: string): RouteConfig[] => {
  const routes: RouteConfig[] = [];
  const lines = csvText.split(/\r?\n/);

  if (lines.length < 2) return [];

  // Clean headers
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const dateIdx = headers.findIndex((h) => h.includes('date'));
  const originIdx = headers.findIndex((h) => h.includes('origin'));
  const destIdx = headers.findIndex((h) => h.includes('destination'));
  const acFareIdx = headers.findIndex((h) => h.includes('ac fare') || h.includes('ac_fare'));
  const nonAcFareIdx = headers.findIndex((h) => h.includes('non-ac') || h.includes('non_ac'));

  if (originIdx === -1 || destIdx === -1) {
    throw new Error('CSV is missing required Origin or Destination headers.');
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (columns.length < Math.max(originIdx, destIdx) + 1) continue;

    const date = dateIdx !== -1 ? columns[dateIdx] : undefined;
    const origin = columns[originIdx];
    const destination = columns[destIdx];

    const acFare = acFareIdx !== -1 ? parseFloat(columns[acFareIdx]) || 0 : 0;
    const nonAcFare = nonAcFareIdx !== -1 ? parseFloat(columns[nonAcFareIdx]) || 0 : 0;

    if (origin && destination) {
      routes.push({
        date,
        origin,
        destination,
        distanceKm: 0,
        acFare: parseFloat(acFare.toFixed(2)),
        nonAcFare: parseFloat(nonAcFare.toFixed(2)),
      });
    }
  }

  return routes;
};

/**
 * Fetches the Google Sheet CSV live, parses, caches, and returns routes.
 * Gracefully falls back to cache or static defaults if network is offline.
 */
export const fetchRoutes = async (): Promise<RouteConfig[]> => {
  try {
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
    console.warn('[SheetService] Live fetch failed, attempting cache...', error);
    const cached = await getCachedRoutes();
    if (cached && cached.length > 0) {
      return cached;
    }
    return getFallbackRoutes();
  }
};

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
 * Dynamically extracts all unique Origin and Destination cities from the live dataset.
 */
export const getUniqueLocations = (routes: RouteConfig[]): string[] => {
  const set = new Set<string>();
  routes.forEach((r) => {
    if (r.origin) set.add(r.origin);
    if (r.destination) set.add(r.destination);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

/**
 * Matches route selection with optional Date filtering (e.g. "21/07/2026")
 */
export const matchRoute = (
  routes: RouteConfig[],
  origin: string,
  destination: string,
  date?: string
): RouteConfig | null => {
  const oClean = origin.trim().toLowerCase();
  const dClean = destination.trim().toLowerCase();

  // 1. First try exact Date + Origin + Destination match
  if (date) {
    const exactDateMatch = routes.find(
      (r) =>
        r.origin.toLowerCase() === oClean &&
        r.destination.toLowerCase() === dClean &&
        r.date === date
    );
    if (exactDateMatch) return exactDateMatch;
  }

  // 2. Fallback to any Date matching Origin + Destination
  const routeMatch = routes.find(
    (r) => r.origin.toLowerCase() === oClean && r.destination.toLowerCase() === dClean
  );

  return routeMatch || null;
};

/**
 * Fallback static routes matching your live Google Sheet data.
 */
const getFallbackRoutes = (): RouteConfig[] => {
  return [
    { date: '21/07/2026', origin: 'Islamabad', destination: 'Karak', distanceKm: 0, acFare: 1800, nonAcFare: 1500 },
    { date: '21/07/2026', origin: 'Islamabad', destination: 'Kohat', distanceKm: 0, acFare: 1400, nonAcFare: 1100 },
    { date: '21/07/2026', origin: 'Islamabad', destination: 'Peshawar', distanceKm: 0, acFare: 1300, nonAcFare: 1000 },
    { date: '21/07/2026', origin: 'Islamabad', destination: 'DI Khan', distanceKm: 0, acFare: 2200, nonAcFare: 1900 },
    { date: '21/07/2026', origin: 'Karak', destination: 'Islamabad', distanceKm: 0, acFare: 1800, nonAcFare: 1500 },
    { date: '21/07/2026', origin: 'Kohat', destination: 'Islamabad', distanceKm: 0, acFare: 1400, nonAcFare: 1100 },
    { date: '21/07/2026', origin: 'Peshawar', destination: 'Islamabad', distanceKm: 0, acFare: 1300, nonAcFare: 1000 },
    { date: '21/07/2026', origin: 'DI Khan', destination: 'Islamabad', distanceKm: 0, acFare: 2200, nonAcFare: 1900 },
  ];
};
