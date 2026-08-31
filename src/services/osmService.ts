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
