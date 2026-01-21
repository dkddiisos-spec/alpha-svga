
import React, { useState, useRef, useEffect } from 'react';
import { decodeSVGA, encodeSVGA } from '../services/svgaService';
import { SVGAMovieEntity } from '../types';

declare const SVGA: any;

interface SvgaAddSoundPageProps {
  onComplete?: () => void;
}

const SvgaAddSoundPage: React.FC<SvgaAddSoundPageProps> = ({ onComplete }) => {
  const [movie, setMovie] = useState<SVGAMovieEntity | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioFiles, setAudioFiles] = useState<{name: string, data: Uint8Array}[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current && !playerRef.current && typeof SVGA !== 'undefined') {
      playerRef.current = new SVGA.Player(containerRef.current);
    }
  }, []);

  const handleSvga = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const buffer = await file.arrayBuffer();
      const decoded = await decodeSVGA(buffer);
      setMovie(decoded);
      
      const existingAudios = [];
      if (decoded.audios) {
         for (const [name, data] of Object.entries(decoded.audios)) {
            existingAudios.push({ name, data });
         }
      }
      setAudioFiles(existingAudios);

      if (playerRef.current) {
        const parser = new SVGA.Parser();
        parser.load(URL.createObjectURL(file), (item: any) => {
          playerRef.current.setVideoItem(item);
          playerRef.current.startAnimation();
        });
      }
    }
  };

  const handleAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files?.[0]) {
        const file = e.target.files[0];
        const buffer = await file.arrayBuffer();
        setAudioFiles([...audioFiles, { name: file.name, data: new Uint8Array(buffer) }]);
     }
  };

  const saveSvga = async () => {
    if (!movie) return;
    setIsProcessing(true);
    const finalAudios: Record<string, Uint8Array> = {};
    audioFiles.forEach(a => { finalAudios[a.name] = a.data; });
    const finalData = { ...movie, audios: finalAudios };
    const blob = await encodeSVGA(finalData);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mido_audio_svga_${Date.now()}.svga`;
    a.click();
    setIsProcessing(false);
    // Call onComplete when processing is finished
    onComplete?.();
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden text-right bg-[#05070a]" dir="rtl">
      {/* View Area (Left) */}
      <div className="flex-1 p-8 flex flex-col gap-6 relative">
         <div className="glass flex-1 rounded-[2.5rem] bg-black shadow-2xl relative overflow-hidden flex flex-col border-white/5">
            <h3 className="p-6 text-[10px] font-black text-pink-500 uppercase tracking-widest border-b border-white/5 bg-[#0d1117]">معاينة الملف وإدارة الصوتيات</h3>
            <div ref={containerRef} className="flex-1 svga-canvas overflow-hidden flex items-center justify-center">
               {!movie && <div className="text-[10px] text-gray-800 font-black animate-pulse">Waiting for SVGA...</div>}
            </div>
            <div className="p-6 bg-black/60 backdrop-blur-md border-t border-white/5">
               <div className="flex flex-wrap gap-3">
                  {audioFiles.map((a, i) => (
                    <div key={i} className="bg-pink-600/10 border border-pink-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
                       <span className="text-[10px] font-mono text-white truncate max-w-[120px]">{a.name}</span>
                       <button onClick={() => setAudioFiles(audioFiles.filter((_, idx) => idx !== i))} className="text-pink-500 hover:text-white transition-colors">✕</button>
                    </div>
                  ))}
                  {audioFiles.length === 0 && <span className="text-[10px] text-gray-600 italic">لا توجد ملفات صوتية مدمجة حالياً...</span>}
               </div>
            </div>
         </div>
      </div>

      {/* Control Sidebar (Right) */}
      <div className="w-[380px] glass border-r border-[#30363d] p-8 flex flex-col gap-8 bg-[#0d1117] shadow-2xl z-20">
         <div><h2 className="text-2xl font-black text-white italic tracking-tighter">إضافة صوت SVGA</h2><p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-[3px]">Audio Injection Unit</p></div>
         <div className="space-y-6">
            <label className="block border-2 border-dashed border-gray-800 rounded-2xl p-6 cursor-pointer bg-black/40 text-center hover:border-pink-500 transition-all">
               <span className="text-[10px] font-black text-gray-500">{movie ? "تم تحميل SVGA ✓" : "اختر ملف SVGA"}</span>
               <input type="file" accept=".svga" onChange={handleSvga} className="hidden" />
            </label>
            <div className="p-5 bg-black/40 rounded-xl border border-white/5 space-y-4">
               <label className="text-[9px] text-gray-500 font-black block uppercase tracking-widest">إضافة مقاطع صوت (MP3/WAV)</label>
               <label className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl cursor-pointer block text-center text-[10px] font-black transition-all">
                  + اختر ملف صوتي
                  <input type="file" accept="audio/*" onChange={handleAudio} className="hidden" />
               </label>
            </div>
            <button onClick={saveSvga} disabled={!movie || isProcessing} className="w-full py-5 bg-pink-600 hover:bg-pink-500 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">
               حقن وحفظ الملف النهائي
            </button>
         </div>
      </div>
    </div>
  );
};

export default SvgaAddSoundPage;
