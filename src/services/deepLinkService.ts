import { Linking, Share } from 'react-native';
import { TripData } from '../types';

export const encodeTripToDeepLink = (trip: TripData): string => {
  try {
    const params = new URLSearchParams();
    params.set('o', trip.originAddress);
    params.set('d', trip.destinationAddress);
    params.set('ol', trip.originLat.toString());
    params.set('og', trip.originLng.toString());
    params.set('dl', trip.destinationLat.toString());
    params.set('dg', trip.destinationLng.toString());
    params.set('dist', trip.distanceKm.toString());
    params.set('fare', trip.fare.toString());
    params.set('ac', trip.isAC ? '1' : '0');
    params.set('ph', trip.driverPhone);
    params.set('vn', trip.driverVehicleName);
    params.set('vm', trip.driverVehicleModel);
    params.set('ts', trip.timestamp.toString());
    params.set('opi', trip.originPlaceId);
    params.set('dpi', trip.destinationPlaceId);

    return `raahi://ride?${params.toString()}`;
  } catch (error) {
    console.error('[DeepLinkService] Error encoding deep link:', error);
    throw new Error('Failed to generate ride link.');
  }
};

export const decodeDeepLink = (url: string): TripData | null => {
  try {
    if (!url.startsWith('raahi://ride')) return null;

    const queryString = url.split('?')[1];
    if (!queryString) return null;

    // Use URLSearchParams or manual splitting if URLSearchParams has quirks in React Native's JS environment
    const params = new URLSearchParams(queryString);
    
    const originAddress = params.get('o');
    const destinationAddress = params.get('d');
    const originLat = parseFloat(params.get('ol') || '');
    const originLng = parseFloat(params.get('og') || '');
    const destinationLat = parseFloat(params.get('dl') || '');
    const destinationLng = parseFloat(params.get('dg') || '');
    const distanceKm = parseFloat(params.get('dist') || '');
    const fare = parseFloat(params.get('fare') || '');
    const isAC = params.get('ac') === '1';
    const driverPhone = params.get('ph');
    const driverVehicleName = params.get('vn');
    const driverVehicleModel = params.get('vm');
    const timestamp = parseInt(params.get('ts') || '', 10);
    const originPlaceId = params.get('opi') || '';
    const destinationPlaceId = params.get('dpi') || '';

    if (
      !originAddress ||
      !destinationAddress ||
      isNaN(originLat) ||
      isNaN(originLng) ||
      isNaN(destinationLat) ||
      isNaN(destinationLng) ||
      isNaN(distanceKm) ||
      isNaN(fare) ||
      !driverPhone ||
      !driverVehicleName ||
      !driverVehicleModel ||
      isNaN(timestamp)
    ) {
      console.warn('[DeepLinkService] Found missing or corrupted fields in URL.');
      return null;
    }

    return {
      originAddress,
      destinationAddress,
      originLat,
      originLng,
      destinationLat,
      destinationLng,
      distanceKm,
      fare,
      isAC,
      driverPhone,
      driverVehicleName,
      driverVehicleModel,
      timestamp,
      originPlaceId,
      destinationPlaceId,
    };
  } catch (error) {
    console.error('[DeepLinkService] Error decoding deep link:', error);
    return null;
  }
};

export const generateWhatsAppMessage = (trip: TripData, deepLink: string): string => {
  const formattedTime = new Date(trip.timestamp).toLocaleString();
  return `🚗 *Raahi Available!*

📍 *From:* ${trip.originAddress}
🏁 *To:* ${trip.destinationAddress}

💰 *Fare:* Rs. ${trip.fare.toFixed(2)}
🧊 *Tier:* ${trip.isAC ? 'AC' : 'Non-AC'}

🚙 *Vehicle:* ${trip.driverVehicleName} ${trip.driverVehicleModel}
📱 *Contact:* ${trip.driverPhone}
🕐 *Posted:* ${formattedTime}

👉 Tap to view: ${deepLink}

_Reply to this message to book your seat!_`;
};

export const openWhatsApp = async (phoneNumber: string, message: string): Promise<void> => {
  // Normalize phone number (E.164 without symbols except +)
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  const encodedMessage = encodeURIComponent(message);
  
  const nativeUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
  const webUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  const smsUrl = `sms:${cleanPhone}?body=${encodedMessage}`;

  try {
    const canOpen = await Linking.canOpenURL(nativeUrl);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
    } else {
      console.warn('[DeepLinkService] Native WhatsApp unavailable. Trying Web fallback...');
      const canOpenWeb = await Linking.canOpenURL(webUrl);
      if (canOpenWeb) {
        await Linking.openURL(webUrl);
      } else {
        console.warn('[DeepLinkService] Web WhatsApp unavailable. Using SMS fallback...');
        await Linking.openURL(smsUrl);
      }
    }
  } catch (error) {
    console.error('[DeepLinkService] Failed to open WhatsApp or SMS:', error);
    // Ultimate fallback is Clipboard + SMS or Share API
    throw new Error('WhatsApp and SMS links could not be opened. Please copy message manually.');
  }
};

export const shareTrip = async (trip: TripData): Promise<void> => {
  try {
    const deepLink = encodeTripToDeepLink(trip);
    const message = generateWhatsAppMessage(trip, deepLink);
    await Share.share({
      message,
      title: 'Raahi Trip Offer',
    });
  } catch (error) {
    console.error('[DeepLinkService] Sharing error:', error);
    throw new Error('Sharing not supported on this device.');
  }
};
