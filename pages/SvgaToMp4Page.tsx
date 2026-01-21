
import React, { useState, useRef, useEffect } from 'react';
import { SbsLayout } from '../types';

declare const SVGA: any;

interface SvgaToMp4PageProps {
  onComplete?: () => void;
}

const SvgaToMp4Page: React.FC<SvgaToMp4PageProps> = ({ onComplete }) => {
  const [svgaFile, setSvgaFile] = useState<File | null>(null);
  const [videoItem, setVideoItem] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [layout, setLayout] = useState<SbsLayout>(SbsLayout.COLOR_LEFT);
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
    if (e.target.files && e.target.files[0]) {
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

  const processToMp4 = async () => {
    if (!svgaFile || !videoItem || !canvasRef.current) return;
    setIsProcessing(true);
    
    const w = videoItem.videoSize.width;
    const h = videoItem.videoSize.height;
    const frames = videoItem.frames;
    const fps = videoItem.fps || 24;

    const finalCanvas = canvasRef.current;
    finalCanvas.width = w * 2;
    finalCanvas.height = h;
    const ctx = finalCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w; tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    const stream = finalCanvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp9', 
      videoBitsPerSecond: 20000000 
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `mido_sbs_1.1_${Date.now()}.mp4`;
      a.click();
      setIsProcessing(false);
      setProgress(0);
      // Call onComplete when processing is finished
      onComplete?.();
    };

    recorder.start();
    const tempDiv = document.createElement('div');
    const tempPlayer = new SVGA.Player(tempDiv);
    tempPlayer.setVideoItem(videoItem);

    for (let i = 0; i < frames; i++) {
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

        const colorX = layout === SbsLayout.COLOR_LEFT ? 0 : w;
        const alphaX = layout === SbsLayout.COLOR_LEFT ? w : 0;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, finalCanvas.width, h);
        ctx.drawImage(tempCanvas, colorX, 0);
        ctx.putImageData(alphaOutput, alphaX, 0);
      }
      if (i % 12 === 0) setPreviewSrc(finalCanvas.toDataURL('image/jpeg', 0.5));
      setProgress(Math.round(((i + 1) / frames) * 100));
      await new Promise(r => setTimeout(r, 1000/fps));
    }
    recorder.stop();
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden text-right bg-[#05070a]" dir="rtl">
      {/* Unified Preview Area (Left) */}
      <div className="flex-1 p-8 flex flex-col gap-6 relative">
         <div className="glass flex-1 rounded-[2.5rem] bg-black shadow-2xl relative overflow-hidden flex flex-col border-white/5">
            <div className="flex-1 flex items-center justify-center bg-[#05070a] relative">
                <div ref={containerRef} className="hidden"></div>
                {previewSrc ? (
                    <img src={previewSrc} className="max-w-full max-h-full object-contain" />
                ) : (
                    <div className="text-[10px] text-gray-800 font-black animate-pulse uppercase">
                        بانتظار بدء التصدير لمعاينة ناتج 1.1...
                    </div>
                )}
            </div>
            {isProcessing && (
              <div className="p-6 bg-black/60 border-t border-white/5 backdrop-blur-md">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-blue-400">Capturing Canvas Stream</span>
                    <span className="text-xs font-mono text-white">{progress}%</span>
                 </div>
                 <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all" style={{width: `${progress}%`}}></div>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Sidebar Controls (Right) */}
      <div className="w-[380px] glass border-r border-[#30363d] p-8 flex flex-col gap-8 bg-[#0d1117] shadow-2xl z-20">
         <div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter">تصدير SBS 1.1</h2>
            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-[3px]">SVGA to Transparent MP4</p>
         </div>
         <div className="space-y-6">
            <label className="block border-2 border-dashed border-gray-800 rounded-2xl p-6 cursor-pointer bg-black/40 text-center group">
                <span className="text-[10px] font-black text-gray-500 group-hover:text-blue-400">{svgaFile ? svgaFile.name : "اختر ملف SVGA"}</span>
                <input type="file" accept=".svga" onChange={handleFile} className="hidden" />
            </label>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
               <label className="text-[9px] text-gray-500 font-black block uppercase">تخطيط قنوات الـ SBS</label>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setLayout(SbsLayout.COLOR_LEFT)} className={`py-3 rounded-lg text-[9px] font-black ${layout === SbsLayout.COLOR_LEFT ? 'bg-blue-600 text-white' : 'bg-[#161b22] text-gray-600'}`}>اللون يسار</button>
                  <button onClick={() => setLayout(SbsLayout.ALPHA_LEFT)} className={`py-3 rounded-lg text-[9px] font-black ${layout === SbsLayout.ALPHA_LEFT ? 'bg-blue-600 text-white' : 'bg-[#161b22] text-gray-600'}`}>اللون يمين</button>
               </div>
            </div>
            <button onClick={processToMp4} disabled={!videoItem || isProcessing} className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">بدء التصدير النهائي</button>
         </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default SvgaToMp4Page;
