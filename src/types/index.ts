export interface DriverProfile {
  driverName?: string;      // e.g., "Faisal Ahmed"
  vehicleName: string;      // e.g., "Toyota"
  vehicleModel: string;     // e.g., "Camry 2023"
  phoneNumber: string;      // E.164 format: +1234567890
  defaultACStatus: boolean; // true = AC tier default
  licenseNumber?: string;   // e.g. "LHR-2021-998812"
  drivingLicenseUri?: string; // Image URI or demo base64
  isLicenseVerified?: boolean;
}

export interface FareRates {
  rates: {
    ac: { base: number; perKm: number; };
    nonAc: { base: number; perKm: number; };
  };
}

export interface TripData {
  id?: string;
  driverName?: string;
  originPlaceId?: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationPlaceId?: string;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm?: number;
  fare?: number;
  price?: string | number;
  seats?: number;
  isAC?: boolean;
  driverPhone: string;
  driverVehicleName?: string;
  driverVehicleModel?: string;
  timestamp: number;
}

export type VehicleCategory = 'below_1000cc' | 'above_1000cc';
export type ACTier = 'ac' | 'non_ac';
export type RouteHighwayType = 'gt_road' | 'cpec';

export interface MileageConfig {
  below_1000cc_non_ac: number; // 15 KM/L (Cars Below 1000 CC without AC)
  below_1000cc_ac: number;     // 13.5 KM/L (Cars Below 1000 CC with AC)
  above_1000cc_non_ac: number; // 14.5 KM/L (Cars 1000 CC and above without AC)
  above_1000cc_ac: number;     // 13 KM/L (Cars 1000 CC and above with AC)
}

export interface FareFormulaConfig {
  fuelPricePerLiter: number; // e.g. 344 Rs
  passengerCapacity: number; // e.g. 4
  tollCharges: {
    gt_road: number; // 200 Rs
    cpec: number;    // 360 Rs
  };
  mileage: MileageConfig;
  lastUpdated?: number;
}

export interface AdminFareConfig {
  formula: FareFormulaConfig;
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

export interface UserReview {
  id: string;
  targetUid: string;
  targetName: string;
  reviewerUid: string;
  reviewerName: string;
  reviewerRole: 'driver' | 'passenger';
  rating: number; // 1 to 5
  comment: string;
  date: string;
  createdAt: number;
  isEdited?: boolean;
  tripVerified?: boolean;
}

export interface VerificationDetails {
  cnicNumber?: string;
  cnicFrontUri?: string;
  cnicBackUri?: string;
  isCNICVerified?: boolean;
  phoneVerified?: boolean;
  drivingLicenseNumber?: string;
  drivingLicenseFrontUri?: string;
  drivingLicenseBackUri?: string;
  isLicenseVerified?: boolean;
  vehicleRegistrationNumber?: string;
  vehicleRegistrationUri?: string;
  isVehicleRegistrationVerified?: boolean;
  isVerified?: boolean;
  verifiedAt?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  profilePicture: string; // URL, avatar name, or local asset path
  bloodGroup: string;
  activeProfile?: 'passenger' | 'driver';
  emergencyContacts?: EmergencyContact[];
  isVerified?: boolean;
  verification?: VerificationDetails;
  driverProfile?: DriverProfile;
  vehicleDetails?: string;
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
  travelDate?: string; // e.g., "Today", "Tomorrow", "2026-08-29"
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
  travelDate?: string; // e.g., "Today", "Tomorrow", "2026-08-29"
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

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'offer' | 'system' | 'emergency';
  timestamp: number;
  read: boolean;
}

export interface AppSettings {
  darkMode: boolean;
  pushNotifications: boolean;
  rideAlerts: boolean;
  smsAlerts: boolean;
  soundEnabled: boolean;
  language: 'English' | 'Urdu';
  defaultCity: string;
}

