import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { User, MapPin, Phone, LogOut, ChevronLeft, Package, UserCircle, Edit2, Check, X } from 'lucide-react';
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

function LocationMarker({ position, setPosition }: { position: L.LatLngExpression, setPosition: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editData, setEditData] = useState({
    phone: '',
    address: '',
    lat: 12.825,
    lng: 44.985
  });

  useEffect(() => {
    if (user) {
      setEditData({
        phone: user.phone || '',
        address: user.address || '',
        lat: user.location?.lat || 12.825,
        lng: user.location?.lng || 44.985
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        phone: editData.phone,
        address: editData.address,
        location: {
          lat: editData.lat,
          lng: editData.lng
        }
      });
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center">جاري التحميل...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6">
        <UserCircle size={80} className="text-gray-600" />
        <h2 className="text-xl font-bold">لم تقم بتسجيل الدخول بعد</h2>
        <button onClick={() => navigate('/auth')} className="btn-primary w-full max-w-xs">تسجيل الدخول / إنشاء حساب</button>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-6 pb-24">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-black text-2xl shadow-primary-sm">
            {user.name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
        </div>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="w-10 h-10 bg-surface rounded-full flex items-center justify-center text-primary"
          >
            <Edit2 size={18} />
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="w-10 h-10 bg-surface rounded-full flex items-center justify-center text-gray-500"
            >
              <X size={18} />
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary"
            >
              <Check size={18} />
            </button>
          </div>
        )}
      </div>

      {!isEditing ? (
        <div className="dark-card space-y-6">
          <h3 className="font-bold flex items-center gap-2 border-b border-border/50 pb-2 text-primary">
            <User size={18} />
            معلومات الحساب
          </h3>
          <ProfileItem icon={<Phone size={18} />} label="رقم الهاتف" value={user.phone} />
          <ProfileItem icon={<MapPin size={18} />} label="العنوان الحالي" value={user.address || 'لم يتم التحديد'} />
          
          <div className="pt-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3 flex items-center justify-between">
              <span>موقعك المسجل</span>
              <span className="font-mono opacity-50">{user.location?.lat.toFixed(4)}, {user.location?.lng.toFixed(4)}</span>
            </p>
            <div className="h-48 rounded-3xl overflow-hidden border border-border shadow-inner">
               <MapContainer center={[user.location?.lat || 12.825, user.location?.lng || 44.985]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} touchZoom={false} doubleClickZoom={false} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[user.location?.lat || 12.825, user.location?.lng || 44.985]} />
              </MapContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="dark-card space-y-6">
          <h3 className="font-bold flex items-center gap-2 border-b border-border/50 pb-2 text-primary">
            <Edit2 size={18} />
            تعديل الملف الشخصي
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">رقم الهاتف</label>
              <input 
                className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                value={editData.phone}
                onChange={e => setEditData({...editData, phone: e.target.value})}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">العنوان (أقرب معلم)</label>
              <input 
                className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                value={editData.address}
                onChange={e => setEditData({...editData, address: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2 flex items-center gap-1">
                <MapPin size={10} /> تحديد الموقع الدقيق
              </label>
              <div className="h-48 rounded-xl overflow-hidden border border-border relative z-0">
                <MapContainer center={[editData.lat, editData.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationMarker 
                    position={[editData.lat, editData.lng]} 
                    setPosition={(pos) => setEditData({...editData, lat: pos.lat, lng: pos.lng})} 
                  />
                </MapContainer>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full btn-primary py-4"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      )}

      <div className="dark-card space-y-3">
        <h3 className="font-bold flex items-center gap-2 border-b border-border/50 pb-2 text-primary">
          <Package size={18} />
          طلباتي
        </h3>
        <div className="text-center py-6 text-gray-500 text-xs">
          لا توجد طلبات نشطة حالياً.
          <Link to="/" className="block text-primary font-bold mt-2">ابدأ الطلب الآن</Link>
        </div>
      </div>

      <button 
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-5 text-red-500 font-bold bg-red-500/10 rounded-2xl"
      >
        <LogOut size={20} />
        تسجيل الخروج
      </button>
    </div>
  );
}

const ProfileItem = ({ icon, label, value }: any) => (
  <div className="flex items-center gap-4">
    <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-gray-400">{icon}</div>
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold">{value || '---'}</p>
    </div>
  </div>
);
