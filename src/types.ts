export interface User {
  uid: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  location?: { lat: number; lng: number };
  role: 'customer' | 'admin';
}

export interface Restaurant {
  id: string;
  name: string;
  logo: string;
  district: string;
  location: { lat: number; lng: number };
  workingHours: { open: string; close: string };
  isVerified: boolean;
  rating: number;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  items: CartItem[];
  total: number;
  deliveryFee: number;
  status: 'pending' | 'confirmed' | 'delivering' | 'delivered' | 'cancelled';
  paymentMethod: string;
  location: { lat: number; lng: number; address: string };
  createdAt: any;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface DeliveryConfig {
  basePrice: number;
  perKmRate: number;
  maxFee: number;
}

export interface BankOption {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
}
