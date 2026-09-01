export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface SearchPlaceResult {
  placeId: string | number;
  displayName: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  coordinates: LatLng[];
  polyline?: string;
}

/**
 * Search places and addresses using OpenStreetMap's Nominatim API (100% Free)
 */
export const searchPlacesOSM = async (
  query: string,
  countryCodes: string = 'pk,in,ae,sa'
): Promise<SearchPlaceResult[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&addressdetails=1&limit=6&countrycodes=${countryCodes}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RaahiCarpoolApp/1.0 (contact@raahi.app)',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();

    return data.map((item: any) => ({
      placeId: item.place_id,
      displayName: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type,
    }));
  } catch (error) {
    console.error('Error searching OSM Nominatim:', error);
    return [];
  }
};

/**
 * Reverse Geocode coordinates to address
 */
export const reverseGeocodeOSM = async (lat: number, lon: number): Promise<string> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RaahiCarpoolApp/1.0 (contact@raahi.app)',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) return 'Selected Location';
    const data = await response.json();
    return data.display_name || 'Selected Location';
  } catch (error) {
    console.error('Error reverse geocoding OSM:', error);
    return 'Selected Location';
  }
};

/**
 * Fetch driving directions and road route between two points using OSRM (100% Free)
 */
export const getRouteOSRM = async (
  start: LatLng,
  destination: LatLng
): Promise<RouteResult | null> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) return null;

    const primaryRoute = data.routes[0];
    const coordinates: LatLng[] = primaryRoute.geometry.coordinates.map(
      ([lon, lat]: [number, number]) => ({
        latitude: lat,
        longitude: lon,
      })
    );

    return {
      distanceKm: +(primaryRoute.distance / 1000).toFixed(1),
      durationMinutes: Math.round(primaryRoute.duration / 60),
      coordinates,
    };
  } catch (error) {
    console.error('Error fetching OSRM route:', error);
    return null;
  }
};

/**
 * Coordinates dictionary for prominent Pakistani cities to allow instant dynamic routing
 */
export const PK_CITY_COORDINATES: Record<string, LatLng> = {
  islamabad: { latitude: 33.6844, longitude: 73.0479 },
  rawalpindi: { latitude: 33.5984, longitude: 73.0441 },
  lahore: { latitude: 31.5204, longitude: 74.3587 },
  karachi: { latitude: 24.8607, longitude: 67.0011 },
  peshawar: { latitude: 34.0151, longitude: 71.5249 },
  multan: { latitude: 30.1575, longitude: 71.5249 },
  faisalabad: { latitude: 31.4504, longitude: 73.1350 },
  kohat: { latitude: 33.5869, longitude: 71.4414 },
  karak: { latitude: 33.1111, longitude: 71.0917 },
  'muhabbat khel': { latitude: 33.1325, longitude: 71.1215 },
  attock: { latitude: 33.7667, longitude: 72.3667 },
  taxila: { latitude: 33.7438, longitude: 72.8336 },
  wah: { latitude: 33.7744, longitude: 72.7531 },
  hasanabdal: { latitude: 33.8206, longitude: 72.6908 },
  chakwal: { latitude: 32.9328, longitude: 72.8553 },
  jhelum: { latitude: 32.9405, longitude: 73.7276 },
  gujrat: { latitude: 32.5742, longitude: 74.0754 },
  mardan: { latitude: 34.1989, longitude: 72.0404 },
  swat: { latitude: 35.2227, longitude: 72.4258 },
  mingora: { latitude: 34.7758, longitude: 72.3625 },
  nowshera: { latitude: 34.0153, longitude: 71.9747 },
  charsadda: { latitude: 34.1482, longitude: 71.7406 },
  swabi: { latitude: 34.1202, longitude: 72.4698 },
  'di khan': { latitude: 31.8314, longitude: 70.9019 },
  sialkot: { latitude: 32.4945, longitude: 74.5229 },
  gujranwala: { latitude: 32.1877, longitude: 74.1945 },
  abbottabad: { latitude: 34.1688, longitude: 73.2215 },
  murree: { latitude: 33.9070, longitude: 73.3943 },
  quetta: { latitude: 30.1798, longitude: 66.9750 },
  hyderabad: { latitude: 25.3960, longitude: 68.3578 },
  sukkur: { latitude: 27.7052, longitude: 68.8574 },
  bahawalpur: { latitude: 29.3544, longitude: 71.6911 },
  sargodha: { latitude: 32.0836, longitude: 72.6711 },
  sahiwal: { latitude: 30.6682, longitude: 73.1114 },
  okara: { latitude: 30.8080, longitude: 73.4458 },
  dera: { latitude: 31.8314, longitude: 70.9019 },
};

/**
 * Haversine formula distance (as crow flies in KM)
 */
export const calculateHaversineKm = (start: LatLng, end: LatLng): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((end.latitude - start.latitude) * Math.PI) / 180;
  const dLon = ((end.longitude - start.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((start.latitude * Math.PI) / 180) *
      Math.cos((end.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Multiply by driving factor ~1.25 for highway curvature
  return Math.round(R * c * 1.25);
};

/**
 * Resolves coordinates from city name, address, or search result
 */
export const getCityCoordinates = async (placeQuery: string): Promise<LatLng | null> => {
  if (!placeQuery || placeQuery.trim().length === 0) return null;
  const clean = placeQuery.trim().toLowerCase();
  
  // 1. Fast static match against full or sub-string
  for (const [key, coords] of Object.entries(PK_CITY_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return coords;
    }
  }

  // 2. Check each comma-separated component or individual words (e.g. "Attock Road, Rawalpindi Division" -> matches 'attock' and 'rawalpindi')
  const parts = placeQuery.split(/[,;\-\/\s]+/).map((p) => p.trim().toLowerCase()).filter((p) => p.length > 2);
  for (const part of parts) {
    for (const [key, coords] of Object.entries(PK_CITY_COORDINATES)) {
      if (part === key || part.includes(key) || key.includes(part)) {
        return coords;
      }
    }
  }

  // 3. Query OSM Nominatim for exact address/landmark in Pakistan
  try {
    const results = await searchPlacesOSM(placeQuery);
    if (results && results.length > 0) {
      return {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      };
    }

    // Try first part if full string didn't return
    if (parts.length > 1) {
      const partResults = await searchPlacesOSM(parts[0]);
      if (partResults && partResults.length > 0) {
        return {
          latitude: partResults[0].latitude,
          longitude: partResults[0].longitude,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to resolve coordinates for query:', placeQuery, e);
  }

  return null;
};

/**
 * Computes dynamic road distance between pickup and drop points
 */
export const calculateDynamicRouteDistance = async (
  fromName: string,
  toName: string,
  fromCoord?: LatLng,
  toCoord?: LatLng
): Promise<number> => {
  if (!fromName && !fromCoord && !toName && !toCoord) return 0;
  
  const origin = fromCoord || (await getCityCoordinates(fromName));
  const dest = toCoord || (await getCityCoordinates(toName));

  if (origin && dest) {
    try {
      const osrmResult = await getRouteOSRM(origin, dest);
      if (osrmResult && osrmResult.distanceKm > 0) {
        return osrmResult.distanceKm;
      }
    } catch {}

    // Fallback to Haversine driving estimation
    const haversine = calculateHaversineKm(origin, dest);
    if (haversine > 0) return haversine;
  }

  // Sensible default intercity distance (180 KM) if locations cannot be geocoded
  return 180;
};


