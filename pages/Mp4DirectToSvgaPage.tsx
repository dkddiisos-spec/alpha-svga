
import React, { useState, useRef } from 'react';
import { encodeSVGA } from '../services/svgaService';

interface Mp4DirectToSvgaPageProps {
  onComplete?: () => void;
}

const Mp4DirectToSvgaPage: React.FC<Mp4DirectToSvgaPageProps> = ({ onComplete }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fps, setFps] = useState(24);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setVideoFile(e.target.files[0]);
      if (videoRef.current) videoRef.current.src = URL.createObjectURL(e.target.files[0]);
    }
  };

  const processDirect = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    setIsProcessing(true);
    
    const w = video.videoWidth;
    const h = video.videoHeight;
    const duration = video.duration;
    const totalFrames = Math.floor(duration * fps);

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    canvasRef.current.width = w;
    canvasRef.current.height = h;

    const movieData: any = {
      version: "2.0",
      params: { viewBoxWidth: w, viewBoxHeight: h, fps: fps, frames: totalFrames },
      images: {}, sprites: []
    };

    const imageKeys: string[] = [];

    for (let i = 0; i < totalFrames; i++) {
      video.currentTime = (i / totalFrames) * duration;
      await new Promise(r => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(null); };
        video.addEventListener('seeked', onSeeked);
      });

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(video, 0, 0, w, h);
      
      const frameData = ctx.getImageData(0, 0, w, h);
      const data = frameData.data;
      for (let j = 0; j < data.length; j += 4) {
        const r = data[j], g = data[j+1], b = data[j+2];
        if (r < 25 && g < 25 && b < 25) data[j+3] = 0; 
      }
      ctx.putImageData(frameData, 0, 0);

      const buffer = await new Promise<ArrayBuffer | null>(r => {
        canvasRef.current!.toBlob(b => b ? b.arrayBuffer().then(r) : r(null), 'image/png');
      });
      
      if (!buffer) break;
      const key = `f_${i}`;
      movieData.images[key] = new Uint8Array(buffer);
      imageKeys.push(key);
      if (i % 5 === 0) setPreviewSrc(canvasRef.current.toDataURL('image/png'));
      setProgress(Math.round(((i + 1) / totalFrames) * 100));
    }

    imageKeys.forEach((key, i) => {
      movieData.sprites.push({
        imageKey: key,
        frames: new Array(totalFrames).fill(0).map((_, idx) => ({
          alpha: idx === i ? 1.0 : 0.0,
          layout: { x: 0, y: 0, width: w, height: h },
          transform: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
        }))
      });
    });

    const svgaBlob = await encodeSVGA(movieData);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(svgaBlob);
    a.download = `mido_direct_f${fps}_${Date.now()}.svga`;
    a.click();
    setIsProcessing(false);
    // Call onComplete when processing is finished
    onComplete?.();
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden text-right bg-[#05070a]" dir="rtl">
      {/* Unified Preview Area (Left) */}
      <div className="flex-1 p-8 flex flex-col gap-6 relative">
         <div className="glass flex-1 rounded-[2.5rem] bg-black shadow-2xl relative overflow-hidden flex flex-col border-white/5">
            <div className="flex-1 flex items-center justify-center bg-[#0d1117] svga-canvas overflow-hidden">
                <video ref={videoRef} className="hidden" muted />
                {previewSrc ? (
                    <img src={previewSrc} className="max-w-full max-h-full object-contain shadow-2xl" />
                ) : (
                    <div className="text-[10px] text-gray-800 font-black animate-pulse">
                        بانتظار التحويل لمعاينة نتيجة إزالة الخلفية...
                    </div>
                )}
            </div>
            {isProcessing && (
              <div className="p-6 bg-black/60 border-t border-white/5 backdrop-blur-md">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-green-400">Removing Black Pixels</span>
                    <span className="text-xs font-mono text-white">{progress}%</span>
                 </div>
                 <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 transition-all" style={{width: `${progress}%`}}></div>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Sidebar Controls (Right) */}
      <div className="w-[380px] glass border-r border-[#30363d] p-8 flex flex-col gap-8 bg-[#0d1117] shadow-2xl z-20">
         <div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter">عادي ↔ SVGA</h2>
            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-[3px]">Black Removal Engine</p>
         </div>
         <div className="space-y-6">
            <label className="block border-2 border-dashed border-gray-800 rounded-2xl p-6 cursor-pointer bg-black/40 text-center group">
                <span className="text-[10px] font-black text-gray-500 group-hover:text-green-400">{videoFile ? videoFile.name : "اختر فيديو MP4 عادي"}</span>
                <input type="file" accept="video/mp4" onChange={handleFile} className="hidden" />
            </label>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                <label className="text-[9px] text-gray-500 font-black block mb-2 uppercase">الفرمات (FPS)</label>
                <input type="number" value={fps} onChange={e => setFps(Number(e.target.value))} className="w-full bg-transparent text-white font-mono outline-none text-sm" />
            </div>
            <button onClick={processDirect} disabled={!videoFile || isProcessing} className="w-full py-5 bg-green-600 hover:bg-green-500 rounded-2xl font-black text-sm shadow-xl shadow-green-500/20 active:scale-95 transition-all">بدء التحويل الذكي</button>
         </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Mp4DirectToSvgaPage;
