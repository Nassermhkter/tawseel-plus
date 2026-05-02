import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, calculateDeliveryFee, calculateDistance } from '../lib/utils';
import { Trash2, MapPin, CreditCard, ChevronLeft, CheckCircle2, ChevronRight, Map as MapIcon } from 'lucide-react';
import { collection, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Restaurant } from '../types';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }: { position: {lat: number, lng: number}, setPosition: (pos: {lat: number, lng: number}) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? (
    <Marker position={[position.lat, position.lng]} />
  ) : null;
}

export default function CartPage() {
  const { items, total, addItem, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(1500);
  const [step, setStep] = useState<'review' | 'location'>('review');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(user?.location || null);

  const [whatsappNumber, setWhatsappNumber] = useState('967784880551');
  const [feeConfig, setFeeConfig] = useState<{ base?: number, perKm?: number, max?: number }>({});

  useEffect(() => {
    if (user?.location && !selectedLocation) {
      setSelectedLocation(user.location);
    }
  }, [user]);

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
      const fetchRestaurant = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'restaurants', items[0].restaurantId));
          if (docSnap.exists()) {
            const restData = { id: docSnap.id, ...docSnap.data() } as Restaurant;
            setRestaurant(restData);
            
            const locToUse = selectedLocation || user?.location;
            if (restData && locToUse) {
               const dist = calculateDistance(
                 locToUse.lat, locToUse.lng,
                 restData.location.lat, restData.location.lng
               );
               const isCross = restData.district && user?.address ? !user.address.includes(restData.district) : false;
               setDeliveryFee(calculateDeliveryFee(dist, isCross, feeConfig));
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `restaurants/${items[0].restaurantId}`);
        }
      };
      fetchRestaurant();
    }
  }, [items, user, feeConfig, selectedLocation]);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/auth', { state: { from: '/cart' } });
      return;
    }

    if (!selectedLocation) {
      alert('الرجاء تحديد الموقع على الخريطة أولاً');
      setStep('location');
      return;
    }

    if (!agreedToTerms) {
      alert('يرجى الموافقة على شروط التوصيل للمتابعة');
      return;
    }

    const itemsText = items.map(i => `• ${i.name} (x${i.quantity}) - ${formatCurrency(i.price * i.quantity)}`).join('\n');
    const locationLink = `https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`;
    
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

    try {
      const orderRef = await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        restaurantId: restaurant?.id || 'unknown',
        items: items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
        total,
        deliveryFee,
        status: 'pending',
        location: selectedLocation,
        createdAt: new Date().toISOString()
      });

      clearCart();
      navigate(`/track-order/${orderRef.id}`);
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
      
    } catch (err) {
      console.error('Checkout failed', err);
      window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-20 h-20 bg-surface rounded-4xl flex items-center justify-center text-text-muted">
          <Trash2 size={40} />
        </div>
        <h2 className="text-xl font-bold font-display">السلة فارغة</h2>
        <button onClick={() => navigate('/')} className="btn-primary">ابدأ الطلب الآن</button>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => step === 'location' ? setStep('review') : navigate(-1)} 
          className="p-3 bg-surface border border-border rounded-xl text-text-muted hover:text-primary transition-colors"
        >
          <ChevronLeft />
        </button>
        <h1 className="text-xl font-bold text-text font-display">
          {step === 'location' ? 'تحديد موقع التوصيل' : 'مراجعة الطلب'}
        </h1>
      </div>

      {step === 'review' ? (
        <>
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
            <div 
              onClick={() => setStep('location')}
              className="bg-surface border border-border rounded-4xl p-6 space-y-6 shadow-sm cursor-pointer hover:border-primary/30 transition-all border-dashed"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-text font-display">{user?.name || 'سجل الدخول للمتابعة'}</p>
                    <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">تغيير الموقع</span>
                  </div>
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

          <div className="bg-surface border border-border rounded-4xl p-6 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="mt-1 w-5 h-5 rounded-lg border-border text-primary focus:ring-primary accent-primary"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span className="text-xs text-text-muted leading-relaxed select-none group-hover:text-text transition-colors">
                أوافق على إرسال تفاصيل الطلب وموقعي الجغرافي عبر الواتساب لإكمال عملية التوصيل.
              </span>
            </label>
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
            onClick={() => setStep('location')}
            className="w-full btn-primary h-20 text-xl shadow-primary-sm flex items-center justify-center gap-4 group"
          >
            <span className="font-display">متابعة لتحديد الموقع</span>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="relative h-[50vh] rounded-4xl overflow-hidden border border-border shadow-2xl">
            <MapContainer 
              center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [12.825, 44.985]} 
              zoom={15} 
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationMarker position={selectedLocation || {lat: 12.825, lng: 44.985}} setPosition={setSelectedLocation} />
            </MapContainer>
            <div className="absolute top-4 right-4 z-[1000] bg-surface p-3 rounded-2xl shadow-xl border border-border">
              <p className="text-[10px] font-bold text-primary mb-1">اضغط على الخريطة لتحديد موقعك</p>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-4xl p-6 space-y-4 shadow-xl">
             <div className="flex items-center gap-3 text-accent bg-accent/10 p-4 rounded-2xl">
               <CheckCircle2 size={24} />
               <p className="text-sm font-bold">تم تحديد الموقع بنجاح</p>
             </div>
             <p className="text-xs text-text-muted px-2">موقعك الجغرافي يساعد السائق على الوصول إليك بأسرع وقت ممكن.</p>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={!selectedLocation || !agreedToTerms}
            className={`w-full h-20 text-xl rounded-2xl font-black transition-all flex items-center justify-center gap-4 shadow-xl ${
              selectedLocation && agreedToTerms 
                ? 'bg-primary text-white shadow-primary/20 animate-pulse' 
                : 'bg-surface text-text-muted border border-border opacity-50 cursor-not-allowed'
            }`}
          >
            <span className="font-display">تأكيد الطلب الآن</span>
            <MapIcon size={24} />
          </button>
          
          {!agreedToTerms && (
            <p className="text-[10px] text-red-500 text-center font-bold">يرجى الموافقة على الأذونات في الخطوة السابقة</p>
          )}
        </div>
      )}
    </div>
  );
}

