
import React, { useState, useRef } from 'react';
import { encodeSVGA } from '../services/svgaService';
import { SbsLayout } from '../types';

interface ConvertPageProps {
  onComplete?: () => void;
}

const ConvertPage: React.FC<ConvertPageProps> = ({ onComplete }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fps, setFps] = useState(24);
  const [qualityScale, setQualityScale] = useState(1.0);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [layout, setLayout] = useState<SbsLayout>(SbsLayout.COLOR_LEFT);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      if (videoRef.current) videoRef.current.src = url;
    }
  };

  const processConvert = async () => {
    if (!videoFile || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    setIsProcessing(true);
    setProgress(0);

    const realWidth = (video.videoWidth / 2) | 0;
    const realHeight = video.videoHeight | 0;
    const finalW = Math.floor(realWidth * qualityScale);
    const finalH = Math.floor(realHeight * qualityScale);
    const duration = video.duration;
    const totalFrames = Math.floor(duration * fps);

    const movieData: any = {
      version: "2.0",
      params: { viewBoxWidth: finalW, viewBoxHeight: finalH, fps: fps, frames: totalFrames },
      images: {}, sprites: []
    };

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    canvasRef.current.width = finalW; canvasRef.current.height = finalH;

    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = video.videoWidth; bufferCanvas.height = video.videoHeight;
    const bCtx = bufferCanvas.getContext('2d', { willReadFrequently: true });

    for (let i = 0; i < totalFrames; i++) {
      video.currentTime = (i / totalFrames) * duration;
      await new Promise(r => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(null); };
        video.addEventListener('seeked', onSeeked);
      });

      bCtx?.drawImage(video, 0, 0);
      const colorX = layout === SbsLayout.COLOR_LEFT ? 0 : realWidth;
      const alphaX = layout === SbsLayout.COLOR_LEFT ? realWidth : 0;

      const colorData = bCtx?.getImageData(colorX, 0, realWidth, realHeight);
      const alphaData = bCtx?.getImageData(alphaX, 0, realWidth, realHeight);

      if (colorData && alphaData) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = realWidth; tempCanvas.height = realHeight;
        const tCtx = tempCanvas.getContext('2d');
        const frameImg = tCtx!.createImageData(realWidth, realHeight);
        for (let j = 0; j < colorData.data.length; j += 4) {
          frameImg.data[j] = colorData.data[j];
          frameImg.data[j+1] = colorData.data[j+1];
          frameImg.data[j+2] = colorData.data[j+2];
          frameImg.data[j+3] = alphaData.data[j];   
        }
        tCtx!.putImageData(frameImg, 0, 0);
        ctx.clearRect(0, 0, finalW, finalH);
        ctx.drawImage(tempCanvas, 0, 0, realWidth, realHeight, 0, 0, finalW, finalH);
      }

      const buffer = await new Promise<ArrayBuffer | null>(r => {
        canvasRef.current!.toBlob(b => b ? b.arrayBuffer().then(r) : r(null), 'image/png');
      });
      
      if (!buffer) break;
      const key = `f_${i}`;
      movieData.images[key] = new Uint8Array(buffer);
      movieData.sprites.push({
        imageKey: key,
        frames: new Array(totalFrames).fill(0).map((_, idx) => ({
          alpha: idx === i ? 1.0 : 0.0,
          layout: { x: 0, y: 0, width: finalW, height: finalH },
          transform: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
        }))
      });

      if (i % 5 === 0) setPreviewSrc(canvasRef.current.toDataURL());
      setProgress(Math.round(((i + 1) / totalFrames) * 100));
    }

    const svgaBlob = await encodeSVGA(movieData);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(svgaBlob);
    a.download = `mido_1.1_to_svga_${Date.now()}.svga`;
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
            <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#0d1117] svga-canvas">
                <video ref={videoRef} className="hidden" muted />
                {previewSrc ? (
                    <img src={previewSrc} className="max-w-full max-h-full object-contain shadow-2xl" />
                ) : (
                    <div className="text-[11px] text-gray-800 font-black italic uppercase animate-pulse">
                        بانتظار بدء التحويل لمعاينة النتيجة الشفافة...
                    </div>
                )}
            </div>

            {isProcessing && (
              <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md p-6 border-t border-white/5 animate-in slide-in-from-bottom-full">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-blue-400 uppercase">Processing Frame Pipeline</span>
                    <span className="text-xs font-mono text-white">{progress}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.8)]" style={{width: `${progress}%`}}></div>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Side Controls (Right) */}
      <div className="w-[380px] glass border-r border-[#30363d] p-8 flex flex-col gap-8 bg-[#0d1117] shadow-2xl z-20 overflow-y-auto no-scrollbar">
         <div>
           <h2 className="text-2xl font-black text-white italic tracking-tighter">تحويل 1.1 ← SVGA</h2>
           <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-[3px]">Binary Export Engine</p>
         </div>

         <div className="space-y-6">
            <label className="block border-2 border-dashed border-gray-800 rounded-2xl p-6 cursor-pointer bg-black/40 hover:border-blue-500 transition-all text-center group">
               <span className="text-[10px] font-black text-gray-500 group-hover:text-blue-400 truncate block">{videoFile ? videoFile.name : "اختر ملف فيديو 1.1"}</span>
               <input type="file" accept="video/mp4" onChange={handleFile} className="hidden" />
            </label>

            <div className="grid grid-cols-2 gap-3">
               <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                  <label className="text-[9px] text-gray-500 font-black block mb-2 uppercase">إطارات (FPS)</label>
                  <input type="number" value={fps} onChange={e => setFps(Number(e.target.value))} className="w-full bg-transparent text-white font-mono outline-none text-sm" />
               </div>
               <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                  <label className="text-[9px] text-gray-500 font-black block mb-2 uppercase">الجودة (Scale)</label>
                  <select value={qualityScale} onChange={e => setQualityScale(Number(e.target.value))} className="w-full bg-transparent text-white outline-none text-[10px] font-bold">
                     <option value={1.0}>100%</option>
                     <option value={0.7}>70%</option>
                     <option value={0.5}>50%</option>
                  </select>
               </div>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
               <label className="text-[9px] text-gray-500 font-black block uppercase">تخطيط قنوات الـ SBS</label>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setLayout(SbsLayout.COLOR_LEFT)} className={`py-3 rounded-lg text-[9px] font-black ${layout === SbsLayout.COLOR_LEFT ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#161b22] text-gray-600 hover:text-white'}`}>اللون يسار</button>
                  <button onClick={() => setLayout(SbsLayout.ALPHA_LEFT)} className={`py-3 rounded-lg text-[9px] font-black ${layout === SbsLayout.ALPHA_LEFT ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#161b22] text-gray-600 hover:text-white'}`}>اللون يمين</button>
               </div>
            </div>

            <button 
              onClick={processConvert} 
              disabled={!videoFile || isProcessing} 
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
               {isProcessing ? "جاري التوليد..." : "بدء تحويل الملف"}
            </button>
         </div>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ConvertPage;
