import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Restaurant } from '../types';
import { MapPin, Star, Clock, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const DISTRICTS = ['الكل', 'صيرة (كريتر)', 'المعلا', 'التواهي', 'خورمكسر', 'المنصورة', 'الشيخ عثمان', 'دار سعد', 'البريقة'];

export default function HomePage() {
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICTS[0]);
  const [showDistricts, setShowDistricts] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);

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
      // Handles overnight closing times (e.g., 8:00 AM - 2:00 AM)
      return currentTime < openTime && currentTime >= closeTime;
    }
    
    return currentTime < openTime || currentTime >= closeTime;
  };

  return (
    <div className="px-4 space-y-6">
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
