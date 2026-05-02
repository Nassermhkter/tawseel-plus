import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, Bell, Sun, Moon } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import RestaurantPage from './pages/RestaurantPage';
import CartPage from './pages/CartPage';
import SearchPage from './pages/SearchPage';
import TrackOrderPage from './pages/TrackOrderPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import { useAuth } from './context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from './lib/utils';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, onSnapshot, query, collection, where, orderBy, limit } from 'firebase/firestore';

const GlobalNotificationListener = () => {
  const { user, isAdmin } = useAuth();
  const [notification, setNotification] = React.useState<{ id: string; message: string; type: 'success' | 'info' | 'alert' } | null>(null);
  const lastStatuses = React.useRef<Record<string, string>>({});
  const isAdminInitialLoad = React.useRef(true);
  const isInitialLoad = React.useRef(true);

  React.useEffect(() => {
    isAdminInitialLoad.current = true;
    isInitialLoad.current = true;
    
    if (!user) return;

    const playStatusSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.play().catch(e => console.log('Autoplay blocked:', e));
    };

    const playNewOrderSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Autoplay blocked:', e));
    };

    const showToast = (message: string, type: 'success' | 'info' | 'alert') => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotification({ id, message, type });
      
      // Also save to a local notification history for the UI bell
      const stored = JSON.parse(localStorage.getItem('notification_history') || '[]');
      localStorage.setItem('notification_history', JSON.stringify([{ id, message, type, time: new Date().toISOString() }, ...stored].slice(0, 20)));
      window.dispatchEvent(new Event('notifications_updated'));

      // If browser permission is granted, show system notification
      if (Notification.permission === 'granted') {
        try {
          new Notification('توصيل بلس', { body: message, icon: '/logo.png' });
        } catch (e) {
          console.error('Error showing notification:', e);
        }
      }

      setTimeout(() => setNotification(curr => curr?.id === id ? null : curr), 2000);
    };

    // Request notification permission on mount if signed in
    if (user && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const statusTranslations: Record<string, string> = {
      'pending': 'جاري مراجعة طلبك',
      'confirmed': 'تم تأكيد طلبك',
      'preparing': 'طلبك قيد التجهيز الآن',
      'delivering': 'طلبك في الطريق إليك',
      'completed': 'تم توصيل طلبك بنجاح',
      'cancelled': 'نعتذر، تم إلغاء طلبك'
    };

    // Client listener
    let unsubClient: () => void = () => {};
    if (!isAdmin) {
      const q = query(collection(db, 'orders'), where('customerId', '==', user.uid));
      unsubClient = onSnapshot(q, (snap) => {
        snap.docChanges().forEach(change => {
          const data = change.doc.data();
          if (change.type === 'added') {
            lastStatuses.current[change.doc.id] = data.status;
          }
          if (change.type === 'modified') {
            if (lastStatuses.current[change.doc.id] && lastStatuses.current[change.doc.id] !== data.status) {
              playStatusSound();
              showToast(`تحديث الطلب: ${statusTranslations[data.status] || data.status}`, 'success');
            }
          }
          lastStatuses.current[change.doc.id] = data.status;
        });
        isInitialLoad.current = false;
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });
    }

    // Admin listener
    let unsubAdmin: () => void = () => {};
    if (isAdmin) {
      const qAdmin = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
      unsubAdmin = onSnapshot(qAdmin, (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added' && !isAdminInitialLoad.current) {
            playNewOrderSound();
            showToast('لديك طلب جديد!', 'alert');
          }
        });
        isAdminInitialLoad.current = false;
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });
    }

    return () => {
      unsubClient();
      unsubAdmin();
    };
  }, [user, isAdmin]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 20, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-20 left-4 right-4 z-[100] flex justify-center pointer-events-none"
        >
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border pointer-events-auto ${
            notification.type === 'alert' ? 'bg-red-500 text-white border-red-600' : 
            notification.type === 'success' ? 'bg-green-500 text-white border-green-600' :
            'bg-surface text-text border-border'
          }`}>
            <Bell size={20} className={notification.type === 'info' ? 'text-primary' : ''} />
            <span className="font-bold text-sm tracking-tight">{notification.message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Navigation = () => {
  const { count, total } = useCart();
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <>
      <AnimatePresence>
        {count > 0 && pathname !== '/cart' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 z-50"
          >
            <Link 
              to="/cart"
              className="bg-primary text-white px-6 py-5 rounded-[2rem] flex justify-between items-center shadow-2xl shadow-primary/30 font-bold"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black text-lg">{count}</div>
                <span className="text-lg">عرض السلة</span>
              </div>
              <span className="text-xl font-mono">{formatCurrency(total)}</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-surface/80 backdrop-blur-xl border-t border-border flex items-center justify-around px-10 z-40">
        <NavLink to="/" icon={<Home size={24} />} label="الرئيسية" active={pathname === '/'} />
        <NavLink to="/cart" icon={<div className="relative"><ShoppingBag size={24} />{count > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-black text-[10px] flex items-center justify-center rounded-full font-bold">{count}</span>}</div>} label="السلة" active={pathname === '/cart'} />
        <NavLink to="/profile" icon={<User size={24} />} label="حسابي" active={pathname === '/profile'} />
      </nav>
    </>
  );
};

const NavLink = ({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) => (
  <Link to={to} className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-primary' : 'text-gray-400'}`}>
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </Link>
);

interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'alert';
  time: string;
}

const Header = ({ logo, name, isClosed }: { logo: string, name: string, isClosed: boolean }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const loadNotifications = React.useCallback(() => {
    const history = JSON.parse(localStorage.getItem('notification_history') || '[]');
    setNotifications(history);
    setUnreadCount(history.length);
  }, []);

  React.useEffect(() => {
    loadNotifications();
    window.addEventListener('notifications_updated', loadNotifications);
    return () => window.removeEventListener('notifications_updated', loadNotifications);
  }, [loadNotifications]);

  const clearNotifications = () => {
    localStorage.removeItem('notification_history');
    setNotifications([]);
    setUnreadCount(0);
  };
  
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-border/50">
      <Link to="/" className="flex items-center gap-3">
        <div className="relative group p-1 rounded-xl bg-white/5 dark:bg-white/10">
          {logo && (
            <img src={logo} alt="Logo" className="h-10 w-auto max-w-[150px] object-contain drop-shadow-sm transition-all dark:brightness-110" referrerPolicy="no-referrer" />
          )}
        </div>
        <div className="flex flex-col -space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-primary font-display whitespace-nowrap">{name}</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isClosed ? 'bg-red-500 shadow-red-500/50' : 'bg-green-500 shadow-green-500/50 animate-pulse'}`} />
              {isClosed && <span className="text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-md font-bold border border-red-500/20">مغلق</span>}
            </div>
          </div>
          <span className="text-[10px] text-text-muted font-bold font-sans tracking-wide">عدن</span>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <button 
          onClick={toggleTheme}
          className="w-9 h-9 rounded-[14px] bg-surface border border-border flex items-center justify-center text-text-muted transition-all active:scale-90"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-[14px] bg-surface border border-border flex items-center justify-center text-text-muted relative transition-all active:scale-90"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border border-white dark:border-black text-[8px] text-white items-center justify-center font-black">
                  {unreadCount > 9 ? '+9' : unreadCount}
                </span>
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowNotifications(false)}
                  className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20 backdrop-blur-xs"
                />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute left-0 mt-3 w-72 bg-surface border border-border rounded-3xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
                    <span className="font-bold text-sm">الإشعارات</span>
                    <button onClick={clearNotifications} className="text-[10px] text-red-500 font-bold hover:underline">مسح الكل</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2 scrollbar-hide">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-text-muted text-xs">لا توجد إشعارات حالياً</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3 mb-2 rounded-2xl bg-background/50 border border-border/50 flex gap-3">
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            n.type === 'alert' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'
                          }`}>
                            <Bell size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text leading-tight truncate-2-lines">{n.message}</p>
                            <p className="text-[9px] text-text-muted mt-1 uppercase font-mono">{new Date(n.time).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {user?.role === 'admin' && (
          <Link to="/admin" className="h-9 px-3 rounded-[14px] bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-white text-[10px] font-black">مدير</Link>
        )}
      </div>
    </header>
  );
}

