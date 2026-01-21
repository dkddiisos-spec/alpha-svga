
import React, { useState, useRef, useEffect } from 'react';
import { decodeSVGA, compressSVGAActual } from '../services/svgaService';
import { SVGAMovieEntity } from '../types';

declare const SVGA: any;

interface CompressPageProps {
  onComplete?: () => void;
}

const CompressPage: React.FC<CompressPageProps> = ({ onComplete }) => {
  const [movie, setMovie] = useState<SVGAMovieEntity | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetFrames, setTargetFrames] = useState(24);
  const [quality, setQuality] = useState(70);
  const [scale, setScale] = useState(1.0);
  const [stripShapes, setStripShapes] = useState(false);
  const [stripAudios, setStripAudios] = useState(false);
  const [precision, setPrecision] = useState(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current && !playerRef.current && typeof SVGA !== 'undefined') {
      const player = new SVGA.Player(containerRef.current);
      player.setContentMode('AspectFit');
      playerRef.current = player;
    }
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setOriginalSize(file.size);
      const buffer = await file.arrayBuffer();
      try {
        const decoded = await decodeSVGA(buffer);
        setMovie(decoded);
        setTargetFrames(decoded.params.frames);

        if (playerRef.current) {
          const parser = new SVGA.Parser();
          parser.load(URL.createObjectURL(file), (item: any) => {
            playerRef.current.setVideoItem(item);
            playerRef.current.startAnimation();
          });
        }
      } catch (err) {
        alert("فشل في قراءة ملف SVGA");
      }
    }
  };

  const startCompression = async () => {
    if (!movie) return;
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const blob = await compressSVGAActual(
        movie, 
        targetFrames, 
        quality, 
        scale, 
        stripShapes, 
        stripAudios, 
        precision,
        p => setProgress(p)
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mido_binary_compress_${Date.now()}.svga`;
      a.click();
      
      const saved = originalSize - blob.size;
      const percent = Math.round((saved / originalSize) * 100);
      alert(`تم الضغط الفعلي بنجاح!\nالحجم الجديد: ${(blob.size / 1024 / 1024).toFixed(2)} MB\nنسبة التوفير: ${percent}%`);
      // Call onComplete when processing is finished
      onComplete?.();
    } catch (e) {
      alert('حدث خطأ أثناء الضغط الثنائي.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden text-right bg-[#05070a]" dir="rtl">
      {/* View Area */}
      <div className="flex-1 p-4 lg:p-8 flex flex-col gap-6 relative h-full">
         <div className="glass flex-1 rounded-[2rem] lg:rounded-[2.5rem] bg-black shadow-2xl relative overflow-hidden flex flex-col border-white/5 h-full">
            <h3 className="p-4 lg:p-6 text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-white/5 bg-[#0d1117]">معاينة الملف الأصلي</h3>
            <div 
              ref={containerRef} 
              className="flex-1 svga-canvas overflow-hidden flex items-center justify-center w-full h-full"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
               {!movie && <div className="text-[10px] text-gray-800 font-black italic uppercase animate-pulse">Waiting for SVGA File...</div>}
            </div>

            {movie && (
              <div className="p-4 lg:p-6 bg-black/80 backdrop-blur-md border-t border-white/5 grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="text-center">
                    <span className="text-[9px] text-gray-500 uppercase block">الحجم الحالي</span>
                    <span className="text-xs lg:text-sm font-mono text-white">{(originalSize / 1024 / 1024).toFixed(2)} MB</span>
                 </div>
                 <div className="text-center">
                    <span className="text-[9px] text-gray-500 uppercase block">الفريمات</span>
                    <span className="text-xs lg:text-sm font-mono text-white">{movie.params.frames}</span>
                 </div>
                 <div className="text-center">
                    <span className="text-[9px] text-gray-500 uppercase block">الأبعاد</span>
                    <span className="text-xs lg:text-sm font-mono text-white">{movie.params.viewBoxWidth}x{movie.params.viewBoxHeight}</span>
                 </div>
                 <div className="text-center">
                    <span className="text-[9px] text-gray-500 uppercase block">FPS</span>
                    <span className="text-xs lg:text-sm font-mono text-white">{movie.params.fps}</span>
                 </div>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-x-0 bottom-0 bg-black/90 p-4 lg:p-8 border-t border-blue-500/30 z-20">
                 <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-blue-400">Binary Bitstream Stripping...</span>
                    <span className="text-xs font-mono text-white">{progress}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{width: `${progress}%`}}></div>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Control Sidebar */}
      <div className="w-full lg:w-[400px] glass border-b lg:border-r border-[#30363d] p-6 lg:p-8 flex flex-col gap-6 bg-[#0d1117] shadow-2xl z-20 overflow-y-auto no-scrollbar h-[35vh] lg:h-full">
         <div>
           <h2 className="text-xl lg:text-2xl font-black text-white italic tracking-tighter">مركز الضغط الفعلي</h2>
           <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-[3px]">Pro Binary Optimizer</p>
         </div>

         <div className="space-y-6">
            <label className="block border-2 border-dashed border-gray-800 rounded-2xl p-4 lg:p-6 cursor-pointer bg-black/40 text-center hover:border-blue-500 transition-all">
               <span className="text-[10px] font-black text-gray-500 truncate block">{movie ? "تم تحميل الملف بنجاح" : "اختر ملف SVGA للضغط"}</span>
               <input type="file" accept=".svga" onChange={handleFile} className="hidden" />
            </label>

            <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-4">
               <label className="text-[9px] text-gray-500 font-black block uppercase tracking-widest">تحسين الأعداد (Precision)</label>
               <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(p => (
                    <button key={p} onClick={() => setPrecision(p)} className={`py-2 rounded-lg text-[9px] font-black transition-all ${precision === p ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-600'}`}>
                      {p === 0 ? 'صحيح' : `${p} عشري`}
                    </button>
                  ))}
               </div>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-4">
               <label className="text-[9px] text-gray-500 font-black block uppercase tracking-widest">حذف المكونات</label>
               <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                     <input type="checkbox" checked={stripShapes} onChange={e => setStripShapes(e.target.checked)} className="hidden" />
                     <div className={`w-10 h-6 rounded-full transition-all relative ${stripShapes ? 'bg-blue-600' : 'bg-gray-800'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${stripShapes ? 'right-1' : 'right-5'}`} />
                     </div>
                     <span className="text-[10px] font-black text-gray-400 group-hover:text-white">حذف الأشكال</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                     <input type="checkbox" checked={stripAudios} onChange={e => setStripAudios(e.target.checked)} className="hidden" />
                     <div className={`w-10 h-6 rounded-full transition-all relative ${stripAudios ? 'bg-blue-600' : 'bg-gray-800'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${stripAudios ? 'right-1' : 'right-5'}`} />
                     </div>
                     <span className="text-[10px] font-black text-gray-400 group-hover:text-white">حذف الصوتيات</span>
                  </label>
               </div>
            </div>

            <div className="p-5 bg-black/40 rounded-xl border border-white/5">
               <label className="text-[9px] text-gray-500 font-black block mb-3 uppercase tracking-widest">فريمات ناتجة ({targetFrames})</label>
               <input type="range" min="1" max={movie?.params.frames || 100} value={targetFrames} onChange={e => setTargetFrames(Number(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>

            <button onClick={startCompression} disabled={!movie || isProcessing} className="w-full py-4 lg:py-5 bg-blue-600 hover:bg-blue-500 rounded-xl lg:rounded-2xl font-black text-xs lg:text-sm shadow-xl active:scale-95 transition-all mb-4">
               بدء التحويل والضغط الفعلي
            </button>
         </div>
      </div>
      <style>{`
        .svga-canvas canvas {
          max-width: 100% !important;
          max-height: 100% !important;
          width: auto !important;
          height: auto !important;
        }
      `}</style>
    </div>
  );
};

export default CompressPage;
