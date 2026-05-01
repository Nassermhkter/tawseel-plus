import { collection, addDoc, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SEED_RESTAURANTS = [
  {
    name: 'برجر فيول',
    district: 'المنصورة',
    logo: 'https://picsum.photos/seed/burger/400/400',
    workingHours: { open: '10:00', close: '02:00' },
    location: { lat: 12.8256, lng: 44.9856 },
    rating: 4.8,
    isVerified: true
  },
  {
    name: 'شاورما الراعي',
    district: 'كريتر',
    logo: 'https://picsum.photos/seed/shawarma/400/400',
    workingHours: { open: '16:00', close: '01:00' },
    location: { lat: 12.7856, lng: 45.0186 },
    rating: 4.5,
    isVerified: true
  },
  {
    name: 'بيتزا هت عدن',
    district: 'خورمكسر',
    logo: 'https://picsum.photos/seed/pizza/400/400',
    workingHours: { open: '11:00', close: '00:00' },
    location: { lat: 12.8123, lng: 45.0234 },
    rating: 4.2,
    isVerified: true
  }
];

export async function seedDatabase() {
  const existing = await getDocs(collection(db, 'restaurants'));
  if (existing.size > 0) return;

  for (const rest of SEED_RESTAURANTS) {
    const restRef = await addDoc(collection(db, 'restaurants'), rest);
    
    // Add a category
    const catRef = await addDoc(collection(db, 'restaurants', restRef.id, 'categories'), {
      name: 'الوجبات الأكثر مبيعاً',
      restaurantId: restRef.id
    });

    // Add some items
    await addDoc(collection(db, 'restaurants', restRef.id, 'items'), {
      name: `وجبة ${rest.name} المميزة`,
      description: 'أفضل مذاق بلمسة عدنية خاصة، تقدم مع البطاطس والمشروب',
      price: 5500,
      image: rest.logo,
      categoryId: catRef.id,
      restaurantId: restRef.id
    });
    
    await addDoc(collection(db, 'restaurants', restRef.id, 'items'), {
      name: 'عرض التوفير العائلي',
      description: 'تكفي لـ 4 أشخاص بخصم خاص',
      price: 18000,
      image: rest.logo,
      categoryId: catRef.id,
      restaurantId: restRef.id
    });
  }

  // Set default delivery config
  await setDoc(doc(db, 'deliveryConfig', 'global'), {
    basePrice: 1500,
    perKmRate: 400,
    maxFee: 5500
  });

  // Create default admin user record in Firestore
  await setDoc(doc(db, 'users', 'admin_default_id'), {
    uid: 'admin_default_id',
    name: 'مدير النظام',
    email: 'admin@tawseel.com',
    phone: '784880551',
    role: 'admin',
    createdAt: new Date().toISOString()
  });

  // Set default general config
  await setDoc(doc(db, 'config', 'general'), {
    minOrder: 1500,
    deliveryFeeBase: 1500,
    deliveryFeePerKm: 300,
    deliveryFeeMax: 5000,
    whatsappNumber: '967733000000'
  });

  console.log('Database seeded successfully!');
}
