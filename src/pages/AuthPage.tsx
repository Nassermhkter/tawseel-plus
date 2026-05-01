import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Phone, User, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }: { position: L.LatLngExpression, setPosition: (pos: L.LatLng) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  React.useEffect(() => {
    if (position) {
      const pos = position as [number, number];
      map.flyTo(pos, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    lat: 12.825,
    lng: 44.985
  });

  const translateError = (code: string) => {
    switch (code) {
      case 'auth/invalid-credential':
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.';
      case 'auth/email-already-in-use':
        return 'هذا البريد الإلكتروني مسجل مسبقاً.';
      case 'auth/weak-password':
        return 'كلمة المرور ضعيفة جداً.';
      case 'auth/user-not-found':
        return 'الحساب غير موجود. يرجى إنشاء حساب جديد.';
      default:
        return 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.';
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      handleSubmit(e);
    } else {
      setShowMap(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        
        const userData = {
          uid: firebaseUser.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          location: { lat: formData.lat, lng: formData.lng },
          role: 'customer',
          createdAt: serverTimestamp()
        };

        if (formData.email === 'admin@tawseel.com' || formData.email === 'hadirynasser@gmail.com') {
          userData.role = 'admin';
        }

        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      }
      
      const from = location.state?.from || '/';
      navigate(from);
    } catch (err: any) {
      setError(translateError(err.code || err.message));
      setShowMap(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-8 max-w-md mx-auto">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-4xl font-black text-primary tracking-tighter">توصيل بلس</h1>
        <p className="text-gray-400 text-sm font-medium">أفضل خدمة توصيل في عدن</p>
      </div>

      <div className="dark-card overflow-hidden">
        {!showMap ? (
          <>
            <div className="flex border-b border-border/50 mb-6">
              <button 
                className={`flex-1 py-4 font-bold text-sm transition-all ${isLogin ? 'text-primary' : 'text-gray-500 hover:text-gray-400'}`}
                onClick={() => setIsLogin(true)}
              >
                تسجيل الدخول
              </button>
              <button 
                className={`flex-1 py-4 font-bold text-sm transition-all ${!isLogin ? 'text-primary' : 'text-gray-500 hover:text-gray-400'}`}
                onClick={() => setIsLogin(false)}
              >
                حساب جديد
              </button>
            </div>

            <form onSubmit={handleNextStep} className="space-y-4">
              {!isLogin && (
                <>
                  <Input 
                    icon={<User size={18} />} 
                    placeholder="الاسم الكامل" 
                    value={formData.name} 
                    onChange={(v) => setFormData({...formData, name: v})} 
                  />
                  <Input 
                    icon={<Phone size={18} />} 
                    placeholder="رقم الهاتف" 
                    value={formData.phone} 
                    onChange={(v) => setFormData({...formData, phone: v})} 
                  />
                  <Input 
                    icon={<MapPin size={18} />} 
                    placeholder="أقرب معلم للعنوان" 
                    value={formData.address} 
                    onChange={(v) => setFormData({...formData, address: v})} 
                  />
                </>
              )}
              <Input 
                icon={<Mail size={18} />} 
                type="email" 
                placeholder="البريد الإلكتروني" 
                value={formData.email} 
                onChange={(v) => setFormData({...formData, email: v})} 
              />
              <Input 
                icon={<Lock size={18} />} 
                type="password" 
                placeholder="كلمة المرور" 
                value={formData.password} 
                onChange={(v) => setFormData({...formData, password: v})} 
              />

              {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
                {error.includes('غير صحيحة') && isLogin && (
                  <p className="text-[10px] opacity-70">ملاحظة: إذا كنت المدير، تأكد من "إنشاء حساب" أولاً بنفس البريد الرسمي.</p>
                )}
              </div>}

              <button 
                disabled={loading}
                className="w-full btn-primary text-sm shadow-primary-sm"
              >
                {loading ? 'جاري التحميل...' : (isLogin ? 'دخول' : 'المتابعة لتحديد الموقع')}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-lg flex items-center gap-2"><MapPin className="text-primary" size={20} /> حدد موقعك الدقيق</h3>
                <button 
                  type="button"
                  onClick={() => {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      setFormData({...formData, lat: pos.coords.latitude, lng: pos.coords.longitude});
                    });
                  }}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  تحديد موقعي
                </button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">يرجى الضغط على الخريطة لتحديد موقع منزلك بدقة لتسهيل وصول المندوب إليك.</p>
            </div>

            <div className="h-64 rounded-[2rem] overflow-hidden border border-border relative z-0 shadow-inner group">
              <MapContainer center={[formData.lat, formData.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker 
                  position={[formData.lat, formData.lng]} 
                  setPosition={(pos) => setFormData({...formData, lat: pos.lat, lng: pos.lng})} 
                />
              </MapContainer>
              <div className="absolute bottom-4 left-4 bg-surface/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-mono text-primary z-[1000] border border-border">
                {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowMap(false)}
                className="flex-1 btn-secondary py-4 text-xs"
              >
                رجوع
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] btn-primary py-4 text-xs flex items-center justify-center gap-2"
              >
                {loading ? 'جاري الإنشاء...' : <><CheckCircle2 size={16} /> تأكيد وإنشاء الحساب</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Input = ({ icon, type = "text", placeholder, value, onChange }: any) => (
  <div className="relative">
    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>
    <input 
      type={type}
      placeholder={placeholder}
      className="w-full bg-background border border-border rounded-xl py-3 pr-11 pl-4 text-sm focus:border-primary outline-none transition-all"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
    />
  </div>
);