const AppContent = ({ platformLogo, platformName, isPlatformClosed, businessHours }: { 
  platformLogo: string, 
  platformName: string, 
  isPlatformClosed: boolean, 
  businessHours: { opening: string, closing: string } 
}) => {
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen pb-32 bg-background transition-colors duration-300">
      <Header logo={platformLogo} name={platformName} isClosed={isPlatformClosed} />
      
      <AnimatePresence>
        {isPlatformClosed && !isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-8 animate-pulse">
              <ShoppingBag size={64} className="text-primary opacity-40" />
            </div>
            <h2 className="text-3xl font-black text-text mb-4 font-display">طلبات التوصيل مغلقة حالياً</h2>
            <p className="text-text-muted mb-8 leading-relaxed max-w-md">
              نعتذر لكم، انتهى وقت الدوام الرسمي للمنصة. نعمل يومياً من الساعة <span className="font-bold text-primary font-mono">{businessHours.opening}</span> صباحاً وحتى الساعة <span className="font-bold text-primary font-mono">{businessHours.closing}</span> فجراً.
            </p>
            <div className="bg-surface border border-border p-4 rounded-3xl mb-12">
              <span className="text-sm font-bold text-red-500">الحالة الحالية: مغلق الآن</span>
            </div>
            <p className="text-[10px] text-text-muted uppercase tracking-widest">توصيل بلس - خدمتكم غايتنا</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/restaurant/:id" element={<RestaurantPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/track-order/:orderId" element={<TrackOrderPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Routes>
      <Navigation />
    </div>
  );
};

export default function App() {
  const [platformLogo, setPlatformLogo] = React.useState('');
  const [platformName, setPlatformName] = React.useState('توصيل بلس');
  const [isPlatformClosed, setIsPlatformClosed] = React.useState(false);
  const [businessHours, setBusinessHours] = React.useState({ opening: '10:00', closing: '03:00' });
  const [platformStatusOverride, setPlatformStatusOverride] = React.useState('open');

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.platformLogo) setPlatformLogo(data.platformLogo);
        if (data.platformName) setPlatformName(data.platformName);
        if (data.openingTime && data.closingTime) {
          setBusinessHours({ opening: data.openingTime, closing: data.closingTime });
        }
        if (data.platformStatus) {
          setPlatformStatusOverride(data.platformStatus);
        }
      }
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    const checkStatus = () => {
      // If manually closed or in maintenance, it's closed
      if (platformStatusOverride === 'closed' || platformStatusOverride === 'maintenance') {
        setIsPlatformClosed(true);
        return;
      }

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [openH, openM] = businessHours.opening.split(':').map(Number);
      const [closeH, closeM] = businessHours.closing.split(':').map(Number);
      
      const openTime = openH * 60 + openM;
      let closeTime = closeH * 60 + closeM;

      // Handle overlap (e.g., 03:00 is next day)
      if (closeTime < openTime) {
        if (currentTime >= openTime || currentTime < closeTime) {
          setIsPlatformClosed(false);
        } else {
          setIsPlatformClosed(true);
        }
      } else {
        if (currentTime >= openTime && currentTime < closeTime) {
          setIsPlatformClosed(false);
        } else {
          setIsPlatformClosed(true);
        }
      }
    };

    checkStatus();
    const timer = setInterval(checkStatus, 30000); // Check every 30s for more "real" feel
    return () => clearInterval(timer);
  }, [businessHours, platformStatusOverride]);

  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalNotificationListener />
        <CartProvider>
          <BrowserRouter>
            <AppContent 
              platformLogo={platformLogo} 
              platformName={platformName} 
              isPlatformClosed={isPlatformClosed}
              businessHours={businessHours}
            />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
