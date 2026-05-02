import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Restaurant } from '../types';
import { MapPin, Star, Clock, ChevronDown, UtensilsCrossed, Search, Heart, Bell, ShoppingBag, Package, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';

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
  const [searchQuery, setSearchQuery] = useState('');

  const { toggleFavorite, isFavorite, user } = useAuth();

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

  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'Favorites' ? isFavorite(r.id) : true;
    return matchesSearch && matchesTab;
  });

  const tabs = [
    { id: 'All', label: 'الكل' },
    { id: 'Nearest', label: 'الأقرب' },
    { id: 'New', label: 'وصل حديثاً' },
    { id: 'Favorites', label: 'المفضلة' }
  ];

  const checkIsClosed = (hours: { open: string, close: string }) => {
    if (!hours) return false;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openH, openM] = (hours.open || '08:00').split(':').map(Number);
    const [closeH, closeM] = (hours.close || '23:00').split(':').map(Number);
    
    const openTime = openH * 60 + openM;
    let closeTime = closeH * 60 + closeM;

    if (closeTime < openTime) {
      return !(currentTime >= openTime || currentTime < closeTime);
    }
    return currentTime < openTime || currentTime >= closeTime;
  };

  const platformClosedByTime = platformConfig ? checkIsClosed({ open: platformConfig.openingTime || '10:00', close: platformConfig.closingTime || '23:00' }) : false;
  const isActuallyClosed = platformConfig?.platformStatus === 'closed' || platformConfig?.platformStatus === 'maintenance' || platformClosedByTime;

  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = platformConfig?.carouselImages || [
    { title: 'أفضل الوجبات', subtitle: 'توصيل سريع لباب بيتك بلمشة زر', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000' },
    { title: 'عروض حصرية', subtitle: 'خصومات تصل إلى 50٪ على مطاعم مختارة', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000' },
    { title: 'خدمة 24 ساعة', subtitle: 'نحن معك دائماً في أي وقت ومن أي مكان', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000' }
  ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrentSlide(s => (s + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setRecentOrders([]);
      return;
    }
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(2)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRecentOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error('Recent orders fetch failed', err);
    });
    return () => unsub();
  }, [user]);

  return (
    <div className="px-4 space-y-6 pb-12 overflow-x-hidden">
      {/* Notifications Header Area removed for global Header integration */}
      <div className="flex items-center justify-between mt-2">
        <h2 className="text-xl font-black font-display text-text">اكتشف المطاعم</h2>
      </div>


      {/* Maintenance Mode Overlay */}
      {platformConfig?.platformStatus === 'maintenance' && (
        <div className="bg-orange-500 text-white p-6 rounded-4xl flex flex-col items-center justify-center text-center gap-3 shadow-xl animate-pulse">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <UtensilsCrossed size={32} />
          </div>
          <h2 className="text-xl font-black font-display">{platformConfig?.platformName || 'توصيل بلس'} تحت الصيانة</h2>
          <p className="text-sm font-medium opacity-90">نحن نعمل على تحسين تجربتكم، سنعود قريباً!</p>
        </div>
      )}

      {/* Hero Carousel */}
      <div className="relative h-48 md:h-64 rounded-4xl overflow-hidden group shadow-xl">
        <div 
          className="absolute inset-0 flex transition-transform duration-700 ease-out" 
          style={{ transform: `translateX(${-currentSlide * 100}%)`, width: `${slides.length * 100}%` }}
        >
          {slides.map((slide: any, idx: number) => (
            <div key={idx} className="w-full h-full relative">
              <img 
                src={slide.image} 
                className="w-full h-full object-cover" 
                alt={slide.title} 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-6">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: currentSlide === idx ? 0 : 20, opacity: currentSlide === idx ? 1 : 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-2xl font-black text-white font-display leading-tight">{slide.title}</h3>
                  <p className="text-white/80 text-sm font-medium mt-1">{slide.subtitle}</p>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Carousel Indicators */}
        <div className="absolute bottom-4 left-6 flex gap-1.5 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
          {slides.map((_: any, idx: number) => (
            <button 
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'bg-primary w-5' : 'bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      </div>

      {/* Platform Working Hours Badge */}
      {platformConfig && platformConfig.platformStatus !== 'maintenance' && (
        <div className={`border rounded-3xl p-4 flex items-center justify-between shadow-sm transition-all duration-500 ${
          isActuallyClosed ? 'bg-red-500/5 border-red-500/20 shadow-red-500/5' :
          platformConfig.platformStatus === 'busy' ? 'bg-yellow-500/5 border-yellow-500/20 shadow-yellow-500/5' : 
          'bg-green-500/5 border-green-500/20 shadow-green-500/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors duration-500 ${
              isActuallyClosed ? 'bg-red-500/10 text-red-600' :
              platformConfig.platformStatus === 'busy' ? 'bg-yellow-500/10 text-yellow-600' :
              'bg-green-500/10 text-green-600'
            }`}>
              {isActuallyClosed ? <Clock size={20} className="animate-spin-slow" /> : <Clock size={20} />}
            </div>
            <div>
              <h4 className={`text-xs font-black font-display transition-colors duration-500 ${
                isActuallyClosed ? 'text-red-600' :
                platformConfig.platformStatus === 'busy' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {isActuallyClosed ? 'نعتذر، المنصة مغلقة حالياً' :
                 platformConfig.platformStatus === 'busy' ? 'الطلب متاح (ضغط عالي)' : 
                 'أهلاً بك! نحن متاحون للخدمة'}
              </h4>
              <p className="text-[10px] text-text-muted font-bold font-mono">
                {platformConfig.openingTime} - {platformConfig.closingTime}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shadow-sm ${
                isActuallyClosed ? 'bg-red-500 shadow-red-500/50' :
                platformConfig.platformStatus === 'busy' ? 'bg-yellow-500 shadow-yellow-500/50 animate-pulse' :
                'bg-green-500 shadow-green-500/50 animate-pulse'
              }`} />
              <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors duration-500 ${
                isActuallyClosed ? 'text-red-600' :
                platformConfig.platformStatus === 'busy' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {isActuallyClosed ? 'مغلق' : 
                 platformConfig.platformStatus === 'busy' ? 'مزدحم' :
                 'مفتوح الآن'}
              </span>
            </div>
            {isActuallyClosed && (
              <span className="text-[8px] text-red-500/60 font-bold">يرجى العودة في أوقات الدوام</span>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity/Orders Section */}
      {recentOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-text uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={14} className="text-primary" />
              طلباتي الأخيرة
            </h3>
            <Link to="/profile" className="text-[10px] font-bold text-primary hover:underline">عرض الكل</Link>
          </div>
          <div className="grid gap-3">
            {recentOrders.map(order => (
              <Link 
                key={order.id} 
                to={`/track-order/${order.id}`}
                className="group relative bg-surface border border-border rounded-3xl p-4 flex items-center justify-between hover:border-primary/30 active:scale-[0.98] transition-all overflow-hidden"
              >
                {order.status === 'on_the_way' && (
                  <div className="absolute top-0 right-0 w-1 h-full bg-primary animate-pulse" />
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                    order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {order.status === 'delivered' ? <Check size={18} /> : <Package size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs">طلب {order.restaurantName || 'خارجي'}</h4>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${
                        order.status === 'delivered' ? 'bg-green-500/10 text-green-600' :
                        order.status === 'on_the_way' ? 'bg-primary/10 text-primary animate-pulse' :
                        'bg-background border border-border text-text-muted'
                      }`}>
                        {order.status === 'pending' ? 'بانتظار التأكيد' :
                         order.status === 'preparing' ? 'جاري التحضير' :
                         order.status === 'on_the_way' ? 'في الطريق' :
                         order.status === 'delivered' ? 'تم الوصول' : 'ملغي'}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5 font-mono">
                      {new Date(order.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs font-black text-text">{formatCurrency(order.total + order.deliveryFee)}</p>
                  </div>
                  <ChevronRight size={14} className="text-text-muted group-hover:translate-x-[-2px] transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}


      {/* District Selector & Search */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <button 
            className="w-full flex items-center gap-2 text-text font-bold bg-surface px-4 py-3 rounded-2xl border border-border shadow-sm active:scale-95 transition-all"
            onClick={() => setShowDistricts(!showDistricts)}
          >
            <MapPin size={18} className="text-primary" />
            <span className="font-display flex-1 text-right">{selectedDistrict}</span>
            <ChevronDown size={14} className={`transition-transform text-text-muted ${showDistricts ? 'rotate-180' : ''}`} />
          </button>

          {showDistricts && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDistricts(false)} />
              <div className="absolute top-full mt-2 w-full bg-surface border border-border rounded-2xl shadow-2xl z-20 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
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

        <div className="relative group">
          <input 
            type="text"
            placeholder="ابحث عن مطعم، أكلة، أو عرض..."
            className="w-full bg-surface border border-border p-4 pr-12 rounded-[2rem] text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
            <Search size={20} />
          </div>
        </div>
        {searchQuery && (
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-2" />
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
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-20 text-text-muted font-medium">لا توجد نتائج بحث تطابق طلبك</div>
        ) : (
          filteredRestaurants.map((restaurant) => {
            const closed = checkIsClosed(restaurant.workingHours);
            const hasCustomLogo = restaurant.logo && !restaurant.logo.includes('picsum.photos');
            
            return (
              <div key={restaurant.id} className="relative group">
                <Link 
                  to={`/restaurant/${restaurant.id}`}
                  className="block"
                >
                  <div className={`bg-surface border border-border rounded-[2.5rem] p-4 flex gap-4 transition-all active:scale-[0.98] hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 ${closed ? 'opacity-60 grayscale' : ''}`}>
                    <div className="relative w-24 h-24 shrink-0 rounded-3xl overflow-hidden bg-primary/5 border border-border/50">
                      {!hasCustomLogo && platformConfig?.platformLogo ? (
                        <img 
                          src={platformConfig.platformLogo}
                          alt="Fallback logo"
                          className="w-full h-full object-contain p-4 opacity-20 filter grayscale"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <img 
                          src={restaurant.logo || "https://picsum.photos/seed/food/200/200"} 
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
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
                </Link>

                {/* Favorite Toggle Button */}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(restaurant.id);
                  }}
                  className={`absolute top-6 left-6 p-2 rounded-full backdrop-blur-md transition-all active:scale-90 ${
                    isFavorite(restaurant.id) 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                      : 'bg-white/80 dark:bg-black/50 text-text-muted border border-border hover:text-red-500'
                  }`}
                >
                  <Heart size={16} fill={isFavorite(restaurant.id) ? "currentColor" : "none"} />
                </button>

                {closed && (
                  <Link to={`/restaurant/${restaurant.id}`} className="absolute inset-0 bg-background/40 rounded-[2.5rem] flex items-center justify-center backdrop-blur-sm transition-opacity">
                    <span className="bg-red-500 text-white px-5 py-2 rounded-2xl font-black text-sm shadow-xl">مغلق مؤقتاً</span>
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
