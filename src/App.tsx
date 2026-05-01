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
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import { useAuth } from './context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from './lib/utils';

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

const Header = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 py-5 flex items-center justify-between border-b border-border/50">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-primary font-display">توصيل بلس <span className="text-sm text-text-muted font-normal mr-1 font-sans">عدن</span></h1>
        <div className="flex items-center gap-1 text-[11px] text-text-muted mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          مباشر الآن
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-muted transition-all active:scale-90"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-muted">
          <Bell size={20} />
        </button>
        {user?.role === 'admin' && (
          <Link to="/admin" className="w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-white text-[10px] font-bold">ADM</Link>
        )}
      </div>
    </header>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <div className="min-h-screen pb-32 bg-background transition-colors duration-300">
              <Header />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/restaurant/:id" element={<RestaurantPage />} />
                <Route path="/cart" element={<CartPage />} />
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
