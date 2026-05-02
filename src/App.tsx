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
import { db } from './lib/firebase';
import { doc, onSnapshot, query, collection, where, orderBy, limit } from 'firebase/firestore';

const GlobalNotificationListener = () => {
  const { user } = useAuth();
  const lastStatuses = React.useRef<Record<string, string>>({});
  const isAdminInitialLoad = React.useRef(true);

  React.useEffect(() => {
    if (!user) return;

    const playStatusSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.play().catch(e => console.log('Autoplay blocked:', e));
    };

    const playNewOrderSound = () => {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Autoplay blocked:', e));
    };

    // Client listener for status updates
    let unsubClient: () => void = () => {};
    if (user.role !== 'admin') {
      const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
      unsubClient = onSnapshot(q, (snap) => {
        snap.docChanges().forEach(change => {
          const data = change.doc.data();
          if (change.type === 'modified') {
            if (lastStatuses.current[change.doc.id] && lastStatuses.current[change.doc.id] !== data.status) {
              playStatusSound();
            }
          }
          lastStatuses.current[change.doc.id] = data.status;
        });
      });
    }

    // Admin listener for new orders
    let unsubAdmin: () => void = () => {};
    if (user?.role === 'admin') {
      const qAdmin = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(1));
      unsubAdmin = onSnapshot(qAdmin, (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            if (!isAdminInitialLoad.current) {
              playNewOrderSound();
            }
          }
        });
        isAdminInitialLoad.current = false;
      });
    }

    return () => {
      unsubClient();
      unsubAdmin();
    };
  }, [user]);

  return null;
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

      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-surface/80 backdrop-blur-xl border-t border-border flex items-center justify-around px-4 z-40">
        <NavLink to="/" icon={<Home size={24} />} label="الرئيسية" active={pathname === '/'} />
        <NavLink to="/search" icon={<Search size={24} />} label="بحث" active={pathname === '/search'} />
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

const Header = ({ logo, name }: { logo: string, name: string }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-border/50">
      <Link to="/" className="flex items-center gap-3">
        {logo && (
          <img src={logo} alt="Logo" className="h-10 w-auto max-w-[120px] object-contain drop-shadow-sm" referrerPolicy="no-referrer" />
        )}
        <div className="flex flex-col -space-y-1">
          <h1 className="text-xl font-black tracking-tight text-primary font-display whitespace-nowrap">{name}</h1>
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
        <button className="w-9 h-9 rounded-[14px] bg-surface border border-border flex items-center justify-center text-text-muted">
          <Bell size={18} />
        </button>
        {user?.role === 'admin' && (
          <Link to="/admin" className="h-9 px-3 rounded-[14px] bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-white text-[10px] font-black">مدير</Link>
        )}
      </div>
    </header>
  );
}

export default function App() {
  const [platformLogo, setPlatformLogo] = React.useState('');
  const [platformName, setPlatformName] = React.useState('توصيل بلس');

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.platformLogo) setPlatformLogo(data.platformLogo);
        if (data.platformName) setPlatformName(data.platformName);
      }
    });
    return () => unsub();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalNotificationListener />
        <CartProvider>
          <BrowserRouter>
            <div className="min-h-screen pb-32 bg-background transition-colors duration-300">
              <Header logo={platformLogo} name={platformName} />
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
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
