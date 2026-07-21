import { FareRates } from '../types';
import { fetchFareRates, listenFareRates } from './firebaseConfig';

const LOCAL_FALLBACK_RATES: FareRates = {
  rates: {
    ac: { base: 1.50, perKm: 0.15 },
    nonAc: { base: 1.00, perKm: 0.10 },
  },
};

let currentRates: FareRates = { ...LOCAL_FALLBACK_RATES };

export const getCurrentRates = (): FareRates => {
  return currentRates;
};

export const calculateFare = (distanceKm: number, isAC: boolean): number => {
  const rates = currentRates.rates;
  const tier = isAC ? rates.ac : rates.nonAc;
  const rawFare = tier.base + (distanceKm * tier.perKm);
  return parseFloat(rawFare.toFixed(2));
};

export const getRateBreakdown = (isAC: boolean): { base: number; perKm: number; tierName: string } => {
  const rates = currentRates.rates;
  const tier = isAC ? rates.ac : rates.nonAc;
  return {
    base: tier.base,
    perKm: tier.perKm,
    tierName: isAC ? 'AC' : 'Non-AC',
  };
};

export const formatFare = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export const initializeFareRates = async (): Promise<void> => {
  try {
    const adminConfig = await fetchFareRates();
    if (adminConfig && adminConfig.rates) {
      currentRates = {
        rates: {
          ac: {
            base: adminConfig.rates.ac.base,
            perKm: adminConfig.rates.ac.perKm,
          },
          nonAc: {
            base: adminConfig.rates.nonAc.base,
            perKm: adminConfig.rates.nonAc.perKm,
          },
        },
      };
      console.log('[FareEngine] Fare rates initialized from Firebase config.');
    } else {
      console.log('[FareEngine] No remote fare rates config. Using local fallback.');
    }
  } catch (error) {
    console.warn('[FareEngine] Firebase offline or unconfigured. Using local fallback:', error);
    currentRates = { ...LOCAL_FALLBACK_RATES };
  }
};

export const subscribeToFareUpdates = (onUpdate: (rates: FareRates) => void): (() => void) => {
  try {
    const unsubscribe = listenFareRates((adminConfig) => {
      if (adminConfig && adminConfig.rates) {
        currentRates = {
          rates: {
            ac: {
              base: adminConfig.rates.ac.base,
              perKm: adminConfig.rates.ac.perKm,
            },
            nonAc: {
              base: adminConfig.rates.nonAc.base,
              perKm: adminConfig.rates.nonAc.perKm,
            },
          },
        };
        onUpdate(currentRates);
      }
    });
    return unsubscribe;
  } catch (error) {
    console.warn('[FareEngine] Failed to subscribe to Firebase updates. Returning dummy unsubscribe.', error);
    return () => {};
  }
};
