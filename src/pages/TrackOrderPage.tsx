import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft, Package, MapPin, Phone, Clock, Bike } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Custom icons for map
const customerIcon = new L.Icon({
  iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const restaurantIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1046/1046757.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function TrackOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const unsub = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.error('Order not found');
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `orders/${orderId}`);
      setLoading(false);
    });

    return () => unsub();
  }, [orderId]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'تم استلام الطلب';
      case 'preparing': return 'جاري تجهيز الطلب';
      case 'on_the_way': return 'الطلب في الطريق إليك';
      case 'delivered': return 'تم التوصيل';
      case 'cancelled': return 'تم إلغاء الطلب';
      default: return 'جاري المعالجة';
    }
  };

  const getStatusStep = (status: string) => {
    const steps = ['pending', 'preparing', 'on_the_way', 'delivered'];
    return steps.indexOf(status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-6 py-20 text-center">
        <h2 className="text-xl font-bold mb-4">عذراً، لم يتم العثور على الطلب</h2>
        <button onClick={() => navigate('/')} className="btn-primary w-full max-w-xs">العودة للرئيسية</button>
      </div>
    );
  }

  const currentStep = getStatusStep(order.status);
  const driverPos: [number, number] | null = order.driverLocation ? [order.driverLocation.lat, order.driverLocation.lng] : null;
  const customerPos: [number, number] = [order.location.lat, order.location.lng];

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="px-6 py-5 flex items-center gap-4 bg-background sticky top-0 z-20">
        <button onClick={() => navigate('/')} className="p-2 bg-surface border border-border rounded-xl text-text-muted">
          <ChevronLeft />
        </button>
        <div>
          <h1 className="text-xl font-bold font-display">تتبع الطلب</h1>
          <p className="text-[10px] text-text-muted">رقم الطلب: #{order.id.slice(-6).toUpperCase()}</p>
        </div>
      </div>

      {/* Map Section */}
      <div className="relative h-[40vh] mb-6">
        <MapContainer 
          center={driverPos || customerPos} 
          zoom={15} 
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={customerPos} icon={customerIcon}>
            <Popup>موقعك</Popup>
          </Marker>
          {driverPos && (
            <>
              <Marker position={driverPos} icon={driverIcon}>
                <Popup>السائق</Popup>
              </Marker>
              <MapUpdater center={driverPos} />
            </>
          )}
        </MapContainer>
        
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
          <button onClick={() => window.location.reload()} className="p-3 bg-surface border border-border rounded-xl shadow-xl text-primary">
            <Clock size={20} />
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className="px-6 space-y-6">
        <div className="bg-surface border border-border rounded-4xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Bike size={80} />
          </div>
          
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-2">حالة الطلب الحالية</span>
            <h2 className="text-2xl font-black text-text font-display mb-4">{getStatusText(order.status)}</h2>
            
            {/* Minimal Progress Bar */}
            <div className="relative h-2 bg-background rounded-full overflow-hidden mb-8">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-primary"
                initial={{ width: '0%' }}
                animate={{ width: `${(currentStep + 1) * 25}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>

            {/* Steps */}
            <div className="space-y-6">
              {[
                { key: 'pending', icon: <Package size={18} />, label: 'تم الطلب' },
                { key: 'preparing', icon: <Clock size={18} />, label: 'تجهيز الطلب' },
                { key: 'on_the_way', icon: <Bike size={18} />, label: 'في الطريق' },
                { key: 'delivered', icon: <MapPin size={18} />, label: 'تم الوصول' }
              ].map((step, idx) => (
                <div key={step.key} className={`flex items-center gap-4 transition-colors ${idx <= currentStep ? 'text-text' : 'text-text-muted opacity-40'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${idx <= currentStep ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-background border border-border'}`}>
                    {step.icon}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${idx === currentStep ? 'text-primary' : ''}`}>{step.label}</p>
                    {idx === currentStep && <div className="flex gap-1 mt-0.5"><div className="w-1 h-1 rounded-full bg-primary animate-bounce" /><div className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" /><div className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" /></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button className="w-full btn-secondary flex items-center justify-center gap-2 py-5">
          <Phone size={20} />
          <span>اتصال بالسائق</span>
        </button>
      </div>
    </div>
  );
}
