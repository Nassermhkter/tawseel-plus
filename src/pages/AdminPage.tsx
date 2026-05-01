import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Store, Utensils, Settings, LayoutGrid, Database, MapPin, Trash2, AlertTriangle } from 'lucide-react';
import { Restaurant, MenuCategory } from '../types';
import { seedDatabase } from '../lib/seed';
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
if (L.Marker.prototype.options) {
  L.Marker.prototype.options.icon = DefaultIcon;
}

function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (pos: { lat: number, lng: number }) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  useEffect(() => {
    map.flyTo(position, map.getZoom());
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('restaurants');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    image: ''
  });
  const [isSeeding, setIsSeeding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<MenuCategory | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any | null>(null);
  
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    district: 'المنصورة',
    logo: '',
    open: '08:00',
    close: '23:00',
    lat: 12.825,
    lng: 44.985
  });
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(null);

  const [config, setConfig] = useState({
    minOrder: 1000,
    deliveryFeeBase: 1500,
    deliveryFeePerKm: 300,
    deliveryFeeMax: 5000,
    whatsappNumber: '967733000000'
  });

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const snap = await getDocs(collection(db, 'restaurants'));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[];
        setRestaurants(data);
        if (data.length > 0 && !selectedRestaurantId) setSelectedRestaurantId(data[0].id);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'restaurants');
      }
    };
    if (isAdmin) fetchRestaurants();
  }, [isAdmin]);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedRestaurantId) return;
      try {
        const snap = await getDocs(collection(db, 'restaurants', selectedRestaurantId, 'categories'));
        setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuCategory[]);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `restaurants/${selectedRestaurantId}/categories`);
      }
    };
    if (activeTab === 'categories') fetchCategories();
  }, [activeTab, selectedRestaurantId]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!selectedRestaurantId) return;
      try {
        const snap = await getDocs(collection(db, 'restaurants', selectedRestaurantId, 'items'));
        setMenuItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `restaurants/${selectedRestaurantId}/items`);
      }
    };
    if (activeTab === 'menu') fetchMenuItems();
  }, [activeTab, selectedRestaurantId]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDocs(collection(db, 'config'));
        if (!snap.empty) {
          setConfig(snap.docs[0].data() as any);
        }
      } catch (err) {
        console.error('Config fetch failed', err);
      }
    };
    if (activeTab === 'config') fetchConfig();
  }, [activeTab]);

  if (!isAdmin) return <div className="p-12 text-center text-red-500 font-bold">غير مصرح لك بدخول هذه الصفحة</div>;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantId) return;
    try {
      const docRef = await addDoc(collection(db, 'restaurants', selectedRestaurantId, 'categories'), {
        name: newCategory.name,
        description: newCategory.description,
        order: categories.length
      });
      setNewCategory({ name: '', description: '' });
      // Refresh
      const snap = await getDocs(collection(db, 'restaurants', selectedRestaurantId, 'categories'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuCategory[];
      setCategories(data);
      if (!selectedCategoryId && data.length > 0) setSelectedCategoryId(data[0].id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `restaurants/${selectedRestaurantId}/categories`);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantId || !selectedCategoryId) {
      alert('الرجاء اختيار المطعم والتصنيف أولاً');
      return;
    }
    try {
      const itemData = {
        name: newMenuItem.name,
        description: newMenuItem.description,
        price: Number(newMenuItem.price),
        image: newMenuItem.image || "https://picsum.photos/seed/food/400",
        categoryId: selectedCategoryId,
        restaurantId: selectedRestaurantId,
        isAvailable: true
      };

      if (editingMenuItemId) {
        await setDoc(doc(db, 'restaurants', selectedRestaurantId, 'items', editingMenuItemId), itemData, { merge: true });
        alert('تم تحديث الوجبة بنجاح');
      } else {
        await addDoc(collection(db, 'restaurants', selectedRestaurantId, 'items'), itemData);
        alert('تم إضافة الوجبة بنجاح');
      }

      setNewMenuItem({ name: '', description: '', price: '', image: '' });
      setEditingMenuItemId(null);
      // Refresh
      const snap = await getDocs(collection(db, 'restaurants', selectedRestaurantId, 'items'));
      setMenuItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]);
    } catch (err) {
      handleFirestoreError(err, editingMenuItemId ? OperationType.UPDATE : OperationType.CREATE, editingMenuItemId ? `restaurants/${selectedRestaurantId}/items/${editingMenuItemId}` : `restaurants/${selectedRestaurantId}/items`);
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'config', 'general'), config);
      alert('تم حفظ الإعدادات');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'config/general');
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDatabase();
      // Refresh list
      const snap = await getDocs(collection(db, 'restaurants'));
      setRestaurants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[]);
      alert('تم استيراد البيانات التجريبية بنجاح');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'restaurants');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const restaurantData = {
        name: newRestaurant.name,
        district: newRestaurant.district,
        logo: newRestaurant.logo || "https://picsum.photos/seed/food/400",
        workingHours: { open: newRestaurant.open, close: newRestaurant.close },
        location: { lat: newRestaurant.lat, lng: newRestaurant.lng },
        rating: 4.5,
        isVerified: true
      };

      if (editingRestaurantId) {
        await setDoc(doc(db, 'restaurants', editingRestaurantId), restaurantData, { merge: true });
        alert('تم تحديث المطعم بنجاح');
      } else {
        await addDoc(collection(db, 'restaurants'), restaurantData);
        alert('تم إضافة المطعم بنجاح');
      }

      setNewRestaurant({
        name: '',
        district: 'المنصورة',
        logo: '',
        open: '08:00',
        close: '23:00',
        lat: 12.825,
        lng: 44.985
      });
      setEditingRestaurantId(null);
      // Refresh list
      const snap = await getDocs(collection(db, 'restaurants'));
      setRestaurants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[]);
    } catch (err) {
      handleFirestoreError(err, editingRestaurantId ? OperationType.UPDATE : OperationType.CREATE, editingRestaurantId ? `restaurants/${editingRestaurantId}` : 'restaurants');
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'restaurants', id));
      setRestaurants(restaurants.filter(r => r.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `restaurants/${id}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!selectedRestaurantId) return;
    try {
      await deleteDoc(doc(db, 'restaurants', selectedRestaurantId, 'categories', id));
      setCategories(categories.filter(c => c.id !== id));
      setDeleteConfirmCategory(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `restaurants/${selectedRestaurantId}/categories/${id}`);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!selectedRestaurantId) return;
    try {
      await deleteDoc(doc(db, 'restaurants', selectedRestaurantId, 'items', id));
      setMenuItems(menuItems.filter(i => i.id !== id));
      setDeleteConfirmItem(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `restaurants/${selectedRestaurantId}/items/${id}`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row-reverse min-h-[calc(100vh-160px)] gap-6">
      {/* Sidebar Navigation */}
      <aside className="lg:w-64 flex-shrink-0">
        <div className="sticky top-24 space-y-2">
          <div className="hidden lg:block mb-6 px-4">
            <h2 className="text-xl font-black text-text px-2">لوحة التحكم</h2>
            <p className="text-[10px] text-text-muted px-2 uppercase tracking-widest mt-1">إدارة النظام</p>
          </div>
          
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide px-1">
            <AdminNavLink 
              icon={<Store size={20} />} 
              label="المطاعم" 
              active={activeTab === 'restaurants'} 
              onClick={() => setActiveTab('restaurants')} 
            />
            <AdminNavLink 
              icon={<Utensils size={20} />} 
              label="الأطعمة" 
              active={activeTab === 'menu'} 
              onClick={() => setActiveTab('menu')} 
            />
            <AdminNavLink 
              icon={<LayoutGrid size={20} />} 
              label="التصنيفات" 
              active={activeTab === 'categories'} 
              onClick={() => setActiveTab('categories')} 
            />
            <AdminNavLink 
              icon={<Settings size={20} />} 
              label="الإعدادات" 
              active={activeTab === 'config'} 
              onClick={() => setActiveTab('config')} 
            />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-6 pb-20">
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <div className="dark-card space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2 tracking-tight">إدارة الواجهة</h3>
                <button 
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="bg-surface border border-border p-3 rounded-xl text-xs font-bold text-primary flex items-center gap-2 hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  <Database size={14} />
                  {isSeeding ? 'جاري الاستيراد...' : 'استيراد بيانات تجريبية'}
                </button>
              </div>
            </div>

            <div className="dark-card space-y-4" id="restaurant-form">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2 tracking-tight">
                  {editingRestaurantId ? <Settings size={18} className="text-primary" /> : <Plus size={18} className="text-primary" />} 
                  {editingRestaurantId ? 'تعديل المطعم' : 'إضافة مطعم جديد'}
                </h3>
                {editingRestaurantId && (
                  <button 
                    onClick={() => {
                      setEditingRestaurantId(null);
                      setNewRestaurant({
                        name: '',
                        district: 'المنصورة',
                        logo: '',
                        open: '08:00',
                        close: '23:00',
                        lat: 12.825,
                        lng: 44.985
                      });
                    }}
                    className="text-[10px] text-gray-500 hover:text-primary transition-colors"
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>
              <form onSubmit={handleAddRestaurant} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">اسم المطعم</label>
                  <input 
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                    placeholder="مطعم حضرموت..." 
                    value={newRestaurant.name}
                    onChange={e => setNewRestaurant({...newRestaurant, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">المديرية</label>
                  <select 
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm outline-none focus:border-primary/50 transition-all appearance-none"
                    value={newRestaurant.district}
                    onChange={e => setNewRestaurant({...newRestaurant, district: e.target.value})}
                  >
                    {['صيرة (كريتر)', 'المعلا', 'التواهي', 'خورمكسر', 'المنصورة', 'الشيخ عثمان', 'دار سعد', 'البريقة'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">رابط الشعار</label>
                  <input 
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                    placeholder="https://..." 
                    value={newRestaurant.logo}
                    onChange={e => setNewRestaurant({...newRestaurant, logo: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">وقت الفتح</label>
                  <input 
                    type="time"
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                    value={newRestaurant.open}
                    onChange={e => setNewRestaurant({...newRestaurant, open: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">وقت الإغلاق</label>
                  <input 
                    type="time"
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm outline-none focus:border-primary/50 transition-all"
                    value={newRestaurant.close}
                    onChange={e => setNewRestaurant({...newRestaurant, close: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      <MapPin size={10} /> تحديد موقع المطعم على الخريطة
                    </label>
                    <button 
                      type="button"
                      onClick={() => {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setNewRestaurant({...newRestaurant, lat: pos.coords.latitude, lng: pos.coords.longitude});
                        });
                      }}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      تحديد موقعي الحالي
                    </button>
                  </div>
                  <div className="h-64 rounded-[2rem] overflow-hidden border border-border relative z-0 shadow-inner">
                    <MapContainer center={[newRestaurant.lat, newRestaurant.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationMarker 
                        position={[newRestaurant.lat, newRestaurant.lng]} 
                        setPosition={(pos) => setNewRestaurant({...newRestaurant, lat: pos.lat, lng: pos.lng})} 
                      />
                    </MapContainer>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <div className="flex gap-4 text-[10px] font-mono text-gray-500">
                      <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Lat: {newRestaurant.lat.toFixed(6)}</span>
                      <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Lng: {newRestaurant.lng.toFixed(6)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 italic">انقر لتغيير الموقع</p>
                  </div>
                </div>

                <button className="md:col-span-2 btn-primary py-4 text-sm mt-2">
                  {editingRestaurantId ? 'تحديث بيانات المطعم' : 'حفظ المطعم'}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end px-2">
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest">المطاعم المسجلة ({restaurants.length})</h3>
                <button className="text-[10px] text-primary font-bold">عرض الكل</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {restaurants.map(r => (
                  <div key={r.id} className="dark-card flex justify-between items-center group hover:border-primary/30 transition-all cursor-pointer">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 bg-background rounded-xl overflow-hidden border border-border">
                        <img src={r.logo} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{r.name}</p>
                        <p className="text-gray-500 text-[10px]">{r.district}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRestaurantId(r.id);
                          setNewRestaurant({
                            name: r.name,
                            district: r.district,
                            logo: r.logo || '',
                            open: r.workingHours?.open || '08:00',
                            close: r.workingHours?.close || '23:00',
                            lat: r.location?.lat || 12.825,
                            lng: r.location?.lng || 44.985
                          });
                          document.getElementById('restaurant-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="p-2 bg-surface rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all border border-border/50"
                      >
                        <Settings size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(r.id);
                        }}
                        className="p-2 bg-surface rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all border border-border/50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-surface max-w-sm w-full rounded-3xl p-6 border border-border shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-center mb-2">تأكيد الحذف</h3>
                  <p className="text-gray-400 text-center text-sm mb-6 leading-relaxed">
                    هل أنت متأكد من رغبتك في حذف هذا المطعم؟ سيتم حذف جميع البيانات المتعلقة به ولا يمكن التراجع عن هذا الإجراء.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setDeleteConfirmId(null)}
                      className="btn-secondary py-3 text-sm"
                    >
                      إلغاء
                    </button>
                    <button 
                      onClick={() => handleDeleteRestaurant(deleteConfirmId)}
                      className="bg-red-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                      تأكيد الحذف
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="dark-card space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-primary tracking-tight">إدارة التصنيفات</h3>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">اختر المطعم</label>
                <select 
                  className="w-full bg-background border border-border p-4 rounded-xl text-sm outline-none focus:border-primary/50"
                  value={selectedRestaurantId}
                  onChange={e => setSelectedRestaurantId(e.target.value)}
                >
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div className="dark-card space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Plus size={18} className="text-primary" /> إضافة تصنيف جديد</h3>
              <form onSubmit={handleAddCategory} className="space-y-3">
                <input 
                  className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                  placeholder="اسم التصنيف (مثل: مشاوي، برجر...)" 
                  value={newCategory.name}
                  onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                  required
                />
                <input 
                  className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                  placeholder="وصف التصنيف (اختياري)" 
                  value={newCategory.description}
                  onChange={e => setNewCategory({...newCategory, description: e.target.value})}
                />
                <button className="w-full btn-primary py-4 text-sm mt-2">إضافة التصنيف</button>
              </form>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-gray-400 text-xs px-2 uppercase tracking-widest">التصنيفات الحالية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map(c => (
                  <div key={c.id} className="dark-card flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">{c.name}</p>
                      <p className="text-[10px] text-gray-500">{c.description || 'لا يوجد وصف'}</p>
                    </div>
                    <button 
                      onClick={() => setDeleteConfirmCategory(c)}
                      className="text-red-500/50 hover:text-red-500 p-2"
                    >
                      <Plus className="rotate-45" size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete Category Confirmation Modal */}
            {deleteConfirmCategory && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-surface max-w-sm w-full rounded-3xl p-6 border border-border shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-center mb-2">تأكيد حذف التصنيف</h3>
                  <p className="text-gray-400 text-center text-sm mb-6 leading-relaxed">
                    هل أنت متأكد من رغبتك في حذف تصنيف "{deleteConfirmCategory.name}"؟ لن يتم حذف الأطعمة المرتبطة به تلقائياً ولكنها قد تفقد تصنيفها.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setDeleteConfirmCategory(null)} className="btn-secondary py-3 text-sm">إلغاء</button>
                    <button onClick={() => handleDeleteCategory(deleteConfirmCategory.id)} className="bg-red-500 text-white font-bold py-3 rounded-xl text-sm">تأكيد الحذف</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="dark-card space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-primary tracking-tight">إعدادات النظام</h3>
              <form onSubmit={handleUpdateConfig} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest mr-2">رقم الواتساب الخاص بالطلبات</label>
                  <input 
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm font-mono"
                    placeholder="967733..." 
                    value={config.whatsappNumber}
                    onChange={e => setConfig({...config, whatsappNumber: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest mr-2">سعر التوصيل الأساسي (YER)</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                      value={config.deliveryFeeBase}
                      onChange={e => setConfig({...config, deliveryFeeBase: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest mr-2">سعر الكيلومتر (YER)</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                      value={config.deliveryFeePerKm}
                      onChange={e => setConfig({...config, deliveryFeePerKm: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest mr-2">أقصى مبلغ للتوصيل (YER)</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                      value={config.deliveryFeeMax}
                      onChange={e => setConfig({...config, deliveryFeeMax: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest mr-2">أقل سعر للطلب (YER)</label>
                    <input 
                      type="number"
                      className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                      value={config.minOrder}
                      onChange={e => setConfig({...config, minOrder: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <button className="w-full btn-primary py-4 text-sm">حفظ الإعدادات</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="dark-card space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-primary tracking-tight">إدارة الأطعمة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">المطعم</label>
                  <select 
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm outline-none focus:border-primary/50"
                    value={selectedRestaurantId}
                    onChange={e => setSelectedRestaurantId(e.target.value)}
                  >
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">التصنيف</label>
                  <select 
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm outline-none focus:border-primary/50"
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                  >
                    <option value="">اختر التصنيف...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="dark-card space-y-4" id="item-form">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  {editingMenuItemId ? <Settings size={18} className="text-primary" /> : <Plus size={18} className="text-primary" />} 
                  {editingMenuItemId ? 'تعديل الوجبة' : 'إضافة وجبة جديدة'}
                </h3>
                {editingMenuItemId && (
                  <button 
                    onClick={() => {
                      setEditingMenuItemId(null);
                      setNewMenuItem({ name: '', description: '', price: '', image: '' });
                    }}
                    className="text-[10px] text-gray-500 hover:text-primary transition-colors"
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>
              <form onSubmit={handleAddMenuItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">اسم الوجبة</label>
                  <input 
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                    placeholder="مثل: برجر لحم دبل..." 
                    value={newMenuItem.name}
                    onChange={e => setNewMenuItem({...newMenuItem, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">السعر (YER)</label>
                  <input 
                    type="number"
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                    value={newMenuItem.price}
                    onChange={e => setNewMenuItem({...newMenuItem, price: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mr-2">وصف الوجبة</label>
                  <input 
                    className="w-full bg-background border border-border p-4 rounded-xl text-sm"
                    placeholder="مكونات الوجبة..." 
                    value={newMenuItem.description}
                    onChange={e => setNewMenuItem({...newMenuItem, description: e.target.value})}
                  />
                </div>
                <button className="md:col-span-2 btn-primary py-4 text-sm mt-2">
                  {editingMenuItemId ? 'تحديث الوجبة' : 'إضافة الوجبة'}
                </button>
              </form>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-gray-400 text-xs px-2 uppercase tracking-widest">الوجبات الحالية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {menuItems.filter(i => !selectedCategoryId || i.categoryId === selectedCategoryId).map(item => (
                  <div key={item.id} className="dark-card flex justify-between items-center group">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 bg-background rounded-xl overflow-hidden border border-border">
                        <img src={item.image} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-primary text-[10px] font-mono">{item.price} YER</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingMenuItemId(item.id);
                          setNewMenuItem({
                            name: item.name,
                            description: item.description || '',
                            price: item.price.toString(),
                            image: item.image || ''
                          });
                          document.getElementById('item-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="p-2 bg-surface rounded-lg text-text-muted hover:text-primary transition-all border border-border/50"
                      >
                        <Settings size={16} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmItem(item)}
                        className="p-2 bg-surface rounded-lg text-text-muted hover:text-red-500 transition-all border border-border/50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete Item Confirmation Modal */}
            {deleteConfirmItem && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-surface max-w-sm w-full rounded-3xl p-6 border border-border shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-center mb-2">تأكيد حذف الوجبة</h3>
                  <p className="text-gray-400 text-center text-sm mb-6 leading-relaxed">
                    هل أنت متأكد من رغبتك في حذفوجبة "{deleteConfirmItem.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setDeleteConfirmItem(null)} className="btn-secondary py-3 text-sm">إلغاء</button>
                    <button onClick={() => handleDeleteItem(deleteConfirmItem.id)} className="bg-red-500 text-white font-bold py-3 rounded-xl text-sm">تأكيد الحذف</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const AdminNavLink = ({ icon, label, active, onClick }: any) => (
    <button 
    onClick={onClick}
    className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all whitespace-nowrap lg:w-full ${
      active 
        ? 'bg-primary text-white shadow-primary-sm' 
        : 'bg-surface text-text-muted hover:bg-background border border-border/50'
    }`}
  >
    <div className={`${active ? 'text-white' : 'text-primary'}`}>{icon}</div>
    <span className="text-sm font-bold font-display">{label}</span>
  </button>
)
