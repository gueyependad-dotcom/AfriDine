import React, { useState, useEffect } from 'react';
import { 
  MapPin, Phone, Instagram, Facebook, 
  ShoppingBag, Plus, Minus, Trash2, Settings, 
  ChefHat, LogOut, Upload, 
  ArrowRight, Menu as MenuIcon, X,
  Loader2, Lock, Image as ImageIcon,
  Smartphone, Wallet, QrCode, CheckCircle, Eye,
  Save, Star, Map, Globe, Clock, WifiOff, Pencil
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot
} from 'firebase/firestore';

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDoYircmqtmJoKOXEEC_fWd17Dn5b_6MDo",
  authDomain: "afridine-saas.firebaseapp.com",
  projectId: "afridine-saas",
  storageBucket: "afridine-saas.firebasestorage.app",
  messagingSenderId: "59634395704",
  appId: "1:59634395704:web:a6df0436109d5daff3d4cd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ID de l'application
const appId = "afridine-saas-prod"; 

// --- DEVISES UNIQUEMENT AFRICAINES ---
const AFRICAN_CURRENCIES = [
  { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (BCEAO)' },
  { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (BEAC)' },
  { code: 'MRU', symbol: 'UM', name: 'Ouguiya Mauritanien' },
  { code: 'GNF', symbol: 'FG', name: 'Franc Guinéen' },
  { code: 'MAD', symbol: 'DH', name: 'Dirham Marocain' },
  { code: 'DZD', symbol: 'DA', name: 'Dinar Algérien' },
  { code: 'TND', symbol: 'DT', name: 'Dinar Tunisien' },
  { code: 'EGP', symbol: 'E£', name: 'Livre Égyptienne' },
  { code: 'NGN', symbol: '₦', name: 'Naira Nigérian' },
  { code: 'GHS', symbol: 'GH₵', name: 'Cedi Ghanéen' },
  { code: 'KES', symbol: 'KSh', name: 'Shilling Kényan' },
  { code: 'CDF', symbol: 'FC', name: 'Franc Congolais' },
];

const DEFAULT_MENU = [
  {
    id: 'm1',
    name: "Thieboudienne Royal",
    description: "Riz wolof, mérou frais, légumes mijotés.",
    price: 3500,
    category: "Plats",
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&q=80&w=800"
  }
];

const DEFAULT_CONFIG = {
  name: "Nouveau Restaurant",
  address: "Adresse du resto",
  phone: "221770000000",
  currency: "XOF",
  pin: "1234",
  openingHours: "Ouvert 7j/7 • 10h - 23h",
  googleMapsLink: "",
  coverImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1600",
  logo: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=200",
  qrCodeImage: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PAIEMENT",
  paymentNumberImage: "https://placehold.co/600x400/ea580c/white?text=Orange+Money:+77+000+00+00",
  socials: { facebook: "", instagram: "", tiktok: "" },
  menu: DEFAULT_MENU,
  sales: []
};

// --- COMPOSANT MODAL ---
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
    <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
        <h3 className="font-bold text-lg text-white">{title}</h3>
        <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState('demo-resto');
  const [data, setData] = useState(DEFAULT_CONFIG);
  const [cart, setCart] = useState([]);
  const [view, setView] = useState('home'); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  
  const [adminPinInput, setAdminPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [adminTab, setAdminTab] = useState('menu'); 
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [proofFile, setProofFile] = useState(null);
  const [paymentMode, setPaymentMode] = useState('qr');
  const [viewingProof, setViewingProof] = useState(null);
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [newDish, setNewDish] = useState({ id: null, name: '', price: '', category: 'Plats', customCategory: '', image: '' });

  // 1. Initialisation Auth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rId = params.get('r') || 'demo-resto';
    setRestaurantId(rId);

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        setOfflineMode(true);
        setLoading(false); 
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 2. Sync Firestore
  useEffect(() => {
    if (offlineMode) {
      setLoading(false);
      return;
    }
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'restaurants', restaurantId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setData(snap.data());
      } else {
        setDoc(docRef, DEFAULT_CONFIG).catch(e => console.error(e));
        setData(DEFAULT_CONFIG);
      }
      setLoading(false);
    }, (err) => {
      setOfflineMode(true);
      setLoading(false);
    });
    return () => unsub();
  }, [user, restaurantId, offlineMode]);

  const syncData = async (newData) => {
    setData(newData);
    if (offlineMode) return;
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'restaurants', restaurantId);
      await setDoc(docRef, newData);
    } catch (e) {}
    setTimeout(() => setIsSyncing(false), 500);
  };

  const formatPrice = (price) => {
    const curr = AFRICAN_CURRENCIES.find(c => c.code === data.currency) || AFRICAN_CURRENCIES[0];
    return `${Number(price).toLocaleString()} ${curr.symbol}`;
  };

  const handleImageImport = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAdminLogin = () => {
    if (adminPinInput === data.pin) {
      setIsAdmin(true);
      setAdminPinInput('');
      setView('admin-dashboard');
    } else {
      setErrorMsg("Code Incorrect");
      setAdminPinInput('');
      setTimeout(() => setErrorMsg(''), 2000);
    }
  };

  // --- LOGIQUE AJOUT & MODIFICATION PLAT ---
  const handleSaveDish = () => {
    if (!newDish.name || !newDish.price) return;
    
    const categoryToUse = newDish.category === 'new' ? newDish.customCategory : newDish.category;
    if (!categoryToUse) return;

    const dishImage = newDish.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400";

    if (newDish.id) {
      // Mode MODIFICATION
      const updatedMenu = data.menu.map(item => {
        if (item.id === newDish.id) {
          return {
            ...item,
            name: newDish.name,
            price: Number(newDish.price),
            category: categoryToUse,
            image: dishImage
          };
        }
        return item;
      });
      syncData({...data, menu: updatedMenu});
    } else {
      // Mode CRÉATION
      const newItem = {
        id: `m-${Date.now()}`,
        name: newDish.name,
        price: Number(newDish.price),
        category: categoryToUse,
        description: "Nouveau plat",
        image: dishImage
      };
      syncData({...data, menu: [newItem, ...(data.menu || [])]});
    }

    setNewDish({ id: null, name: '', price: '', category: 'Plats', customCategory: '', image: '' });
    setShowAddDishModal(false);
  };

  const openEditDishModal = (item) => {
    setNewDish({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      customCategory: '',
      image: item.image
    });
    setShowAddDishModal(true);
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  // --- GESTION QUANTITÉ ---
  const getItemQty = (itemId) => {
    return cart.find(i => i.id === itemId)?.qty || 0;
  };

  const updateItemQty = (item, delta) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (!existing && delta > 0) return [...prev, { ...item, qty: 1 }];
      if (existing) {
        const newQty = existing.qty + delta;
        if (newQty <= 0) return prev.filter(i => i.id !== item.id);
        return prev.map(i => i.id === item.id ? { ...i, qty: newQty } : i);
      }
      return prev;
    });
  };

  const handleCheckout = () => {
    if (!proofFile) return;
    const orderId = `CMD-${Date.now().toString().slice(-4)}`;
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const newSale = {
      id: orderId,
      date: new Date().toISOString(),
      total: total,
      items: cart.map(i => `${i.qty}x ${i.name}`).join(', '),
      proof: proofFile,
      status: 'pending'
    };
    syncData({ ...data, sales: [newSale, ...(data.sales || [])] });
    window.open(`https://wa.me/${data.phone}?text=${encodeURIComponent(`*COMMANDE ${orderId}*\nTotal: ${formatPrice(total)}`)}`, '_blank');
    setCart([]);
    setProofFile(null);
    setView('home');
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Chargement...</p>
    </div>
  );

  // --- RENDU ADMIN ---
  if (view.startsWith('admin')) {
    const uniqueCategories = [...new Set((data.menu || []).map(m => m.category))];
    
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
        {!isAdmin ? (
          <div className="flex flex-col items-center justify-center h-screen px-6">
            <div className="bg-slate-900 p-6 rounded-full mb-6 border border-white/5 shadow-2xl">
              <Lock className="w-10 h-10 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold mb-8">Espace Gérant</h2>
            <div className="flex gap-4 mb-8">
               {[1,2,3,4].map((_, i) => <div key={i} className={`w-3 h-3 rounded-full transition-all ${adminPinInput.length > i ? 'bg-orange-500 scale-125' : 'bg-slate-800'}`} />)}
            </div>
            {errorMsg && <div className="text-red-500 mb-4 font-bold">{errorMsg}</div>}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
              {[1,2,3,4,5,6,7,8,9].map(val => (
                <button key={val} onClick={() => setAdminPinInput(p => p.length < 4 ? p + val : p)} className="h-16 rounded-2xl text-xl font-bold bg-slate-900 border border-white/5 active:bg-orange-600">{val}</button>
              ))}
              <button onClick={() => setView('home')} className="h-16 rounded-2xl flex items-center justify-center bg-slate-900 border border-white/5 active:bg-red-500/20"><X className="w-6 h-6"/></button>
              <button onClick={() => setAdminPinInput(p => p.length < 4 ? p + '0' : p)} className="h-16 rounded-2xl text-xl font-bold bg-slate-900 border border-white/5 active:bg-orange-600">0</button>
              <button onClick={handleAdminLogin} className="h-16 rounded-2xl flex items-center justify-center bg-orange-600 text-white active:scale-95"><ArrowRight className="w-6 h-6"/></button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in">
             <div className="bg-slate-900 pt-12 pb-6 px-6 flex justify-between items-center rounded-b-[40px] mb-6 shadow-2xl border-b border-white/5">
               <div>
                 <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-orange-500"/> Admin</h1>
                 <p className="text-slate-500 text-xs mt-1">ID: {restaurantId}</p>
               </div>
               <button onClick={() => {setIsAdmin(false); setView('home');}} className="p-3 bg-slate-800 rounded-full hover:bg-red-500/20"><LogOut className="w-5 h-5"/></button>
             </div>

             <div className="flex px-6 gap-3 mb-8 overflow-x-auto pb-2">
               {[
                 {id: 'menu', label: 'Menu', icon: ChefHat},
                 {id: 'sales', label: 'Ventes', icon: Wallet},
                 {id: 'settings', label: 'Réglages', icon: Settings}
               ].map(tab => (
                 <button key={tab.id} onClick={() => setAdminTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold whitespace-nowrap text-sm transition-all ${adminTab === tab.id ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400 border border-white/5'}`}>
                   <tab.icon className="w-4 h-4" /> {tab.label}
                 </button>
               ))}
             </div>

             {adminTab === 'menu' && (
               <div className="px-5 space-y-4 pb-20">
                 <button 
                   onClick={() => {
                     setNewDish({ id: null, name: '', price: '', category: 'Plats', customCategory: '', image: '' });
                     setShowAddDishModal(true);
                   }} 
                   className="w-full py-4 bg-slate-900/50 border-2 border-dashed border-slate-700 rounded-2xl text-slate-400 font-bold flex items-center justify-center gap-2"
                 >
                   <Plus className="w-5 h-5" /> Nouveau Plat
                 </button>
                 {(data.menu || []).map(item => (
                   <div key={item.id} className="bg-slate-900 p-3 rounded-[24px] flex items-center gap-4 border border-white/5">
                     <img src={item.image} className="w-16 h-16 rounded-xl object-cover bg-slate-800" />
                     <div className="flex-1">
                       <p className="font-bold text-white text-sm">{item.name}</p>
                       <p className="text-orange-500 text-xs font-bold">{formatPrice(item.price)}</p>
                     </div>
                     <div className="flex gap-2">
                        {/* BOUTON MODIFIER AJOUTÉ */}
                        <button onClick={() => openEditDishModal(item)} className="p-3 bg-slate-950 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button onClick={() => syncData({...data, menu: data.menu.filter(m => m.id !== item.id)})} className="p-3 bg-slate-950 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-5 h-5"/>
                        </button>
                     </div>
                   </div>
                 ))}
               </div>
             )}

             {adminTab === 'sales' && (
                <div className="px-5 space-y-4 pb-20">
                  {(data.sales || []).map(sale => (
                    <div key={sale.id} className="bg-slate-900 p-5 rounded-[32px] border border-white/5">
                      <div className="flex justify-between items-start mb-4">
                        <div><span className="font-bold text-white block">{sale.id}</span><span className="text-xs text-slate-500">{new Date(sale.date).toLocaleDateString()}</span></div>
                        <span className="text-orange-500 font-black text-xl">{formatPrice(sale.total)}</span>
                      </div>
                      <button onClick={() => setViewingProof(sale.proof)} className="w-full py-3 bg-white text-slate-950 rounded-xl flex items-center justify-center gap-2 text-sm font-bold"><Eye className="w-4 h-4" /> Voir Reçu</button>
                    </div>
                  ))}
                </div>
             )}

             {adminTab === 'settings' && (
               <div className="px-5 space-y-6 pb-20">
                 
                 {/* IMAGES RESTAURANT - RESTAURÉ */}
                 <div className="bg-slate-900 p-6 rounded-[32px] border border-white/5 space-y-4">
                   <h3 className="font-bold text-orange-500 flex items-center gap-2 text-sm uppercase tracking-wider"><ImageIcon className="w-5 h-5"/> Images Restaurant</h3>
                   
                   {/* LOGO IMPORT */}
                   <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl">
                      <label className="text-xs text-slate-500 mb-2 block font-bold">Logo</label>
                      <div className="flex items-center gap-4">
                        <img src={data.logo} className="w-16 h-16 rounded-xl object-cover bg-slate-900 border border-white/10"/>
                        <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3 px-4 rounded-xl text-center transition-colors">
                           Modifier
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageImport(e, (res) => syncData({...data, logo: res}))} />
                        </label>
                      </div>
                   </div>

                   {/* COVER IMPORT */}
                   <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl">
                      <label className="text-xs text-slate-500 mb-2 block font-bold">Image de Couverture</label>
                      <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-900 mb-3 border border-white/10">
                        <img src={data.coverImage} className="w-full h-full object-cover"/>
                      </div>
                      <label className="block cursor-pointer bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3 px-4 rounded-xl text-center transition-colors">
                           Changer l'image
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageImport(e, (res) => syncData({...data, coverImage: res}))} />
                      </label>
                   </div>
                 </div>

                 <div className="bg-slate-900 p-6 rounded-[32px] border border-white/5 space-y-4">
                   <h3 className="font-bold text-orange-500 flex items-center gap-2 text-sm uppercase tracking-wider">Identité & Adresse</h3>
                   <div>
                      <label className="text-xs text-slate-500 mb-1 block">Nom du Restaurant</label>
                      <input value={data.name} onChange={e => syncData({...data, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm text-white"/>
                   </div>
                   <div>
                      <label className="text-xs text-slate-500 mb-1 block">Adresse Physique</label>
                      <input value={data.address} onChange={e => syncData({...data, address: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm text-white" />
                   </div>
                   <div>
                      <label className="text-xs text-slate-500 mb-1 block">Devise Locale</label>
                      <select value={data.currency} onChange={e => syncData({...data, currency: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm text-white appearance-none">
                         {AFRICAN_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-xs text-slate-500 mb-1 block">WhatsApp (Format: 22177...)</label>
                      <input value={data.phone} onChange={e => syncData({...data, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm text-white"/>
                   </div>
                 </div>

                 <div className="bg-slate-900 p-6 rounded-[32px] border border-white/5 space-y-4">
                   <h3 className="font-bold text-orange-500 flex items-center gap-2 text-sm uppercase tracking-wider">Liens & Réseaux</h3>
                   <div>
                      <label className="text-xs text-slate-500 mb-1 block">Lien Avis Google Maps</label>
                      <input value={data.googleMapsLink || ''} onChange={e => syncData({...data, googleMapsLink: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm text-white" />
                   </div>
                   <div className="grid grid-cols-1 gap-3">
                      <input value={data.socials?.facebook || ''} onChange={e => syncData({...data, socials: {...data.socials, facebook: e.target.value}})} className="bg-slate-950 border border-slate-700 p-3 rounded-xl text-xs text-white" placeholder="Facebook URL"/>
                      <input value={data.socials?.instagram || ''} onChange={e => syncData({...data, socials: {...data.socials, instagram: e.target.value}})} className="bg-slate-950 border border-slate-700 p-3 rounded-xl text-xs text-white" placeholder="Instagram URL"/>
                      <input value={data.socials?.tiktok || ''} onChange={e => syncData({...data, socials: {...data.socials, tiktok: e.target.value}})} className="bg-slate-950 border border-slate-700 p-3 rounded-xl text-xs text-white" placeholder="TikTok URL"/>
                   </div>
                 </div>

                 <div className="bg-slate-900 p-6 rounded-[32px] border border-white/5 space-y-6">
                    <h3 className="font-bold text-orange-500 flex items-center gap-2 text-sm uppercase tracking-wider">Paiements</h3>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] text-slate-500 mb-3 font-bold">QR CODE PAIEMENT</p>
                        <img src={data.qrCodeImage} className="w-24 h-24 mx-auto mb-3 bg-white p-1 rounded-lg"/>
                        <label className="block cursor-pointer bg-slate-800 text-white text-[10px] font-bold py-2.5 rounded-lg text-center">
                           Modifier QR
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageImport(e, (res) => syncData({...data, qrCodeImage: res}))} />
                        </label>
                      </div>

                      <div className="bg-slate-900 p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] text-slate-500 mb-3 font-bold">IMAGE NUMÉRO (ORANGE/WAVE...)</p>
                        <img src={data.paymentNumberImage} className="w-full h-24 object-contain mx-auto mb-3 rounded-lg"/>
                        <label className="block cursor-pointer bg-slate-800 text-white text-[10px] font-bold py-2.5 rounded-lg text-center">
                           Modifier l'image de paiement
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageImport(e, (res) => syncData({...data, paymentNumberImage: res}))} />
                        </label>
                      </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">PIN Administration</label>
                        <input value={data.pin} onChange={e => syncData({...data, pin: e.target.value})} maxLength={4} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm text-white text-center font-mono tracking-widest"/>
                    </div>
                 </div>
               </div>
             )}
          </div>
        )}

        {showAddDishModal && (
          <Modal title={newDish.id ? "Modifier Plat" : "Nouveau Plat"} onClose={() => setShowAddDishModal(false)}>
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl text-center">
                 {newDish.image ? <img src={newDish.image} className="w-full h-32 object-cover rounded-lg mb-2"/> : (
                   <label className="cursor-pointer block p-4 border-2 border-dashed border-slate-700 rounded-lg">
                      <Upload className="w-6 h-6 mx-auto mb-2 text-slate-500"/><span className="text-[10px] text-slate-400 font-bold">PHOTO DU PLAT</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageImport(e, (res) => setNewDish({...newDish, image: res}))} />
                   </label>
                 )}
                 {newDish.image && (
                   <label className="cursor-pointer text-[10px] text-orange-500 font-bold">
                     CHANGER L'IMAGE
                     <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageImport(e, (res) => setNewDish({...newDish, image: res}))} />
                   </label>
                 )}
              </div>
              <input value={newDish.name} onChange={e => setNewDish({...newDish, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none text-sm" placeholder="Nom du plat"/>
              <input type="number" value={newDish.price} onChange={e => setNewDish({...newDish, price: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none text-sm" placeholder="Prix"/>
              
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Catégorie</label>
                <select value={newDish.category} onChange={e => setNewDish({...newDish, category: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none mb-2 appearance-none">
                  {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="new">+ Nouvelle Catégorie...</option>
                </select>
                {newDish.category === 'new' && <input value={newDish.customCategory} onChange={e => setNewDish({...newDish, customCategory: e.target.value})} className="w-full bg-slate-800 border border-slate-600 p-4 rounded-xl text-white outline-none" placeholder="Nom nouvelle catégorie" autoFocus />}
              </div>
              <button onClick={handleSaveDish} className="w-full bg-orange-600 py-4 rounded-xl font-bold text-white">SAUVEGARDER</button>
            </div>
          </Modal>
        )}
        {viewingProof && <Modal title="Preuve" onClose={() => setViewingProof(null)}><img src={viewingProof} className="w-full rounded-xl" /></Modal>}
      </div>
    );
  }

  // --- RENDU CLIENT ---
  
  const clientCategories = ['Tout', ...new Set((data.menu || []).map(m => m.category))];
  const categoriesToDisplay = selectedCategory === 'Tout' ? clientCategories.filter(c => c !== 'Tout') : [selectedCategory];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {view === 'home' && (
        <div className="animate-in fade-in">
          <div className="relative h-[60vh]">
            <img src={data.coverImage} className="w-full h-full object-cover rounded-b-[40px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent flex flex-col justify-end p-8">
               <div className="flex items-end gap-4 mb-4">
                 <img src={data.logo} className="w-20 h-20 rounded-2xl border-4 border-slate-950 object-cover" />
                 <h1 className="text-2xl font-black mb-2">{data.name}</h1>
               </div>
               <p className="text-slate-300 flex items-center gap-2 text-sm"><MapPin size={14} className="text-orange-500"/> {data.address}</p>
            </div>
            <button onClick={() => setView('admin-login')} className="absolute top-6 right-6 p-3 bg-black/40 rounded-full border border-white/10"><Lock size={16}/></button>
          </div>
          <div className="px-6 -mt-8 relative z-10">
            <button onClick={() => setView('menu')} className="w-full bg-orange-600 py-5 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-orange-900/50">VOIR LE MENU <ArrowRight/></button>
            <div className="flex justify-center flex-wrap gap-4 mt-8">
               {data.socials?.facebook && <a href={data.socials.facebook} target="_blank" className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><Facebook className="w-6 h-6" /></a>}
               {data.socials?.instagram && <a href={data.socials.instagram} target="_blank" className="w-12 h-12 bg-pink-600 rounded-2xl flex items-center justify-center text-white"><Instagram className="w-6 h-6" /></a>}
               {data.socials?.tiktok && <a href={data.socials.tiktok} target="_blank" className="w-12 h-12 bg-black border border-white/20 rounded-2xl flex items-center justify-center text-white"><Smartphone className="w-6 h-6" /></a>}
               {data.googleMapsLink && <a href={data.googleMapsLink} target="_blank" className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center"><Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /></a>}
            </div>
          </div>
        </div>
      )}

      {view === 'menu' && (
        <div className="animate-in slide-in-from-right-10 pt-16">
          <div className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/5 z-50">
            <button onClick={() => setView('home')} className="p-2"><ArrowRight className="rotate-180"/></button>
            <span className="font-black text-xs uppercase tracking-widest text-orange-500">La Carte</span>
            <div className="w-8"></div>
          </div>
          
          {/* Scroll Horizontal des Catégories */}
          <div className="flex px-5 py-4 gap-3 overflow-x-auto sticky top-[72px] bg-slate-950/95 backdrop-blur z-40 scrollbar-hide border-b border-white/5">
            {clientCategories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30 scale-105' : 'bg-slate-900 text-slate-500 border border-white/5'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="p-5 pb-32">
            {/* Organisation par Catégorie */}
            {categoriesToDisplay.map(categoryName => {
               const itemsInCat = (data.menu || []).filter(item => item.category === categoryName);
               if (itemsInCat.length === 0) return null;

               return (
                 <div key={categoryName} className="mb-8">
                   {/* Titre de Section si mode "Tout" ou pour clarté */}
                   <h3 className="font-black text-lg text-white mb-4 pl-2 border-l-4 border-orange-500">{categoryName}</h3>
                   
                   <div className="space-y-4">
                     {itemsInCat.map(item => {
                       const qty = getItemQty(item.id);
                       return (
                         <div key={item.id} className="bg-slate-900 rounded-[32px] p-3 flex gap-4 border border-white/5">
                           <img src={item.image} className="w-24 h-24 rounded-2xl object-cover" />
                           <div className="flex-1 flex flex-col justify-between py-1">
                             <h3 className="font-bold text-sm">{item.name}</h3>
                             <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                             <div className="flex justify-between items-center mt-2">
                               <span className="text-orange-500 font-black">{formatPrice(item.price)}</span>
                               
                               {/* CONTRÔLE QUANTITÉ INTELLIGENT */}
                               {qty > 0 ? (
                                 <div className="flex items-center gap-2 bg-slate-800 rounded-full p-1 pr-3">
                                   <button onClick={() => updateItemQty(item, -1)} className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-white hover:bg-orange-600"><Minus size={12}/></button>
                                   <span className="text-xs font-bold w-3 text-center">{qty}</span>
                                   <button onClick={() => updateItemQty(item, 1)} className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center hover:bg-orange-500 hover:text-white"><Plus size={12}/></button>
                                 </div>
                               ) : (
                                 <button onClick={() => updateItemQty(item, 1)} className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                                   <Plus size={16}/>
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               );
            })}
          </div>
        </div>
      )}

      {view === 'cart' && (
        <div className="p-5 pt-16">
          <div className="fixed top-0 left-0 w-full bg-slate-950 p-4 flex items-center justify-between border-b border-white/5 z-50">
            <button onClick={() => setView('menu')} className="p-2"><ArrowRight className="rotate-180"/></button>
            <span className="font-black text-xs uppercase tracking-widest text-orange-500">Panier</span>
            <div className="w-8"></div>
          </div>
          {cart.length === 0 ? <div className="text-center py-20 text-slate-500 font-bold">Panier vide.</div> : (
            <>
              <div className="space-y-3 mb-8">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <img src={item.image} className="w-10 h-10 rounded-lg object-cover" />
                      <p className="text-sm font-bold">{item.name} <span className="text-orange-500 ml-1">x{item.qty}</span></p>
                    </div>
                    
                    {/* Contrôle Quantité aussi dans le panier */}
                    <div className="flex items-center gap-2">
                       <button onClick={() => updateItemQty(item, -1)} className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-white"><Minus size={12}/></button>
                       <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                       <button onClick={() => updateItemQty(item, 1)} className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center"><Plus size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900 p-6 rounded-[32px] border border-white/5 mb-20">
                <h3 className="text-center font-bold text-xs uppercase tracking-widest mb-6">Paiement</h3>
                <div className="flex gap-2 mb-6">
                   <button onClick={() => setPaymentMode('qr')} className={`flex-1 py-3 rounded-xl border-2 text-[10px] font-bold ${paymentMode === 'qr' ? 'border-orange-600 bg-orange-600' : 'border-slate-800'}`}>SCANNER QR</button>
                   <button onClick={() => setPaymentMode('number')} className={`flex-1 py-3 rounded-xl border-2 text-[10px] font-bold ${paymentMode === 'number' ? 'border-orange-600 bg-orange-600' : 'border-slate-800'}`}>NUMÉRO</button>
                </div>
                <img src={paymentMode === 'qr' ? data.qrCodeImage : data.paymentNumberImage} className="w-32 h-32 mx-auto mb-6 bg-white p-1 rounded-xl object-contain"/>
                <div className="relative bg-slate-950 border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center">
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleImageImport(e, (res) => setProofFile(res))}/>
                  {/* TEXTE MODIFIÉ ICI */}
                  {proofFile ? <span className="text-green-500 font-bold text-xs flex items-center justify-center gap-2"><CheckCircle size={14}/> REÇU AJOUTÉ</span> : <span className="text-slate-500 text-[10px] font-bold">AJOUTER CAPTURE DU PAIEMENT</span>}
                </div>
              </div>
              <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/90 backdrop-blur-md border-t border-white/5 pb-10">
                <div className="flex justify-between mb-4"><span className="text-slate-400">Total</span><span className="text-2xl font-black">{formatPrice(cart.reduce((s, i) => s + i.price * i.qty, 0))}</span></div>
                <button onClick={handleCheckout} disabled={!proofFile} className={`w-full py-4 rounded-2xl font-bold ${proofFile ? 'bg-green-600' : 'bg-slate-800 text-slate-500'}`}>VALIDER COMMANDE</button>
              </div>
            </>
          )}
        </div>
      )}

      {!view.startsWith('admin') && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl flex justify-around items-center py-4 border-t border-white/5 px-6 z-40 pb-8 rounded-t-[32px]">
           <button onClick={() => setView('home')} className={view === 'home' ? 'text-orange-500' : 'text-slate-600'}><MapPin size={24}/></button>
           <button onClick={() => setView('menu')} className={view === 'menu' ? 'text-orange-500' : 'text-slate-600'}><ChefHat size={24}/></button>
           <button onClick={() => setView('cart')} className={`relative ${view === 'cart' ? 'text-orange-500' : 'text-slate-600'}`}><ShoppingBag size={24}/>{cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-950">{cart.length}</span>}</button>
        </div>
      )}

      {isSyncing && !offlineMode && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-orange-600 text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-2 z-[200] shadow-xl animate-bounce">
           SAUVEGARDE EN COURS...
        </div>
      )}
    </div>
  );
}