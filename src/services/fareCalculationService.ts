import AsyncStorage from '@react-native-async-storage/async-storage';
import { FareFormulaConfig, VehicleCategory, RouteHighwayType } from '../types';

const STORAGE_KEY_FARE_FORMULA = '@fare_formula_config';

// Published CSV URL for live Google Sheet fare rates and fuel/toll formula
const SHEETS_FORMULA_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1LDDyVseBuoz9QVkRsQ8b3hEDfCDSHWlp/export?format=csv';

/**
 * Default Formula Constants matching official Sheet specifications:
 * - Fuel Price: 344 Rs/Liter
 * - Passenger Capacity: 4
 * - Toll GT Road: 200 Rs
 * - Toll CPEC / Motorway: 360 Rs
 * - Below 1000 CC (without AC): 15 KM/Liter
 * - 1000 CC and above (with AC): 13 KM/Liter
 */
export const DEFAULT_FARE_FORMULA: FareFormulaConfig = {
  fuelPricePerLiter: 344,
  passengerCapacity: 4,
  tollCharges: {
    gt_road: 200,
    cpec: 360,
  },
  mileage: {
    below_1000cc_non_ac: 15,   // Cars Below 1000 CC without AC (GT/CPEC)
    below_1000cc_ac: 13.5,     // Cars Below 1000 CC with AC
    above_1000cc_non_ac: 14.5, // Cars 1000 CC & above without AC
    above_1000cc_ac: 13,       // Cars 1000 CC & above with AC (GT/CPEC)
  },
  lastUpdated: Date.now(),
};

/**
 * Syncs latest Fuel Price and Toll rates directly from Google Sheets (CSV)
 */
export const syncFareFormulaFromGoogleSheets = async (): Promise<FareFormulaConfig> => {
  try {
    const response = await fetch(SHEETS_FORMULA_CSV_URL);
    if (!response.ok) return await getFareFormulaConfig();

    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 2) return await getFareFormulaConfig();

    // Parse header columns
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const mileageIdx = headers.findIndex((h) => h.includes('mileage'));
    const passengersIdx = headers.findIndex((h) => h.includes('passengers'));
    const fuelPriceIdx = headers.findIndex((h) => h.includes('fuel price'));
    const tollIdx = headers.findIndex((h) => h.includes('toll'));
    const routeIdx = headers.findIndex((h) => h.includes('route') || h.includes('highway'));
    const situationIdx = headers.findIndex((h) => h.includes('situation') || h.includes('category'));

    let parsedFuel: number | null = null;
    let parsedCapacity: number | null = null;
    let parsedTollGT: number | null = null;
    let parsedTollCPEC: number | null = null;
    let parsedBelowNonAC: number | null = null;
    let parsedAboveAC: number | null = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
      const lower = line.toLowerCase();

      // Extract Fuel Price
      if (fuelPriceIdx !== -1 && cols[fuelPriceIdx]) {
        const val = parseFloat(cols[fuelPriceIdx]);
        if (!isNaN(val) && val > 0) parsedFuel = val;
      }

      // Extract Passenger Capacity
      if (passengersIdx !== -1 && cols[passengersIdx]) {
        const val = parseInt(cols[passengersIdx], 10);
        if (!isNaN(val) && val > 0) parsedCapacity = val;
      }

      // Extract Toll Charges per Highway
      const routeVal = (routeIdx !== -1 ? cols[routeIdx] : lower).toLowerCase();
      const tollVal = tollIdx !== -1 ? parseFloat(cols[tollIdx]) : NaN;

      if (!isNaN(tollVal) && tollVal > 0) {
        if (routeVal.includes('gt road') || routeVal.includes('gt_road')) {
          parsedTollGT = tollVal;
        } else if (routeVal.includes('cpec') || routeVal.includes('motorway')) {
          parsedTollCPEC = tollVal;
        }
      }

      // Extract Mileage according to vehicle situation
      const situationVal = (situationIdx !== -1 ? cols[situationIdx] : lower).toLowerCase();
      const mileageVal = mileageIdx !== -1 ? parseFloat(cols[mileageIdx]) : NaN;

      if (!isNaN(mileageVal) && mileageVal > 0) {
        if (situationVal.includes('below 1000') || situationVal.includes('without ac')) {
          parsedBelowNonAC = mileageVal;
        } else if (situationVal.includes('1000') || situationVal.includes('above') || situationVal.includes('with ac')) {
          parsedAboveAC = mileageVal;
        }
      }
    }

    const current = await getFareFormulaConfig();
    const updated: FareFormulaConfig = {
      ...current,
      fuelPricePerLiter: parsedFuel ?? current.fuelPricePerLiter,
      passengerCapacity: parsedCapacity ?? current.passengerCapacity ?? 4,
      tollCharges: {
        gt_road: parsedTollGT ?? current.tollCharges.gt_road,
        cpec: parsedTollCPEC ?? current.tollCharges.cpec,
      },
      mileage: {
        ...current.mileage,
        below_1000cc_non_ac: parsedBelowNonAC ?? current.mileage.below_1000cc_non_ac,
        above_1000cc_ac: parsedAboveAC ?? current.mileage.above_1000cc_ac,
      },
      lastUpdated: Date.now(),
    };

    await AsyncStorage.setItem(STORAGE_KEY_FARE_FORMULA, JSON.stringify(updated));
    console.log('[FareEngine] Synced fare formula from Google Sheet successfully:', updated);
    return updated;
  } catch (e) {
    console.warn('Failed to sync fare formula from Google Sheets, using cached rates', e);
    return await getFareFormulaConfig();
  }
};

