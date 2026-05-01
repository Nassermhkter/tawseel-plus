export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-YE', {
    style: 'currency',
    currency: 'YER',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Calculates the distance between two points in kilometers using the Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function calculateDeliveryFee(distance: number, isCrossCity: boolean = false, config?: { base?: number, perKm?: number, max?: number }): number {
  // Use provided config or defaults
  const base = config?.base ?? 1500;
  const perKm = config?.perKm ?? 300;
  const max = config?.max ?? 5000;
  const penalty = isCrossCity ? 500 : 0;
  
  const calculated = base + (distance * perKm) + penalty;
  
  // Enforce minimum 1500 and maximum from config
  const fee = Math.max(1500, Math.round(calculated / 50) * 50);
  return Math.min(fee, max);
}

export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
