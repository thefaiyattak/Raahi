import { UserProfile, DriverProfile } from '../types';

export interface TrustScoreBreakdown {
  totalScore: number; // 0 to 100
  tierLabel: 'Excellent' | 'Good' | 'Fair' | 'Basic';
  isDriverRole: boolean;
  pillars: {
    userVerification: { score: number; max: number; isComplete: boolean; details: string };
    driverVehicleVerification?: { score: number; max: number; isComplete: boolean; details: string };
    completedTrips: { score: number; max: number; count: number; details: string };
    ratingsAndReviews: { score: number; max: number; rating: number; details: string };
  };
}

export const calculateTrustScore = (
  userProfile?: UserProfile | null,
  driverProfile?: DriverProfile | null,
  completedTripsCount: number = 14,
  avgRating: number = 4.9,
  isDriverRole: boolean = false
): TrustScoreBreakdown => {
  const verif = userProfile?.verification || {};
  const isCnicOk = verif.isCNICVerified || !!(verif.cnicFrontUri && verif.cnicBackUri);
  const isPhoneOk = verif.phoneVerified !== false;

  if (!isDriverRole) {
    // PASSENGER PROFILE CALCULATION (Driver & Vehicle Verification not applied)
    // 1. User Identity Verification (Max 50 pts: 25 pts CNIC + 25 pts Phone)
    let userVerifScore = 0;
    if (isCnicOk) userVerifScore += 25;
    if (isPhoneOk) userVerifScore += 25;

    // 2. Successfully Completed Trips (Max 25 pts)
    let tripsScore = Math.min(25, Math.round((completedTripsCount / 10) * 25));

    // 3. Rating & Reviews (Max 25 pts)
    let ratingScore = Math.min(25, Math.round((avgRating / 5.0) * 25));

    const totalScore = Math.min(100, userVerifScore + tripsScore + ratingScore);

    let tierLabel: 'Excellent' | 'Good' | 'Fair' | 'Basic' = 'Excellent';
    if (totalScore < 60) tierLabel = 'Basic';
    else if (totalScore < 80) tierLabel = 'Fair';
    else if (totalScore < 95) tierLabel = 'Good';

    return {
      totalScore,
      tierLabel,
      isDriverRole: false,
      pillars: {
        userVerification: {
          score: userVerifScore,
          max: 50,
          isComplete: userVerifScore >= 48,
          details: isCnicOk && isPhoneOk ? 'CNIC & Active Phone Verified' : 'CNIC or Phone pending',
        },
        completedTrips: {
          score: tripsScore,
          max: 25,
          count: completedTripsCount,
          details: `${completedTripsCount} Successful Passenger Rides Completed`,
        },
        ratingsAndReviews: {
          score: ratingScore,
          max: 25,
          rating: avgRating,
          details: `${avgRating.toFixed(1)} ⭐ Average Rating (32 Reviews)`,
        },
      },
    };
  } else {
    // DRIVER PROFILE CALCULATION (Includes Driver & Vehicle Verification)
    // 1. User Verification (Max 25 pts)
    let userVerifScore = 0;
    if (isCnicOk) userVerifScore += 13;
    if (isPhoneOk) userVerifScore += 12;

    // 2. Driver & Vehicle Verification (Max 25 pts)
    let driverVerifScore = 0;
    const isLicenseOk = verif.isLicenseVerified || !!verif.drivingLicenseFrontUri;
    const isVehicleOk = verif.isVehicleRegistrationVerified || !!verif.vehicleRegistrationUri;
    const hasVehicleSetup = !!(driverProfile && driverProfile.vehicleName);

    if (isLicenseOk) driverVerifScore += 13;
    if (isVehicleOk) driverVerifScore += 12;

    // 3. Successfully Completed Trips (Max 25 pts)
    let tripsScore = Math.min(25, Math.round((completedTripsCount / 10) * 25));

    // 4. Rating & Reviews (Max 25 pts)
    let ratingScore = Math.min(25, Math.round((avgRating / 5.0) * 25));

    const totalScore = Math.min(100, userVerifScore + driverVerifScore + tripsScore + ratingScore);

    let tierLabel: 'Excellent' | 'Good' | 'Fair' | 'Basic' = 'Excellent';
    if (totalScore < 60) tierLabel = 'Basic';
    else if (totalScore < 80) tierLabel = 'Fair';
    else if (totalScore < 95) tierLabel = 'Good';

    return {
      totalScore,
      tierLabel,
      isDriverRole: true,
      pillars: {
        userVerification: {
          score: userVerifScore,
          max: 25,
          isComplete: userVerifScore >= 24,
          details: isCnicOk && isPhoneOk ? 'CNIC & Active Phone Verified' : 'CNIC or Phone pending',
        },
        driverVehicleVerification: {
          score: driverVerifScore,
          max: 25,
          isComplete: driverVerifScore >= 24,
          details: hasVehicleSetup
            ? (isLicenseOk && isVehicleOk ? 'License & Vehicle Book Verified' : 'License/Vehicle pending')
            : 'Vehicle profile setup required',
        },
        completedTrips: {
          score: tripsScore,
          max: 25,
          count: completedTripsCount,
          details: `${completedTripsCount} Successful Driver Rides Completed`,
        },
        ratingsAndReviews: {
          score: ratingScore,
          max: 25,
          rating: avgRating,
          details: `${avgRating.toFixed(1)} ⭐ Average Rating (32 Reviews)`,
        },
      },
    };
  }
};
