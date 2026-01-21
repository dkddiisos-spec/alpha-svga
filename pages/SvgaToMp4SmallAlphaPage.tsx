
import React, { useState, useRef, useEffect } from 'react';

declare const SVGA: any;

const SvgaToMp4SmallAlphaPage: React.FC = () => {
  const [svgaFile, setSvgaFile] = useState<File | null>(null);
  const [videoItem, setVideoItem] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current && !playerRef.current) {
      playerRef.current = new SVGA.Player(containerRef.current);
    }
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSvgaFile(file);
      const url = URL.createObjectURL(file);
      const parser = new SVGA.Parser();
      parser.load(url, (item: any) => {
        if (playerRef.current) playerRef.current.setVideoItem(item);
        setVideoItem(item);
      });
    }
  };

  const processToSmallMp4 = async () => {
    if (!videoItem || !canvasRef.current) return;
    
    const w = videoItem.videoSize.width;
    const h = videoItem.videoSize.height;
    const frames = videoItem.frames;
    const fps = videoItem.fps || 24;

    setIsProcessing(true);
    
    const finalCanvas = canvasRef.current;
    const alphaW = Math.floor(w * 0.5);
    const alphaH = Math.floor(h * 0.5);
    
    finalCanvas.width = w + alphaW;
    finalCanvas.height = h;
    const ctx = finalCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // كانفاس وسيط شفاف
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    const stream = finalCanvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp9', 
      videoBitsPerSecond: 15000000 
    });
    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `mido_alpha_0.5_fixed_${Date.now()}.mp4`;
      a.click();
      setIsProcessing(false);
      setProgress(0);
    };
    recorder.start();

    const tempDiv = document.createElement('div');
    const tempPlayer = new SVGA.Player(tempDiv);
    tempPlayer.setVideoItem(videoItem);

    const frameDuration = 1000 / fps;

    for (let i = 0; i < frames; i++) {
      const startTime = performance.now();
      
      (tempPlayer as any).stepToFrame(i, false);
      const internalCanvas = (tempPlayer as any)._drawingLayer?.canvas || tempDiv.querySelector('canvas');
      
      if (internalCanvas && tCtx) {
        tCtx.clearRect(0, 0, w, h);
        tCtx.drawImage(internalCanvas, 0, 0, w, h);
        
        const frameData = tCtx.getImageData(0, 0, w, h);
        const data = frameData.data;
        const alphaOutput = ctx.createImageData(w, h);
        const out = alphaOutput.data;
        
        for (let j = 0; j < data.length; j += 4) {
          const a = data[j+3];
          out[j] = out[j+1] = out[j+2] = a;
          out[j+3] = 255;
        }

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, finalCanvas.width, h);
        
        // 1. الملون (يسار 100%)
        ctx.drawImage(tempCanvas, 0, 0);
        
        // 2. الشفافية (يمين فوق 50%)
        const alphaTemp = document.createElement('canvas');
        alphaTemp.width = w; alphaTemp.height = h;
        const aCtx = alphaTemp.getContext('2d');
        if (aCtx) {
           aCtx.putImageData(alphaOutput, 0, 0);
           ctx.drawImage(alphaTemp, 0, 0, w, h, w, 0, alphaW, alphaH);
        }
      }

      if (i % 10 === 0) setPreviewSrc(finalCanvas.toDataURL('image/jpeg', 0.6));
      setProgress(Math.round(((i + 1) / frames) * 100));
      
      const elapsed = performance.now() - startTime;
      await new Promise(r => setTimeout(r, Math.max(0, frameDuration - elapsed)));
    }

    recorder.stop();
  };

  return (
    <div className="p-10 max-w-6xl mx-auto page-enter space-y-8 text-right" dir="rtl">
      <div className="glass p-10 rounded-[3rem] border-indigo-500/20 shadow-2xl space-y-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 bg-indigo-600 text-white text-[10px] font-black rounded-bl-2xl">0.5 PRO ENGINE</div>
         <h2 className="text-3xl font-black text-white italic">تصدير MP4 (شفافية 0.5 دقيقة)</h2>
         <p className="text-gray-400 text-sm">تم ضبط نظام استخراج خيال الـ SVGA ليكون أبيض نقي في الجانب الأيمن العلوي.</p>
         
         <label className="block border-2 border-dashed border-gray-800 rounded-3xl p-16 cursor-pointer bg-[#05070a] hover:border-indigo-500 transition-all">
            <span className="text-indigo-400 font-bold text-lg">{svgaFile ? svgaFile.name : "اضغط هنا لاختيار ملف الـ SVGA"}</span>
            <input type="file" accept=".svga" onChange={handleFile} className="hidden" />
         </label>

         <button onClick={processToSmallMp4} disabled={!videoItem || isProcessing} className="w-full py-6 bg-indigo-600 rounded-3xl font-black text-xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
            {isProcessing ? `جاري المزامنة والاستخراج... ${progress}%` : "تصدير فيديو شفاف 0.5"}
         </button>
      </div>

      <div className="flex justify-center">
         <div className="glass p-4 rounded-3xl border border-white/5 bg-black">
            {previewSrc && <img src={previewSrc} className="max-h-80 rounded-xl shadow-2xl" />}
         </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SvgaToMp4SmallAlphaPage;
