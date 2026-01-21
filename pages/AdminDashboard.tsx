
import React, { useState, useEffect } from 'react';
import { Product, Category, SiteConfig, Order, LicenseKey, UserStats } from '../types';
import { apiService } from '../services/apiService';

interface AdminProps {
  config: SiteConfig;
  setConfig: (c: SiteConfig) => void;
}

const AdminDashboard: React.FC<AdminProps> = ({ config, setConfig }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'config' | 'keys' | 'users'>('orders');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Form states for adding new items
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ 
    name: '', price: 0, type: 'svga', categoryId: '', fileUrl: '', imageUrl: '' 
  });
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [p, c, o, k, u] = await Promise.all([
        apiService.getProducts(), apiService.getCategories(), apiService.getOrders(), apiService.getKeys(), apiService.getUsers()
      ]);
      setProducts(p); setCategories(c); setOrders(o); setKeys(k); setUsers(u);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'fileUrl' | 'imageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'fileUrl') setIsUploadingFile(true);
    else setIsUploadingImage(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        const res = await apiService.uploadFile(base64, field === 'fileUrl' ? 'mido_products' : 'mido_thumbnails');
        if (res.secure_url) {
          setNewProduct(prev => ({ ...prev, [field]: res.secure_url }));
        }
      } catch (err) {
        alert("فشل رفع الملف");
      } finally {
        if (field === 'fileUrl') setIsUploadingFile(false);
        else setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const generateKey = async () => {
    const key = 'MIDO-' + Math.random().toString(36).substr(2, 10).toUpperCase();
    try {
      await apiService.addKey({ id: 'key_'+Date.now(), key, createdAt: Date.now(), isUsed: false, expiresAt: null, activatedAt: null, deviceId: null });
      loadAll();
    } catch (e) { alert("فشل توليد المفتاح"); }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.categoryId || !newProduct.fileUrl || !newProduct.imageUrl) {
        alert("يرجى إكمال جميع البيانات ورفع الملفات المطلوبة");
        return;
    }
    try {
      await apiService.addProduct({ ...newProduct, id: 'prod_'+Date.now() } as Product);
      setNewProduct({ name: '', price: 0, type: 'svga', categoryId: '', fileUrl: '', imageUrl: '' });
      loadAll();
    } catch (e) { alert("فشل إضافة المنتج"); }
  };

  const handleConfigUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.updateConfig(config);
      alert("تم تحديث الإعدادات بنجاح ✅");
    } catch (e) { alert("فشل التحديث"); }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        const res = await apiService.uploadFile(base64, 'site_banners');
        if (res.secure_url) {
          const updatedBanners = [...config.banners, res.secure_url];
          const newConfig = { ...config, banners: updatedBanners };
          setConfig(newConfig);
          await apiService.updateConfig(newConfig);
        }
      } catch (err) { alert("فشل رفع البانر"); } finally { setIsUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) return <div className="h-full flex items-center justify-center bg-[#05070a] text-blue-500 font-black animate-pulse italic">جاري تحميل لوحة التحكم...</div>;

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-12 max-w-7xl mx-auto space-y-8 text-right bg-[#05070a] no-scrollbar" dir="rtl">
      {/* Header Navigation */}
      <div className="glass p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-6">
         <div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">مركز الإدارة</h2>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">Mido Ultimate Controller</p>
         </div>
         <div className="flex gap-2 flex-wrap justify-center lg:justify-end">
            {[
              { id: 'orders', label: 'الطلبات', icon: '📦' },
              { id: 'products', label: 'المنتجات', icon: '💎' },
              { id: 'keys', label: 'التراخيص', icon: '🔑' },
              { id: 'users', label: 'المستخدمين', icon: '👥' },
              { id: 'config', label: 'الإعدادات', icon: '⚙️' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-6 py-4 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-105' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
         </div>
      </div>

      {/* Orders View */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in">
           {orders.length === 0 && <div className="glass p-20 text-center text-gray-600 font-black italic">لا توجد طلبات معلقة حالياً</div>}
           {orders.map(o => (
             <div key={o.id} className="glass p-6 rounded-[2.5rem] border-white/5 flex flex-col md:flex-row gap-8 items-center group hover:border-blue-500/30 transition-all">
                <div className="w-40 aspect-square bg-black rounded-3xl overflow-hidden border border-white/10 relative group">
                   <img src={o.proofImageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <button onClick={() => window.open(o.proofImageUrl)} className="bg-white/10 p-2 rounded-full backdrop-blur-md">👁️</button>
                   </div>
                </div>
                <div className="flex-1 space-y-4">
                   <div className="flex items-center gap-3">
                      <h4 className="text-xl font-black text-white italic">{o.customerName}</h4>
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${o.status === 'approved' ? 'bg-green-600/10 text-green-500' : 'bg-orange-600/10 text-orange-500 animate-pulse'}`}>
                        {o.status === 'pending' ? 'معلق' : 'مكتمل'}
                      </span>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                         <span className="text-[9px] text-gray-500 block">طريقة الدفع</span>
                         <span className="text-xs font-black text-blue-400">{o.paymentMethod.toUpperCase()}</span>
                      </div>
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                         <span className="text-[9px] text-gray-500 block">التاريخ</span>
                         <span className="text-xs font-black text-white">{new Date(o.timestamp).toLocaleDateString('ar-EG')}</span>
                      </div>
                   </div>
                </div>
                <div className="flex gap-3">
                   {o.status === 'pending' && (
                     <button onClick={() => apiService.approveOrder(o.id).then(loadAll)} className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-2xl text-[11px] font-black shadow-lg shadow-green-600/10 transition-all">تفعيل الطلب</button>
                   )}
                   <button onClick={() => apiService.deleteOrder(o.id).then(loadAll)} className="px-8 py-4 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl text-[11px] font-black transition-all">حذف</button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Products View */}
      {activeTab === 'products' && (
        <div className="space-y-12 animate-in fade-in">
           {/* Add Product Form */}
           <div className="glass p-10 rounded-[3.5rem] border-white/5 bg-gradient-to-br from-blue-900/5 to-transparent">
              <h3 className="text-xl font-black text-white italic mb-8">إضافة منتج جديد</h3>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <input type="text" placeholder="اسم المنتج" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-600" />
                 <input type="number" placeholder="السعر (EGP)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-mono outline-none focus:border-blue-600" />
                 <select value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value as any})} className="bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-black outline-none focus:border-blue-600">
                    <option value="svga">SVGA</option>
                    <option value="1.1">SBS 1.1</option>
                    <option value="0.5">SBS 0.5</option>
                 </select>
                 <select value={newProduct.categoryId} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})} className="bg-black/40 border border-white/5 rounded-2xl p-4 text-white font-black outline-none focus:border-blue-600">
                    <option value="">اختر القسم</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>

                 <div className="lg:col-span-2 relative">
                    <label className={`w-full py-4 px-6 bg-white/5 border border-dashed border-white/10 rounded-2xl text-white font-black text-[10px] cursor-pointer block text-center truncate ${isUploadingFile ? 'animate-pulse' : ''}`}>
                       {isUploadingFile ? 'جاري الرفع...' : (newProduct.fileUrl ? `تم اختيار الملف ✓` : '📁 ارفع ملف المنتج (SVGA/MP4)')}
                       <input type="file" onChange={e => handleFileUpload(e, 'fileUrl')} className="hidden" disabled={isUploadingFile} />
                    </label>
                 </div>
                 <div className="lg:col-span-2 relative">
                    <label className={`w-full py-4 px-6 bg-white/5 border border-dashed border-white/10 rounded-2xl text-white font-black text-[10px] cursor-pointer block text-center truncate ${isUploadingImage ? 'animate-pulse' : ''}`}>
                       {isUploadingImage ? 'جاري الرفع...' : (newProduct.imageUrl ? `تم اختيار الصورة ✓` : '🖼️ ارفع صورة المعاينة')}
                       <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'imageUrl')} className="hidden" disabled={isUploadingImage} />
                    </label>
                 </div>

                 <button type="submit" className="lg:col-span-4 py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50" disabled={isUploadingFile || isUploadingImage}>حفظ المنتج</button>
              </form>
           </div>

           {/* Products List */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map(p => (
                <div key={p.id} className="glass p-5 rounded-[3rem] border-white/5 hover:border-blue-500 transition-all group relative overflow-hidden">
                   <div className="aspect-square bg-black rounded-3xl overflow-hidden border border-white/5 mb-4">
                      <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                   </div>
                   <div className="flex justify-between items-start px-2">
                      <div>
                        <h4 className="text-white font-black italic">{p.name}</h4>
                        <span className="text-[10px] text-blue-500 font-bold uppercase">{p.type}</span>
                      </div>
                      <div className="text-xl font-black text-white">{p.price} <span className="text-[10px]">EGP</span></div>
                   </div>
                   <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => apiService.deleteProduct(p.id).then(loadAll)} className="flex-1 py-3 bg-red-600/10 text-red-500 rounded-xl text-[11px] font-black hover:bg-red-600 hover:text-white transition-all">حذف</button>
                      <button onClick={() => alert("قريباً: التعديل المباشر")} className="flex-1 py-3 bg-white/5 text-white rounded-xl text-[11px] font-black hover:bg-white/10 transition-all">تعديل</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Licenses/Keys View */}
      {activeTab === 'keys' && (
        <div className="space-y-8 animate-in fade-in">
           <div className="flex justify-between items-center bg-[#0d1117] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <div>
                <h3 className="text-xl font-black text-white italic">نظام التراخيص</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Key Management & Activation</p>
              </div>
              <button onClick={generateKey} className="px-10 py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-3">
                 <span>✨</span> توليد مفتاح جديد
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {keys.map(k => (
                <div key={k.id} className="glass p-6 rounded-[2.5rem] border-white/5 relative overflow-hidden group">
                   <div className={`absolute top-0 right-0 px-4 py-1 text-[8px] font-black uppercase ${k.isUsed ? 'bg-red-600/20 text-red-400' : 'bg-green-600/20 text-green-400 animate-pulse'}`}>
                      {k.isUsed ? 'مستخدم' : 'متاح'}
                   </div>
                   <div className="space-y-4">
                      <div className="text-xl font-mono text-white font-black select-all group-hover:text-blue-500 transition-colors">{k.key}</div>
                      <div className="space-y-2 border-t border-white/5 pt-4">
                         <div className="flex justify-between text-[10px]">
                            <span className="text-gray-500 font-bold">تاريخ الإنشاء:</span>
                            <span className="text-white font-mono">{new Date(k.createdAt).toLocaleDateString('ar-EG')}</span>
                         </div>
                         {k.isUsed && (
                           <div className="flex justify-between text-[10px]">
                              <span className="text-gray-500 font-bold">الجهاز:</span>
                              <span className="text-blue-400 font-mono">{k.deviceId?.substring(0, 15)}...</span>
                           </div>
                         )}
                      </div>
                      <button onClick={() => apiService.deleteKey(k.id).then(loadAll)} className="w-full py-3 bg-white/5 hover:bg-red-600/10 text-red-500 rounded-xl text-[10px] font-black transition-all">إلغاء الترخيص</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Users View */}
      {activeTab === 'users' && (
        <div className="space-y-8 animate-in fade-in">
           <div className="glass p-8 rounded-[2.5rem] border-white/5 overflow-x-auto no-scrollbar">
              <table className="w-full text-right" dir="rtl">
                 <thead>
                    <tr className="border-b border-white/5">
                       <th className="p-4 text-[10px] text-gray-500 font-black uppercase tracking-widest">بصمة الجهاز</th>
                       <th className="p-4 text-[10px] text-gray-500 font-black uppercase tracking-widest text-center">الفترة التجريبية</th>
                       <th className="p-4 text-[10px] text-gray-500 font-black uppercase tracking-widest text-center">الاستخدام</th>
                       <th className="p-4 text-[10px] text-gray-500 font-black uppercase tracking-widest text-center">آخر نشاط</th>
                    </tr>
                 </thead>
                 <tbody>
                    {users.map(u => (
                      <tr key={u.deviceId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                         <td className="p-4">
                            <span className="text-xs font-mono text-white select-all">{u.deviceId}</span>
                         </td>
                         <td className="p-4 text-center">
                            <span className={`px-4 py-1 rounded-full text-[9px] font-black ${u.trialStartedAt ? 'bg-orange-600/10 text-orange-400' : 'bg-gray-600/10 text-gray-600'}`}>
                               {u.trialStartedAt ? new Date(u.trialStartedAt).toLocaleDateString('ar-EG') : 'لم تبدأ'}
                            </span>
                         </td>
                         <td className="p-4 text-center">
                            <span className="text-lg font-black text-blue-500">{u.usageCount || 0}</span>
                         </td>
                         <td className="p-4 text-center">
                            <span className="text-[10px] text-gray-500 font-bold italic">{u.lastActive ? new Date(u.lastActive).toLocaleString('ar-EG') : '-'}</span>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Config View */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in">
           <div className="glass p-10 rounded-[3.5rem] border-white/5 space-y-10 bg-gradient-to-br from-blue-900/5 to-transparent">
              <h3 className="text-xl font-black text-white italic">الهوية البصرية للمنصة</h3>
              <form onSubmit={handleConfigUpdate} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-black uppercase mr-2">اسم الموقع</label>
                    <input type="text" value={config.siteName} onChange={e => setConfig({...config, siteName: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white font-black outline-none focus:border-blue-600" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-black uppercase mr-2">رابط اللوجو</label>
                    <input type="text" value={config.logoUrl} onChange={e => setConfig({...config, logoUrl: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white text-sm outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-black uppercase mr-2">رقم فودافون كاش</label>
                    <input type="text" value={config.vodafoneNumber} onChange={e => setConfig({...config, vodafoneNumber: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white font-mono outline-none" />
                 </div>
                 <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all">حفظ التغييرات</button>
              </form>
           </div>

           <div className="glass p-10 rounded-[3.5rem] border-white/5 space-y-8">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black text-white italic">البانرات المتحركة (Slider)</h3>
                 <label className={`px-6 py-3 bg-blue-600 rounded-xl text-[10px] font-black cursor-pointer hover:bg-blue-500 transition-all ${isUploading ? 'opacity-50' : ''}`}>
                   {isUploading ? 'جاري الرفع...' : '+ رفع بانر جديد'}
                   <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" disabled={isUploading} />
                 </label>
              </div>
              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto no-scrollbar">
                 {config.banners.map((url, i) => (
                    <div key={i} className="aspect-video bg-black rounded-3xl overflow-hidden relative group border border-white/5 shadow-inner">
                       <img src={url} className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-red-600/90 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer backdrop-blur-sm" onClick={() => {
                         const updated = config.banners.filter((_, idx) => idx !== i);
                         const newConfig = { ...config, banners: updated };
                         setConfig(newConfig);
                         apiService.updateConfig(newConfig);
                       }}>
                          <span className="text-2xl mb-2">🗑️</span>
                          <span className="font-black text-[11px] uppercase tracking-widest">حذف البانر</span>
                       </div>
                    </div>
                 ))}
                 {config.banners.length === 0 && (
                   <div className="col-span-2 py-20 text-center bg-black/40 rounded-[2.5rem] border border-dashed border-gray-800">
                      <span className="text-3xl block mb-4">🖼️</span>
                      <p className="text-[10px] text-gray-600 font-black uppercase italic">لا توجد صور نشطة في السلايدر</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
