import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Restaurant, MenuItem } from '../types';
import { Search, Utensils, Store, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) setPlatformConfig(snap.data());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setRestaurants([]);
      setItems([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      // Firestore doesn't support full-text search easily, so we fetch and filter or use prefix matches
      // For demo, we fetch a bunch and filter locally (not efficient for real production)
      const restSnap = await getDocs(collection(db, 'restaurants'));
      const foundRests = restSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as Restaurant)
        .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      setRestaurants(foundRests);

      // Note: searching items across ALL restaurants is tricky with Firestore without root collection
      // For this app, we'd ideally have a global 'menuItems' collection mirrored
      setLoading(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  return (
    <div className="px-4 space-y-6">
      <div className="search-input shadow-2xl">
        <Search size={20} />
        <input 
          autoFocus
          type="text"
          placeholder="ابحث عن مطعم أو وجبة..."
          className="w-full bg-transparent outline-none text-white placeholder-gray-500 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {searchTerm && (
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-2" />
      )}

      <div className="space-y-6">
        {loading && <div className="text-center py-10 opacity-50">جاري البحث...</div>}

        {!loading && searchTerm.length >= 2 && restaurants.length === 0 && (
          <div className="text-center py-10 text-gray-500">لا توجد نتائج لـ "{searchTerm}"</div>
        )}

        {restaurants.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2">
               <Store size={14} /> المطاعم
            </h3>
            {restaurants.map(r => {
              const hasCustomLogo = r.logo && !r.logo.includes('picsum.photos');
              return (
                <Link key={r.id} to={`/restaurant/${r.id}`} className="dark-card flex justify-between items-center group">
                  <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/5 border border-border/50 flex items-center justify-center shrink-0">
                      {!hasCustomLogo && platformConfig?.platformLogo ? (
                        <img 
                          src={platformConfig.platformLogo}
                          alt="Fallback"
                          className="w-full h-full object-contain p-2 opacity-20 filter grayscale"
                        />
                      ) : (
                        <img src={r.logo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold">{r.name}</p>
                      <p className="text-[10px] text-gray-500">{r.district}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-600 group-hover:text-primary transition-colors" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Categories Suggestions */}
        {searchTerm.length === 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest px-1">مقترحات شائعة</h3>
            <div className="grid grid-cols-2 gap-3">
              {['برجر', 'بيتزا', 'شاورما', 'حلويات', 'مشاوي', 'كبسة'].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSearchTerm(cat)}
                  className="bg-surface border border-border p-4 rounded-2xl flex items-center gap-3 transition-transform active:scale-95"
                >
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    <Utensils size={18} />
                  </div>
                  <span className="font-bold text-sm">{cat}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
