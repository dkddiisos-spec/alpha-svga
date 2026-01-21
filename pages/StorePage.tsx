
import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, SiteConfig, Order } from '../types';
import { apiService } from '../services/apiService';

const StorePage: React.FC<{ config: SiteConfig }> = ({ config }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setCurrentBannerIdx(prev => (config.banners.length > 0 ? (prev + 1) % config.banners.length : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, [config.banners]);

  const loadData = async () => {
    try {
      const [p, c] = await Promise.all([apiService.getProducts(), apiService.getCategories()]);
      setProducts(p);
      setCategories(c);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const processTransparent = () => {
    if (!previewVideoRef.current || !previewCanvasRef.current || !previewProduct) return;
    const video = previewVideoRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const render = () => {
      if (video.paused || video.ended) return;
      const w = video.videoWidth; const h = video.videoHeight;
      if (previewProduct.type === '1.1') {
        const realW = w / 2; canvas.width = realW; canvas.height = h;
        const off = document.createElement('canvas'); off.width = w; off.height = h;
        const oCtx = off.getContext('2d'); oCtx?.drawImage(video, 0, 0);
        const color = oCtx?.getImageData(0, 0, realW, h); const alpha = oCtx?.getImageData(realW, 0, realW, h);
        if (color && alpha) { for (let i = 0; i < color.data.length; i += 4) color.data[i+3] = alpha.data[i]; ctx.putImageData(color, 0, 0); }
      } else if (previewProduct.type === '0.5') {
        const realW = Math.round(w / 1.5); canvas.width = realW; canvas.height = h;
        const off = document.createElement('canvas'); off.width = w; off.height = h;
        const oCtx = off.getContext('2d'); oCtx?.drawImage(video, 0, 0);
        const color = oCtx?.getImageData(0, 0, realW, h);
        const aTemp = document.createElement('canvas'); aTemp.width = realW; aTemp.height = h;
        const atCtx = aTemp.getContext('2d'); atCtx?.drawImage(video, realW, 0, w - realW, h * 0.5, 0, 0, realW, h);
        const alpha = atCtx?.getImageData(0, 0, realW, h);
        if (color && alpha) { for (let i = 0; i < color.data.length; i += 4) color.data[i+3] = alpha.data[i]; ctx.putImageData(color, 0, 0); }
      }
      requestAnimationFrame(render);
    };
    video.play(); render();
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><div className="text-blue-500 font-black animate-pulse italic">جاري جلب المحتوى...</div></div>;

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-20 select-none bg-[#05070a]">
      {config.banners.length > 0 ? (
        <div className="h-[400px] w-full relative overflow-hidden bg-black">
          {config.banners.map((url, i) => (
            <div 
              key={i} 
              className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${currentBannerIdx === i ? 'opacity-60 scale-100' : 'opacity-0 scale-110'}`} 
              style={{ backgroundImage: `url(${url})` }} 
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-transparent to-transparent"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
             <h1 className="text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl animate-in slide-in-from-bottom-10">{config.siteName}</h1>
             <p className="text-blue-500 font-bold uppercase tracking-[4px] mt-4 text-xs">Premium Motion Assets Engine</p>
          </div>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
             {config.banners.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-500 ${currentBannerIdx === i ? 'w-12 bg-blue-600' : 'w-3 bg-white/20'}`}></div>
             ))}
          </div>
        </div>
      ) : (
        <div className="h-[200px] w-full bg-gradient-to-b from-blue-900/20 to-transparent flex items-center justify-center">
            <h1 className="text-4xl font-black text-white/10 italic">{config.siteName}</h1>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-8 mt-12 space-y-24">
        {categories.map(cat => (
          <section key={cat.id} className="space-y-10">
            <div className="flex items-center gap-6">
               <h2 className="text-3xl font-black text-white italic">{cat.name}</h2>
               <div className="flex-1 h-px bg-white/5"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {products.filter(p => p.categoryId === cat.id).map(p => (
                <div key={p.id} className="glass p-5 rounded-[2.5rem] border-white/5 hover:border-blue-500 transition-all cursor-pointer group" onClick={() => setPreviewProduct(p)}>
                  <div className="aspect-square bg-black rounded-3xl overflow-hidden relative border border-white/5">
                     <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" />
                     <div className="absolute top-3 right-3 bg-blue-600 px-3 py-1 rounded-lg text-[8px] font-black uppercase">{p.type}</div>
                  </div>
                  <h3 className="text-[12px] font-black text-white truncate mt-4 px-2">{p.name}</h3>
                  <p className="text-blue-500 font-black text-xs px-2 mt-1">{p.price} EGP</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {previewProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/95 backdrop-blur-2xl animate-in fade-in">
           <div className="glass w-full max-w-6xl rounded-[4rem] flex flex-col md:flex-row overflow-hidden border-white/5">
              <div className="flex-1 bg-black flex items-center justify-center relative min-h-[400px]">
                 <video ref={previewVideoRef} src={previewProduct.fileUrl} className="hidden" loop muted crossOrigin="anonymous" onLoadedData={processTransparent} />
                 <canvas ref={previewCanvasRef} className="max-w-full max-h-full object-contain" />
                 <button onClick={() => setPreviewProduct(null)} className="absolute top-8 left-8 w-12 h-12 bg-white/5 hover:bg-red-600 rounded-2xl flex items-center justify-center transition-all">✕</button>
              </div>
              <div className="w-full md:w-[400px] p-12 bg-[#0d1117] text-right space-y-10" dir="rtl">
                 <h2 className="text-3xl font-black text-white italic">{previewProduct.name}</h2>
                 <p className="text-gray-500 text-xs font-medium">هذا المنتج متاح للشراء الفوري. بمجرد الدفع وتأكيد الطلب، سيظهر لك رابط التحميل المباشر.</p>
                 <div className="text-4xl font-black text-blue-500">{previewProduct.price} <span className="text-xs">EGP</span></div>
                 <button className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black text-lg transition-all active:scale-95 shadow-xl shadow-blue-600/20">شراء الآن</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StorePage;
