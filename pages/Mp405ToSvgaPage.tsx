
import React, { useState, useRef } from 'react';
import { encodeSVGA } from '../services/svgaService';

interface Mp405ToSvgaPageProps {
  onComplete?: () => void;
}

const Mp405ToSvgaPage: React.FC<Mp405ToSvgaPageProps> = ({ onComplete }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fps, setFps] = useState(24);
  const [qualityScale, setQualityScale] = useState(1.0);
  const [targetFrames, setTargetFrames] = useState<number | ''>('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      if (videoRef.current) {
          videoRef.current.src = url;
          videoRef.current.onloadedmetadata = () => {
             setTargetFrames(Math.floor(videoRef.current!.duration * fps));
          };
      }
    }
  };

  const processConvert = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    setIsProcessing(true);
    
    const realWidth = Math.round(video.videoWidth / 1.5);
    const realHeight = video.videoHeight;
    const duration = video.duration;
    const finalFrames = targetFrames === '' ? Math.floor(duration * fps) : targetFrames;
    const actualFps = finalFrames / duration;

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const finalW = Math.floor(realWidth * qualityScale);
    const finalH = Math.floor(realHeight * qualityScale);
    canvasRef.current.width = finalW;
    canvasRef.current.height = finalH;

    const movieData: any = {
      version: "2.0",
      params: { viewBoxWidth: finalW, viewBoxHeight: finalH, fps: Math.round(actualFps), frames: finalFrames },
      images: {}, sprites: []
    };

    const imageKeys: string[] = [];
    const frameInterval = duration / finalFrames;

    for (let i = 0; i < finalFrames; i++) {
      video.currentTime = i * frameInterval;
      await new Promise(r => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(null); };
        video.addEventListener('seeked', onSeeked);
      });

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = realWidth; tempCanvas.height = realHeight;
      const tCtx = tempCanvas.getContext('2d');
      tCtx?.drawImage(video, 0, 0, realWidth, realHeight, 0, 0, realWidth, realHeight);
      const colorData = tCtx?.getImageData(0, 0, realWidth, realHeight);

      const alphaTemp = document.createElement('canvas');
      alphaTemp.width = realWidth; alphaTemp.height = realHeight;
      const atCtx = alphaTemp.getContext('2d');
      atCtx?.drawImage(video, realWidth, 0, video.videoWidth - realWidth, realHeight * 0.5, 0, 0, realWidth, realHeight);
      const alphaData = atCtx?.getImageData(0, 0, realWidth, realHeight);

      if (colorData && alphaData) {
        for (let j = 0; j < colorData.data.length; j += 4) {
          colorData.data[j+3] = alphaData.data[j];
        }
        tCtx?.putImageData(colorData, 0, 0);
        ctx.clearRect(0, 0, finalW, finalH);
        ctx.drawImage(tempCanvas, 0, 0, realWidth, realHeight, 0, 0, finalW, finalH);
      }

      const buffer = await new Promise<ArrayBuffer | null>(r => {
        canvasRef.current!.toBlob(b => b ? b.arrayBuffer().then(r) : r(null), 'image/png');
      });
      
      if (!buffer) break;
      const key = `f_${i}`;
      movieData.images[key] = new Uint8Array(buffer);
      imageKeys.push(key);
      if (i % 5 === 0) setPreviewSrc(canvasRef.current.toDataURL());
      setProgress(Math.round(((i + 1) / finalFrames) * 100));
    }

    imageKeys.forEach((key, i) => {
      movieData.sprites.push({
        imageKey: key,
        frames: new Array(finalFrames).fill(0).map((_, idx) => ({
          alpha: idx === i ? 1.0 : 0.0,
          layout: { x: 0, y: 0, width: finalW, height: finalH },
          transform: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
        }))
      });
    });

    const svgaBlob = await encodeSVGA(movieData);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(svgaBlob);
    a.download = `mido_05_convert_${Date.now()}.svga`;
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
            <div className="flex-1 flex items-center justify-center bg-[#0d1117] svga-canvas">
               <video ref={videoRef} className="hidden" muted />
               {previewSrc ? (
                   <img src={previewSrc} className="max-w-full max-h-full object-contain" />
               ) : (
                   <div className="text-[10px] text-gray-800 font-black animate-pulse uppercase">
                       بانتظار التحويل لمعاينة النتيجة الشفافة...
                   </div>
               )}
            </div>

            {isProcessing && (
              <div className="p-6 bg-black/60 border-t border-white/5 backdrop-blur-md">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-blue-400">Exporting SVGA Binary</span>
                    <span className="text-xs font-mono text-white">{progress}%</span>
                 </div>
                 <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all" style={{width: `${progress}%`}}></div>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Controls Sidebar (Right) */}
      <div className="w-[380px] glass border-r border-[#30363d] p-8 flex flex-col gap-8 bg-[#0d1117] shadow-2xl z-20">
         <div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter">تحويل 0.5 ← SVGA</h2>
            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-[3px]">High Efficiency Pipeline</p>
         </div>
         <div className="space-y-6 overflow-y-auto no-scrollbar pb-10">
            <label className="block border-2 border-dashed border-gray-800 rounded-2xl p-6 cursor-pointer bg-black/40 text-center group">
                <span className="text-[10px] font-black text-gray-500 group-hover:text-blue-400">{videoFile ? videoFile.name : "اختر فيديو 0.5"}</span>
                <input type="file" accept="video/mp4" onChange={handleFile} className="hidden" />
            </label>
            <div className="grid grid-cols-2 gap-3">
               <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                  <label className="text-[9px] text-gray-500 font-black block mb-2 uppercase">الفريمات</label>
                  <input type="number" value={targetFrames} onChange={e => setTargetFrames(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent text-white font-mono outline-none text-sm" />
               </div>
               <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                  <label className="text-[9px] text-gray-500 font-black block mb-2 uppercase">الجودة</label>
                  <select value={qualityScale} onChange={e => setQualityScale(Number(e.target.value))} className="w-full bg-transparent text-white outline-none text-[10px] font-bold">
                     <option value={1.0}>100%</option>
                     <option value={0.5}>50%</option>
                  </select>
               </div>
            </div>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                <label className="text-[9px] text-gray-500 font-black block mb-2 uppercase">السرعة (FPS)</label>
                <input type="number" value={fps} onChange={e => setFps(Number(e.target.value))} className="w-full bg-transparent text-white font-mono outline-none text-sm" />
            </div>
            <button onClick={processConvert} disabled={!videoFile || isProcessing} className="w-full py-5 bg-blue-600 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all">بدء معالجة 0.5</button>
         </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Mp405ToSvgaPage;