/**
 * Get current Admin Fare Formula Configuration
 */
export const getFareFormulaConfig = async (): Promise<FareFormulaConfig> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_FARE_FORMULA);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load fare formula from storage', e);
  }
  return DEFAULT_FARE_FORMULA;
};

/**
 * Save Admin updated Fuel Price / Toll Charges / Mileage
 */
export const saveFareFormulaConfig = async (
  config: Partial<FareFormulaConfig>
): Promise<FareFormulaConfig> => {
  const current = await getFareFormulaConfig();
  const updated: FareFormulaConfig = {
    ...current,
    ...config,
    tollCharges: {
      ...current.tollCharges,
      ...(config.tollCharges || {}),
    },
    mileage: {
      ...current.mileage,
      ...(config.mileage || {}),
    },
    lastUpdated: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEY_FARE_FORMULA, JSON.stringify(updated));
  return updated;
};

export interface PassengerFareBreakdown {
  distanceKm: number;
  vehicleCategory: VehicleCategory;
  isAC: boolean;
  highwayType: RouteHighwayType;
  fuelPricePerLiter: number;
  averageMileageKmPerL: number;
  averageFuelConsumptionLiters: number;
  totalFuelCost: number;
  tollCharges: number;
  totalTravelingCost: number;
  perHeadTravelingCost: number;
  perHeadFixedFare: number;
}

/**
 * Calculates accurate Per-Head fare for a passenger based on exact pickup-to-dropoff distance:
 * 
 * Formula:
 * 1. Average Fuel Consumption (L) = Distance (KM) / Average Mileage (KM/L)
 * 2. Total Fuel Cost (Rs) = Average Fuel Consumption * Fuel Price Per Liter (Rs)
 * 3. Total Travelling Cost (Rs) = Total Fuel Cost + Toll Charges (Rs)
 * 4. Per Head Travelling Cost (Rs) = Total Travelling Cost / No of Passengers (4)
 * 5. Per Head Fix Fare (Rs) = Math.round(Per Head Travelling Cost)
 */
export const calculatePassengerFare = (
  distanceKm: number,
  vehicleCategory: VehicleCategory = 'below_1000cc',
  isAC: boolean = false,
  highwayType: RouteHighwayType = 'gt_road',
  formulaConfig: FareFormulaConfig = DEFAULT_FARE_FORMULA
): PassengerFareBreakdown => {
  const safeDistance = Math.max(1, distanceKm);
  
  // Determine accurate mileage based on CC category and AC status
  let mileage: number;
  if (vehicleCategory === 'below_1000cc') {
    mileage = isAC ? formulaConfig.mileage.below_1000cc_ac : formulaConfig.mileage.below_1000cc_non_ac;
  } else {
    mileage = isAC ? formulaConfig.mileage.above_1000cc_ac : formulaConfig.mileage.above_1000cc_non_ac;
  }

  const toll =
    highwayType === 'cpec'
      ? formulaConfig.tollCharges.cpec
      : formulaConfig.tollCharges.gt_road;

  const fuelPrice = formulaConfig.fuelPricePerLiter;
  const passengers = Math.max(1, formulaConfig.passengerCapacity);

  // 1. Average Fuel Consumption (Liters)
  const averageFuelConsumptionLiters = +(safeDistance / mileage).toFixed(2);

  // 2. Total Fuel Cost (Rs)
  const totalFuelCost = Math.round(averageFuelConsumptionLiters * fuelPrice);

  // 3. Total Travelling Cost (Rs)
  const totalTravelingCost = totalFuelCost + toll;

  // 4. Per Head Travelling Cost (Rs)
  const perHeadTravelingCost = +(totalTravelingCost / passengers).toFixed(2);

  // 5. Per Head Fixed Fare (Rs)
  const perHeadFixedFare = Math.round(perHeadTravelingCost);

  return {
    distanceKm: safeDistance,
    vehicleCategory,
    isAC,
    highwayType,
    fuelPricePerLiter: fuelPrice,
    averageMileageKmPerL: mileage,
    averageFuelConsumptionLiters,
    totalFuelCost,
    tollCharges: toll,
    totalTravelingCost,
    perHeadTravelingCost,
    perHeadFixedFare,
  };
};

/**
 * Calculates live dynamic passenger fare between any two locations by computing real road distance
 */
export const getDynamicFareForTrip = async (
  fromName: string,
  toName: string,
  isAC: boolean = false,
  vehicleCategory: VehicleCategory = 'below_1000cc',
  highwayType: RouteHighwayType = 'gt_road'
): Promise<PassengerFareBreakdown> => {
  const { calculateDynamicRouteDistance } = await import('./osmService');
  const distanceKm = await calculateDynamicRouteDistance(fromName, toName);
  const config = await getFareFormulaConfig();
  return calculatePassengerFare(distanceKm, vehicleCategory, isAC, highwayType, config);
};

