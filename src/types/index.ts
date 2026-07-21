export interface DriverProfile {
  vehicleName: string;      // e.g., "Toyota"
  vehicleModel: string;     // e.g., "Camry 2023"
  phoneNumber: string;      // E.164 format: +1234567890
  defaultACStatus: boolean; // true = AC tier default
}

export interface FareRates {
  rates: {
    ac: { base: number; perKm: number; };
    nonAc: { base: number; perKm: number; };
  };
}

export interface TripData {
  originPlaceId: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationPlaceId: string;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  fare: number;
  isAC: boolean;
  driverPhone: string;
  driverVehicleName: string;
  driverVehicleModel: string;
  timestamp: number;
}

export interface AdminFareConfig {
  rates: {
    ac: { base: number; perKm: number; updatedAt: number; };
    nonAc: { base: number; perKm: number; updatedAt: number; };
  };
  lastUpdated: number;
  version: string;
}

export interface DistanceMatrixResponse {
  rows: Array<{
    elements: Array<{
      distance: { text: string; value: number }; // meters
      duration: { text: string; value: number }; // seconds
      status: string;
    }>;
  }>;
  status: string;
}

export interface RouteConfig {
  date?: string;
  origin: string;
  destination: string;
  distanceKm: number;
  acFare: number;
  nonAcFare: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  profilePicture: string; // URL, avatar name, or local asset path
  bloodGroup: string;
  emergencyContacts?: EmergencyContact[];
}

export interface OfferRidePost {
  id: string;
  driverUid: string;
  driverName: string;
  driverPhone: string;
  fromCity: string;
  toCity: string;
  fromDetails?: string;
  toDetails?: string;
  vehicleDetails: string;
  isAC: boolean;
  seatsAvailable: number;
  departureTime: string; // e.g., "14:00" or ISO timestamp
  departureTimestamp: number; // Unix millis for filtering & auto-deletion
  farePerSeat: number;
  createdAt: number;
}

export interface BookRidePost {
  id: string;
  passengerUid: string;
  passengerName: string;
  passengerPhone: string;
  fromCity: string;
  toCity: string;
  fromDetails?: string;
  toDetails?: string;
  bagsCount: number;
  isAC: boolean;
  passengersCount: number;
  departureTime: string;
  departureTimestamp: number;
  createdAt: number;
}

export interface BookingRequest {
  id: string;
  ridePostId: string;
  passengerUid: string;
  passengerName: string;
  passengerPhone: string;
  seatsRequested: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}
