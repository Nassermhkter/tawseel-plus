import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, onSnapshot } from 'firebase/firestore';
import { Restaurant } from '../types';
import { MapPin, Star, Clock, ChevronDown, UtensilsCrossed } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const DISTRICTS = ['الكل', 'صيرة (كريتر)', 'المعلا', 'التواهي', 'خورمكسر', 'المنصورة', 'الشيخ عثمان', 'دار سعد', 'البريقة'];

const FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1563379091339-03b21ef4a4f8?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&auto=format&fit=crop"
];

export default function HomePage() {
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICTS[0]);
  const [showDistricts, setShowDistricts] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [platformConfig, setPlatformConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setPlatformConfig(snap.data());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        let q = query(collection(db, 'restaurants'));
        if (selectedDistrict !== 'الكل') {
          q = query(q, where('district', '==', selectedDistrict));
        }
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[];
        setRestaurants(data);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'restaurants');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [selectedDistrict]);

  const tabs = [
    { id: 'All', label: 'الكل' },
    { id: 'Nearest', label: 'الأقرب' },
    { id: 'New', label: 'وصل حديثاً' },
    { id: 'Favorites', label: 'المفضلة' }
  ];

  const isClosed = (hours: { open: string, close: string }) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openH, openM] = hours.open.split(':').map(Number);
    const [closeH, closeM] = hours.close.split(':').map(Number);
    
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;
    
    if (closeTime < openTime) {
      return currentTime < openTime && currentTime >= closeTime;
    }
    
    return currentTime < openTime || currentTime >= closeTime;
  };

  return (
    <div className="px-4 space-y-6 pb-12">
      {/* Maintenance Mode Overlay */}
      {platformConfig?.platformStatus === 'maintenance' && (
        <div className="bg-orange-500 text-white p-6 rounded-4xl flex flex-col items-center justify-center text-center gap-3 shadow-xl animate-pulse">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <UtensilsCrossed size={32} />
          </div>
          <h2 className="text-xl font-black font-display">المنصة تحت الصيانة</h2>
          <p className="text-sm font-medium opacity-90">نحن نعمل على تحسين تجربتكم، سنعود قريباً!</p>
        </div>
      )}

      {/* Platform Working Hours Badge */}
      {platformConfig && platformConfig.platformStatus !== 'maintenance' && (
        <div className={`border rounded-3xl p-4 flex items-center justify-between shadow-sm ${
          platformConfig.platformStatus === 'busy' ? 'bg-yellow-500/5 border-yellow-500/20' : 
          platformConfig.platformStatus === 'closed' ? 'bg-red-500/5 border-red-500/20' :
          'bg-primary/5 border-primary/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              platformConfig.platformStatus === 'busy' ? 'bg-yellow-500/10 text-yellow-600' :
              platformConfig.platformStatus === 'closed' ? 'bg-red-500/10 text-red-600' :
              'bg-primary/10 text-primary'
            }`}>
              <Clock size={20} />
            </div>
            <div>
              <h4 className={`text-xs font-black font-display ${
                platformConfig.platformStatus === 'busy' ? 'text-yellow-600' :
                platformConfig.platformStatus === 'closed' ? 'text-red-600' :
                'text-primary'
              }`}>
                {platformConfig.platformStatus === 'busy' ? 'الطلب الآن متاح (ضغط عالي)' : 
                 platformConfig.platformStatus === 'closed' ? 'نعتذر، المنصة مغلقة حالياً' :
                 'ساعات عمل المنصة'}
              </h4>
              <p className="text-[10px] text-text-muted font-bold">
                من {platformConfig.openingTime} صباحاً حتى {platformConfig.closingTime} مساءً
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              platformConfig.platformStatus === 'busy' ? 'bg-yellow-500' :
              platformConfig.platformStatus === 'closed' ? 'bg-red-500' :
              'bg-accent'
            }`} />
            <span className={`text-[10px] font-black uppercase tracking-tighter ${
              platformConfig.platformStatus === 'busy' ? 'text-yellow-600' :
              platformConfig.platformStatus === 'closed' ? 'text-red-600' :
              'text-accent'
            }`}>
              {platformConfig.platformStatus === 'busy' ? 'مزدحم' : 
               platformConfig.platformStatus === 'closed' ? 'مغلق' :
               'جاهزون لخدمتك'}
            </span>
          </div>
        </div>
      )}

      {/* Rolling Food Marquee - Continuous Loop */}
      {(platformConfig?.marqueeImages?.length > 0 || FOOD_IMAGES.length > 0) && (
        <div className="relative overflow-hidden py-2 -mx-4">
          <div className="flex w-fit animate-marquee">
            <div className="flex gap-4 px-4 whitespace-nowrap">
              {(platformConfig?.marqueeImages?.length > 0 ? platformConfig.marqueeImages : FOOD_IMAGES).map((img: string, i: number) => (
                <div key={`m1-${i}`} className="flex-shrink-0 w-40 h-28 rounded-2xl overflow-hidden border border-border shadow-md">
                  <img src={img} alt="Food" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
            {/* Duplicate for seamless loop */}
            <div className="flex gap-4 px-4 whitespace-nowrap" aria-hidden="true">
              {(platformConfig?.marqueeImages?.length > 0 ? platformConfig.marqueeImages : FOOD_IMAGES).map((img: string, i: number) => (
                <div key={`m2-${i}`} className="flex-shrink-0 w-40 h-28 rounded-2xl overflow-hidden border border-border shadow-md">
                  <img src={img} alt="Food" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* District Selector */}
      <div className="relative">
        <button 
          className="flex items-center gap-2 text-text font-bold bg-surface px-4 py-2 rounded-2xl border border-border shadow-sm active:scale-95 transition-all"
          onClick={() => setShowDistricts(!showDistricts)}
        >
          <MapPin size={18} className="text-primary" />
          <span className="font-display">{selectedDistrict}</span>
          <ChevronDown size={14} className={`transition-transform text-text-muted ${showDistricts ? 'rotate-180' : ''}`} />
        </button>

        {showDistricts && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDistricts(false)} />
            <div className="absolute top-full mt-2 w-56 bg-surface border border-border rounded-2xl shadow-2xl z-20 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {DISTRICTS.map((d) => (
                <button
                  key={d}
                  className={`w-full text-right px-4 py-2.5 text-sm transition-colors hover:bg-primary/5 ${
                    selectedDistrict === d ? 'text-primary font-bold bg-primary/5' : 'text-text-muted'
                  }`}
                  onClick={() => {
                    setSelectedDistrict(d);
                    setShowDistricts(false);
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-surface text-text-muted border border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Restaurants Grid */}
      <div className="grid gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-40 bg-surface rounded-3xl animate-pulse border border-border" />
          ))
        ) : restaurants.length === 0 ? (
          <div className="text-center py-20 text-text-muted font-medium">لا توجد مطاعم في هذه المنطقة حالياً</div>
        ) : (
          restaurants.map((restaurant) => {
            const closed = isClosed(restaurant.workingHours);
            return (
              <Link 
                key={restaurant.id} 
                to={`/restaurant/${restaurant.id}`}
                className="relative group block"
              >
                <div className={`bg-surface border border-border rounded-[2.5rem] p-4 flex gap-4 transition-all active:scale-[0.98] hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 ${closed ? 'opacity-60 grayscale' : ''}`}>
                  <img 
                    src={restaurant.logo || "https://picsum.photos/seed/food/200/200"} 
                    alt={restaurant.name}
                    className="w-24 h-24 rounded-3xl object-cover shadow-inner"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 space-y-2 py-1">
                    <h3 className="font-bold text-lg text-text font-display">{restaurant.name}</h3>
                    <p className="text-xs text-text-muted">مندي • مشاوي • شعبيات</p>
                    <div className="flex items-center gap-4 pt-1">
                      {closed ? (
                        <span className="status-badge-closed">مغلق</span>
                      ) : (
                        <span className="status-badge-open">مفتوح الآن</span>
                      )}
                      <div className="flex items-center gap-1 text-[11px] text-text-muted font-mono font-bold">
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        <span>{restaurant.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {closed && (
                  <div className="absolute inset-0 bg-background/40 rounded-[2.5rem] flex items-center justify-center backdrop-blur-sm transition-opacity">
                    <span className="bg-red-500 text-white px-5 py-2 rounded-2xl font-black text-sm shadow-xl">مغلق مؤقتاً</span>
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>

    </div>
  );
}
