import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Restaurant, MenuCategory, MenuItem } from '../types';
import { Plus, Minus, ArrowRight, Share2, Info } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';

export default function RestaurantPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, items, updateQuantity } = useCart();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        const restDoc = await getDoc(doc(db, 'restaurants', id));
        if (restDoc.exists()) {
          setRestaurant({ id: restDoc.id, ...restDoc.data() } as Restaurant);
        }

        const catsSnap = await getDocs(collection(db, 'restaurants', id, 'categories'));
        const catsData = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuCategory[];
        setCategories(catsData);
        if (catsData.length > 0) setActiveCategory(catsData[0].id);

        const itemsSnap = await getDocs(collection(db, 'restaurants', id, 'items'));
        const itemsData = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuItem[];
        setMenuItems(itemsData);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `restaurants/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">جاري التحميل...</div>;
  if (!restaurant) return <div className="p-8 text-center text-red-500">لم يتم العثور على المطعم</div>;

  const filteredItems = menuItems.filter(item => item.categoryId === activeCategory);

  return (
    <div className="relative">
      {/* Hero Header */}
      <div className="h-64 relative">
        <img 
          src={restaurant.logo || "https://picsum.photos/seed/restaurant/800/400"}
          className="w-full h-full object-cover"
          alt={restaurant.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/20 to-transparent" />
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-full text-white"
        >
          <ArrowRight />
        </button>
      </div>

      <div className="px-4 -mt-12 relative z-10 space-y-6">
        <div className="bg-surface border border-border rounded-4xl p-6 shadow-xl transition-all">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-black text-text font-display">{restaurant.name}</h1>
            <div className="flex gap-2">
              <button className="p-2 bg-background border border-border rounded-xl text-text-muted hover:text-primary transition-colors"><Share2 size={18} /></button>
              <button className="p-2 bg-background border border-border rounded-xl text-text-muted hover:text-primary transition-colors"><Info size={18} /></button>
            </div>
          </div>
          <p className="text-text-muted text-sm mt-1 font-medium">{restaurant.district}</p>
        </div>

        {/* Categories Tab */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm border ${
                activeCategory === cat.id 
                  ? 'bg-primary text-white border-primary shadow-primary/20' 
                  : 'bg-surface text-text-muted border-border'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="grid gap-4">
          {filteredItems.map(item => {
            const cartItem = items.find(i => i.id === item.id);
            return (
              <div key={item.id} className="bg-surface border border-border rounded-4xl p-3 flex gap-4 transition-all hover:border-primary/20 group">
                <img 
                  src={item.image || "https://picsum.photos/seed/fooditem/200/200"}
                  className="w-24 h-24 rounded-3xl object-cover shadow-inner"
                  alt={item.name}
                />
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-bold text-text font-display">{item.name}</h4>
                    <p className="text-[11px] text-text-muted line-clamp-2 mt-0.5 leading-relaxed">{item.description}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-primary font-black text-lg">{formatCurrency(item.price)}</span>
                    <div className="flex items-center gap-3">
                      {cartItem ? (
                        <div className="flex items-center gap-2 bg-background rounded-2xl p-1 border border-border">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center text-primary hover:bg-primary/5 transition-all"><Minus size={16} /></button>
                          <span className="font-bold text-sm w-4 text-center text-text">{cartItem.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-90 transition-all"><Plus size={16} /></button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addItem({ ...item, quantity: 1 })}
                          className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-90"
                        >
                          <Plus size={24} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
