
import React, { useState, useEffect, useRef } from 'react';
import { decodeSVGA, encodeSVGA, finalizeSVGAForExport } from '../services/svgaService';
import { SVGAMovieEntity } from '../types';

declare const SVGA: any;

interface EditPageProps {
  onComplete?: () => void;
  trialBanner?: string | null;
}

const EditPage: React.FC<EditPageProps> = ({ onComplete, trialBanner }) => {
  const [movie, setMovie] = useState<SVGAMovieEntity | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clipboard, setClipboard] = useState<any[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [layerDims, setLayerDims] = useState<Record<number, { w: number; h: number } | null>>({});
  
  const prevDimsRef = useRef<Record<number, { w: number; h: number } | null>>({});
  const prevFrameDimsRef = useRef<Record<number, { w: number; h: number } | null>>({});
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !playerRef.current) {
      const player = new SVGA.Player(containerRef.current);
      player.setContentMode('AspectFit');
      playerRef.current = player;
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const incEdit = () => {
    const v = parseInt(localStorage.getItem('mido_user_edits') || '0', 10);
    localStorage.setItem('mido_user_edits', String((isNaN(v) ? 0 : v) + 1));
  };

  const computeImageDims = async (idx: number) => {
    if (!movie) return;
    const s = movie.sprites[idx];
    const key = s?.imageKey;
    if (!key || !movie.images[key]) {
      setLayerDims((d) => ({ ...d, [idx]: null }));
      return;
    }
    const blob = new Blob([movie.images[key]], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
    URL.revokeObjectURL(url);
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    setLayerDims((d) => ({ ...d, [idx]: w && h ? { w, h } : null }));
  };

  useEffect(() => {
    if (movie && selectedIdx !== null) {
      computeImageDims(selectedIdx);
    }
  }, [movie, selectedIdx]);

  const refreshPlayer = async (data: SVGAMovieEntity) => {
    if (!playerRef.current) return;
    try {
      const blob = await encodeSVGA(finalizeSVGAForExport(data));
      const url = URL.createObjectURL(blob);
      const parser = new SVGA.Parser();
      
      parser.load(url, (videoItem: any) => {
        if (playerRef.current) {
          playerRef.current.stopAnimation();
          playerRef.current.setVideoItem(videoItem);
          playerRef.current.startAnimation();
        }
        URL.revokeObjectURL(url);
      }, (err: any) => {
        URL.revokeObjectURL(url);
      });
    } catch (e) { }
  };

  useEffect(() => {
    if (movie) refreshPlayer(movie);
  }, [movie]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setIsProcessing(true);
      try {
        const buffer = await e.target.files[0].arrayBuffer();
        const decoded = await decodeSVGA(buffer);
        setMovie(decoded);
        setSelectedIdx(null);
        showToast("تم تحميل الملف بنجاح ✅");
      } catch (err) {
        alert("فشل تحميل ملف SVGA");
      }
      setIsProcessing(false);
    }
  };

  const modifyLayerFrames = (modifier: (frame: any) => void) => {
    if (!movie || selectedIdx === null) return;
    const newSprites = [...movie.sprites];
    const sprite = { ...newSprites[selectedIdx] };

    // تخزين الأبعاد الحالية قبل التعديل كمرجع
    const currentFrame = sprite.frames.find((f: any) => f && f.layout);
    if (currentFrame) {
      prevFrameDimsRef.current[selectedIdx] = {
        w: currentFrame.layout.width,
        h: currentFrame.layout.height
      };
    }

    sprite.frames = sprite.frames.map((f: any) => {
      if (!f) return f;
      const nf = JSON.parse(JSON.stringify(f));
      if (!nf.layout) nf.layout = { x: 0, y: 0, width: 100, height: 100 };
      if (!nf.transform) nf.transform = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
      modifier(nf);
      return nf;
    });
    newSprites[selectedIdx] = sprite;
    setMovie({ ...movie, sprites: newSprites });
    incEdit();
  };

  const moveLayer = (dx: number, dy: number) => {
    modifyLayerFrames(f => {
      f.layout.x += dx;
      f.layout.y += dy;
      f.transform.tx += dx;
      f.transform.ty += dy;
    });
  };

  const scaleLayer = (factor: number) => {
    modifyLayerFrames(f => {
      f.layout.width *= factor;
      f.layout.height *= factor;
      f.transform.a = 1;
      f.transform.d = 1;
    });
  };

  const matchFrameToCurrentImage = () => {
    if (!movie || selectedIdx === null) return;
    const dims = layerDims[selectedIdx];
    if (!dims) return;
    modifyLayerFrames(f => {
      f.layout.width = dims.w;
      f.layout.height = dims.h;
      f.transform.a = 1;
      f.transform.d = 1;
    });
    showToast("تمت مطابقة الإطار مع مقاس الصورة الحالية");
  };

  const matchFrameToPrevFrame = () => {
    if (!movie || selectedIdx === null) return;
    const dims = prevFrameDimsRef.current[selectedIdx];
    if (!dims) return;
    modifyLayerFrames(f => {
      f.layout.width = dims.w;
      f.layout.height = dims.h;
      f.transform.a = 1;
      f.transform.d = 1;
    });
    showToast("تمت استعادة أبعاد الإطار السابقة");
  };

  const replaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!movie || selectedIdx === null || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = url;
    });
    URL.revokeObjectURL(url);

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    const pngBytes: Uint8Array = await new Promise((resolve) => {
      canvas.toBlob((b) => {
        if (!b) return resolve(new Uint8Array());
        const r = new FileReader();
        r.onloadend = () => resolve(new Uint8Array(r.result as ArrayBuffer));
        r.readAsArrayBuffer(b);
      }, 'image/png');
    });

    const newKey = `img_${Date.now()}`;
    const newImages = { ...movie.images, [newKey]: pngBytes };
    
    // حفظ أبعاد الصورة القديمة قبل الاستبدال
    const oldSprite = movie.sprites[selectedIdx];
    const oldKey = oldSprite?.imageKey;
    if (oldKey && movie.images[oldKey]) {
      const oldImg = new Image();
      const oldUrl = URL.createObjectURL(new Blob([movie.images[oldKey]], {type:'image/png'}));
      await new Promise<void>(r => { oldImg.onload = () => r(); oldImg.src = oldUrl; });
      prevDimsRef.current[selectedIdx] = { w: oldImg.naturalWidth, h: oldImg.naturalHeight };
      URL.revokeObjectURL(oldUrl);
    }

    const newSprites = [...movie.sprites];
    newSprites[selectedIdx] = { ...newSprites[selectedIdx], imageKey: newKey };
    setMovie({ ...movie, images: newImages, sprites: newSprites });
    showToast("تم استبدال الصورة بنجاح 🖼️");
    incEdit();
  };

  const deleteLayer = (idx: number) => {
    if (!movie) return;
    const newSprites = movie.sprites.filter((_, i) => i !== idx);
    setMovie({ ...movie, sprites: newSprites });
    setSelectedIdx(null);
    showToast("تم حذف الطبقة 🗑️");
    incEdit();
  };

  const duplicateLayer = (idx: number) => {
    if (!movie) return;
    const spriteToClone = JSON.parse(JSON.stringify(movie.sprites[idx]));
    const newSprites = [...movie.sprites];
    newSprites.splice(idx + 1, 0, spriteToClone);
    setMovie({ ...movie, sprites: newSprites });
    showToast("تم استنساخ الطبقة 👥");
    incEdit();
  };

  const copyEffect = (idx: number) => {
    if (!movie) return;
    const frames = JSON.parse(JSON.stringify(movie.sprites[idx].frames));
    setClipboard(frames);
    showToast("تم نسخ الحركة 📋");
  };

  const pasteEffect = (idx: number) => {
    if (!movie || !clipboard) return;
    const newSprites = [...movie.sprites];
    newSprites[idx] = { ...newSprites[idx], frames: clipboard };
    setMovie({ ...movie, sprites: newSprites });
    showToast("تم لصق الحركة ✨");
    incEdit();
  };

  const addNewLayer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!movie || !e.target.files?.[0]) return;
    const buffer = await e.target.files[0].arrayBuffer();
    const newKey = `new_layer_${Date.now()}`;
    const newImages = { ...movie.images, [newKey]: new Uint8Array(buffer) };
    const defaultFrame = {
      alpha: 1.0,
      layout: { x: 0, y: 0, width: 200, height: 200 },
      transform: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
    };
    const newSprite = {
      imageKey: newKey,
      frames: new Array(movie.params.frames).fill(null).map(() => ({ ...defaultFrame }))
    };
    setMovie({ ...movie, images: newImages, sprites: [newSprite, ...movie.sprites] });
    setSelectedIdx(0);
    showToast("أضيفت طبقة جديدة ➕");
    incEdit();
  };

  const moveZ = (idx: number, dir: 'up' | 'down') => {
    if (!movie) return;
    const newSprites = [...movie.sprites];
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newSprites.length) return;
    [newSprites[idx], newSprites[targetIdx]] = [newSprites[targetIdx], newSprites[idx]];
    setMovie({ ...movie, sprites: newSprites });
    setSelectedIdx(targetIdx);
  };

  const exportPNG11 = () => {
    const root = containerRef.current;
    if (!root) return;
    const canvas = root.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const size = Math.max(w, h);
    const out = document.createElement('canvas');
    out.width = size; out.height = size;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(canvas, (size-w)/2, (size-h)/2);
    out.toBlob(b => {
      if (!b) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'svga_preview_1x1.png';
      a.click();
    });
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-[#05070a]" dir="rtl">
      {trialBanner && (
        <div className="bg-blue-600/10 border-b border-blue-500/20 py-2 px-6 flex justify-center items-center gap-3">
           <span className="text-blue-500 animate-pulse">⏳</span>
           <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
              نسخة تجريبية مجانية — يتبقى {trialBanner}
           </span>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 p-6 lg:p-10 flex flex-col gap-8 relative h-full overflow-hidden order-2 lg:order-1">
          <section className="glass flex-1 rounded-[3rem] ring-1 ring-white/10 bg-[#0d1117]/60 shadow-2xl overflow-hidden relative flex items-center justify-center p-4">
            <div ref={containerRef} className="w-full h-full" />
            {!movie && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117]/80 z-10 space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl animate-bounce">✏️</div>
                <div className="text-gray-500 font-black italic uppercase tracking-widest text-[10px]">
                  استوديو MIDO بانتظار ملف SVGA...
                </div>
              </div>
            )}
          </section>

          {selectedIdx !== null && (
            <section className="glass p-8 rounded-[3rem] ring-1 ring-white/10 bg-[#0d1117]/80 shadow-2xl flex flex-wrap items-center justify-center gap-10 z-30 animate-in slide-in-from-bottom-10">
               <div className="flex flex-col items-center gap-3">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">الموضع</span>
                  <div className="grid grid-cols-3 gap-2">
                     <div />
                     <button onClick={() => moveLayer(0, -10)} className="tool-btn">↑</button>
                     <div />
                     <button onClick={() => moveLayer(-10, 0)} className="tool-btn">←</button>
                     <button onClick={() => moveLayer(0, 10)} className="tool-btn">↓</button>
                     <button onClick={() => moveLayer(10, 0)} className="tool-btn">→</button>
                  </div>
               </div>

               <div className="w-px h-20 bg-white/5" />

               <div className="flex flex-col items-center gap-3">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">المقاسات</span>
                  <div className="flex flex-col gap-2">
                     <button onClick={matchFrameToCurrentImage} className="action-pill bg-blue-600/10 text-blue-400">مطابقة الصورة</button>
                     <button onClick={matchFrameToPrevFrame} className="action-pill bg-purple-600/10 text-purple-400">المقاس القديم</button>
                  </div>
               </div>

               <div className="w-px h-20 bg-white/5" />

               <div className="flex flex-col items-center gap-3">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">الحجم</span>
                  <div className="flex flex-col gap-2">
                     <button onClick={() => scaleLayer(1.1)} className="tool-btn text-xl">+</button>
                     <button onClick={() => scaleLayer(0.9)} className="tool-btn text-xl">-</button>
                  </div>
               </div>

               <div className="w-px h-20 bg-white/5" />

               <div className="flex flex-col gap-4">
                  <div className="flex gap-3">
                     <button onClick={() => copyEffect(selectedIdx)} className="action-pill bg-blue-600/10 text-blue-400">نسخ المسار</button>
                     <button onClick={() => pasteEffect(selectedIdx)} disabled={!clipboard} className={`action-pill ${clipboard ? 'bg-green-600/10 text-green-400' : 'opacity-20 bg-gray-600/10 text-gray-500'}`}>لصق</button>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={() => duplicateLayer(selectedIdx)} className="action-pill bg-purple-600/10 text-purple-400">استنساخ</button>
                     <button onClick={() => deleteLayer(selectedIdx)} className="action-pill bg-red-600/10 text-red-500">حذف</button>
                  </div>
               </div>
            </section>
          )}
        </div>

        <aside className="w-full lg:w-[450px] glass border-r lg:border-white/5 bg-[#0d1117]/80 flex flex-col shadow-2xl z-20 order-1 lg:order-2 h-[40vh] lg:h-full">
          <div className="p-8 border-b border-white/5 flex flex-col gap-6">
             <div>
                <h3 className="text-2xl font-black text-white italic tracking-tight">مدير الطبقات</h3>
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Layer Stack Management</p>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <label className="bg-green-600 hover:bg-green-500 p-4 rounded-2xl text-[11px] font-black cursor-pointer transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-green-600/10">
                  <span>➕</span> إضافة طبقة
                  <input type="file" accept="image/*" onChange={addNewLayer} className="hidden" />
                </label>
                <label className="bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl text-[11px] font-black cursor-pointer transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10">
                  <span>📂</span> فتح ملف
                  <input type="file" accept=".svga" onChange={handleFile} className="hidden" />
                </label>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar bg-black/20">
             {movie?.sprites.map((s, i) => (
               <div 
                 key={i} 
                 onClick={() => setSelectedIdx(i)}
                 className={`glass p-5 rounded-[2rem] ring-1 transition-all flex items-center gap-5 cursor-pointer group ${selectedIdx === i ? 'ring-blue-500 bg-blue-500/10 shadow-xl' : 'ring-white/5 bg-black/40 hover:bg-white/5'}`}
               >
                 <div className="w-14 h-14 bg-black rounded-2xl ring-1 ring-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {movie.images[s.imageKey] && <img src={URL.createObjectURL(new Blob([movie.images[s.imageKey]], {type:'image/png'}))} className="max-w-full max-h-full object-contain" alt="" />}
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-white truncate font-black">{s.imageKey}</div>
                    <div className="text-[8px] text-gray-500 font-black mt-1 uppercase tracking-widest italic">Layer Index: {i}</div>
                 </div>
                 {selectedIdx === i && (
                   <label className="text-[9px] bg-blue-600 text-white px-4 py-2 rounded-xl font-black hover:bg-blue-500 cursor-pointer transition-all shadow-lg">
                     استبدال
                     <input type="file" accept="image/*" onChange={replaceImage} className="hidden" />
                   </label>
                 )}
               </div>
             ))}
          </div>

          {movie && (
            <div className="p-8 bg-black/40 border-t border-white/5 space-y-3">
               <button onClick={async () => {
                  const blob = await encodeSVGA(finalizeSVGAForExport(movie));
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `mido_edit_${Date.now()}.svga`;
                  a.click();
                  onComplete?.();
               }} className="w-full py-6 bg-blue-600 hover:bg-blue-500 rounded-3xl font-black text-sm shadow-2xl transition-all shadow-blue-600/30 flex items-center justify-center gap-3">
                 <span>🚀</span> تصدير العمل النهائي
               </button>
               <button onClick={exportPNG11} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-black text-xs border border-white/5 transition-all">تصدير PNG 1:1</button>
            </div>
          )}
        </aside>
      </div>

      {toast && (
        <div className="fixed top-24 right-10 z-[100] animate-in slide-in-from-right-full">
           <div className="glass px-8 py-4 rounded-[1.5rem] border-blue-500/40 text-white font-black text-xs shadow-2xl shadow-blue-600/20 flex items-center gap-3 ring-1 ring-blue-500/20">
              <span className="text-blue-500">✨</span> {toast}
           </div>
        </div>
      )}

      <style>{`
        .tool-btn { 
          width: 42px; height: 42px; background: rgba(255,255,255,0.03); ring: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px; font-weight: 900; transition: all 0.3s; color: #fff;
          display: flex; align-items: center; justify-content: center; font-size: 16px;
        }
        .tool-btn:hover { background: #1f6feb; transform: translateY(-3px) scale(1.05); box-shadow: 0 8px 16px rgba(31,111,235,0.3); }
        .action-pill { padding: 10px 18px; border-radius: 12px; font-size: 10px; font-weight: 900; transition: all 0.2s; border: 1px solid transparent; }
        .action-pill:hover { border-color: currentColor; transform: translateY(-2px); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .svga-canvas canvas { width: 100% !important; height: 100% !important; object-fit: contain; }
      `}</style>
    </div>
  );
};

export default EditPage;
