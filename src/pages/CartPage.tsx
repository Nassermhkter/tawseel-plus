import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, calculateDeliveryFee, calculateDistance } from '../lib/utils';
import { Trash2, MapPin, CreditCard, ChevronLeft } from 'lucide-react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Restaurant } from '../types';

export default function CartPage() {
  const { items, total, addItem, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(1500);

  const [whatsappNumber, setWhatsappNumber] = useState('967784880551');
  const [feeConfig, setFeeConfig] = useState<{ base?: number, perKm?: number, max?: number }>({});

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'general'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
          setFeeConfig({
            base: data.deliveryFeeBase,
            perKm: data.deliveryFeePerKm,
            max: data.deliveryFeeMax
          });
        }
      } catch (err) {
        console.error('Config fetch failed', err);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      // Assuming all items from same restaurant for now
      const fetchRestaurant = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'restaurants', items[0].restaurantId));
          if (docSnap.exists()) {
            const restData = docSnap.id ? { id: docSnap.id, ...docSnap.data() } as Restaurant : null;
            setRestaurant(restData);
            
            if (restData && user?.location) {
               const dist = calculateDistance(
                 user.location.lat, user.location.lng,
                 restData.location.lat, restData.location.lng
               );
               // Simple cross-district logic: if user district is not mentioned in restaurant district
               // Note: This is an approximation for demo purposes
               const isCross = restData.district && user.address ? !user.address.includes(restData.district) : false;
               
               // Use custom pricing from config if available, otherwise use defaults in utils
               setDeliveryFee(calculateDeliveryFee(dist, isCross, feeConfig));
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `restaurants/${items[0].restaurantId}`);
        }
      };
      fetchRestaurant();
    }
  }, [items, user, feeConfig]);

  const handleCheckout = () => {
    if (!user) {
      navigate('/auth', { state: { from: '/cart' } });
      return;
    }

    const itemsText = items.map(i => `• ${i.name} (x${i.quantity}) - ${formatCurrency(i.price * i.quantity)}`).join('\n');
    const locationLink = `https://www.google.com/maps?q=${user.location?.lat},${user.location?.lng}`;
    
    let message = `*📦 طلب جديد من توصيل بلس - عدن*\n\n` +
      `*👤 العميل:* ${user.name}\n` +
      `*📞 الهاتف:* ${user.phone}\n\n`;

    if (restaurant) {
      message += `*🏪 المطعم:* ${restaurant.name}\n\n`;
    }

    message += `*🍱 الأصناف:*\n${itemsText}\n\n` +
      `*💰 الحساب:*\n` +
      `- المجموع: ${formatCurrency(total)}\n` +
      `- رسوم التوصيل: ${formatCurrency(deliveryFee)}\n` +
      `- *الإجمالي:* ${formatCurrency(total + deliveryFee)}\n\n` +
      `*💳 طريقة الدفع:* نقداً عند الاستلام (COD)\n\n` +
      `*📍 موقع التوصيل:*\n` +
      `${locationLink}\n` +
      `*العنوان:* ${user.address}\n\n` +
      `شكراً لاستخدامكم توصيل بلس!`;

    const encoded = encodeURIComponent(message);
    window.location.href = `https://wa.me/${whatsappNumber}?text=${encoded}`;
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center text-gray-500">
          <Trash2 size={40} />
        </div>
        <h2 className="text-xl font-bold">السلة فارغة</h2>
        <button onClick={() => navigate('/')} className="btn-primary">ابدأ الطلب الآن</button>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-3 bg-surface border border-border rounded-xl text-text-muted hover:text-primary transition-colors"><ChevronLeft /></button>
        <h1 className="text-xl font-bold text-text font-display">مراجعة الطلب</h1>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-surface border border-border rounded-3xl flex justify-between p-4 shadow-sm">
            <div className="flex gap-4 items-center">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black border border-primary/20">{item.quantity}</span>
              <span className="font-bold text-text font-display">{item.name}</span>
            </div>
            <span className="text-primary font-black font-mono">{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-text-muted text-[10px] uppercase tracking-widest px-1">تفاصيل التوصيل</h3>
        <div className="bg-surface border border-border rounded-4xl p-6 space-y-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <p className="font-bold text-text font-display">{user?.name || 'سجل الدخول للمتابعة'}</p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{user?.address || 'يرجى تحديد الموقع في الملف الشخصي'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="font-bold text-text font-display font-medium">طريقة الدفع</p>
              <p className="text-xs text-text-muted mt-0.5">نقداً عند الاستلام (COD)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-4xl p-6 space-y-4 shadow-xl">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted font-medium">سعر الأصناف</span>
          <span className="font-bold font-mono text-text">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted font-medium">رسوم التوصيل</span>
          <span className="font-bold font-mono text-text">{formatCurrency(deliveryFee)}</span>
        </div>
        <div className="h-px bg-border my-1" />
        <div className="flex justify-between text-2xl font-black">
          <span className="font-display text-text">الإجمالي</span>
          <span className="text-primary font-mono">{formatCurrency(total + deliveryFee)}</span>
        </div>
      </div>

      <button 
        onClick={handleCheckout}
        className="w-full btn-primary h-20 text-xl shadow-primary-sm flex items-center justify-center gap-4 group"
      >
        <span className="font-display">تأكيد الطلب عبر واتساب</span>
      </button>

    </div>
  );
}
