import AsyncStorage from '@react-native-async-storage/async-storage';
import { FareFormulaConfig, VehicleCategory, RouteHighwayType } from '../types';

const STORAGE_KEY_FARE_FORMULA = '@fare_formula_config';

// Published CSV URL for live Google Sheet fare rates and fuel/toll formula
const SHEETS_FORMULA_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTX3Op8Amm6UlS5Rd4Ab9g6tizZMpWWwF61yW7gByPJmQujdB8ZK6yHLVbD2_TqU1dUjH7pCQ2R4iFo/pub?output=csv';

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
    const lines = csvText.split(/\r?\n/);

    let parsedFuel: number | null = null;
    let parsedTollGT: number | null = null;
    let parsedTollCPEC: number | null = null;
    let parsedBelowNonAC: number | null = null;
    let parsedAboveAC: number | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase();
      const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());

      // Fuel Price
      if (lower.includes('fuel price') || lower.includes('petrol')) {
        const num = parseFloat(cols.find((c) => !isNaN(parseFloat(c)) && parseFloat(c) > 50) || '');
        if (!isNaN(num)) parsedFuel = num;
      }
      // GT Road Toll
      if (lower.includes('gt road') || lower.includes('gt_road')) {
        const num = parseFloat(cols.find((c) => !isNaN(parseFloat(c)) && parseFloat(c) >= 100) || '');
        if (!isNaN(num)) parsedTollGT = num;
      }
      // CPEC Toll
      if (lower.includes('cpec') || lower.includes('motorway')) {
        const num = parseFloat(cols.find((c) => !isNaN(parseFloat(c)) && parseFloat(c) >= 100) || '');
        if (!isNaN(num)) parsedTollCPEC = num;
      }
      // Below 1000cc without AC (15 km/l)
      if (lower.includes('below 1000') && (lower.includes('without') || lower.includes('non-ac'))) {
        const num = parseFloat(cols.find((c) => !isNaN(parseFloat(c)) && parseFloat(c) >= 5 && parseFloat(c) <= 30) || '');
        if (!isNaN(num)) parsedBelowNonAC = num;
      }
      // 1000cc and above with AC (13 km/l)
      if (lower.includes('1000') && (lower.includes('with ac') || lower.includes('above'))) {
        const num = parseFloat(cols.find((c) => !isNaN(parseFloat(c)) && parseFloat(c) >= 5 && parseFloat(c) <= 30) || '');
        if (!isNaN(num)) parsedAboveAC = num;
      }
    }

    const current = await getFareFormulaConfig();
    const updated: FareFormulaConfig = {
      ...current,
      fuelPricePerLiter: parsedFuel ?? current.fuelPricePerLiter,
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
