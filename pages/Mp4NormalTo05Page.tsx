
import React, { useState, useRef } from 'react';

interface Mp4NormalTo05PageProps {
  onComplete?: () => void;
}

const Mp4NormalTo05Page: React.FC<Mp4NormalTo05PageProps> = ({ onComplete }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [fps, setFps] = useState(24);
  const [bitrate, setBitrate] = useState(10); 
  const [targetFrames, setTargetFrames] = useState<number | ''>('');
  
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

  const processTo05 = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    setIsProcessing(true);
    
    const w = video.videoWidth;
    const h = video.videoHeight;
    const duration = video.duration;
    const finalFrames = targetFrames === '' ? Math.floor(duration * fps) : targetFrames;
    const frameInterval = duration / finalFrames;

    const finalCanvas = canvasRef.current;
    const alphaW = Math.floor(w * 0.5);
    const alphaH = Math.floor(h * 0.5);
    finalCanvas.width = w + alphaW;
    finalCanvas.height = h;
    const ctx = finalCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const canvasStream = finalCanvas.captureStream(fps);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(video);
    const destination = audioCtx.createMediaStreamDestination();
    source.connect(destination);
    source.connect(audioCtx.destination);
    
    const audioTrack = destination.stream.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);

    const recorder = new MediaRecorder(canvasStream, { 
      mimeType: 'video/webm;codecs=vp8', 
      videoBitsPerSecond: bitrate * 1000000 
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(finalBlob);
      setPreviewSrc(videoUrl);
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `mido_0.5_export_${Date.now()}.mp4`;
      a.click();
      setIsProcessing(false);
      audioCtx.close();
      // Call onComplete when processing is finished
      onComplete?.();
    };

    recorder.start();
    video.play();
    video.muted = false;

    for (let i = 0; i < finalFrames; i++) {
      video.currentTime = i * frameInterval;
      await new Promise(r => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(null); };
        video.addEventListener('seeked', onSeeked);
      });

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, finalCanvas.width, h);
      ctx.drawImage(video, 0, 0, w, h, 0, 0, w, h);
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w; tempCanvas.height = h;
      const tCtx = tempCanvas.getContext('2d');
      tCtx?.drawImage(video, 0, 0, w, h);
      
      const imgData = tCtx?.getImageData(0, 0, w, h);
      if (imgData) {
        for (let j = 0; j < imgData.data.length; j += 4) {
          const gray = (imgData.data[j] + imgData.data[j+1] + imgData.data[j+2]) / 3;
          imgData.data[j] = imgData.data[j+1] = imgData.data[j+2] = gray;
          imgData.data[j+3] = 255;
        }
        tCtx?.putImageData(imgData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, w, h, w, 0, alphaW, alphaH);
      }
      setProgress(Math.round(((i + 1) / finalFrames) * 100));
    }
    video.pause();
    recorder.stop();
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden text-right bg-[#05070a]" dir="rtl">
      {/* Unified Preview Area (Left) */}
      <div className="flex-1 p-8 flex flex-col gap-6 relative">
         <div className="glass flex-1 rounded-[2.5rem] bg-black shadow-2xl relative overflow-hidden flex flex-col border-white/5">
            <div className="flex-1 flex items-center justify-center bg-[#0d1117] relative">
               <video ref={videoRef} className="hidden" muted />
               <div className="w-full h-full flex items-center justify-center bg-[#05070a]">
                  {previewSrc ? (
                      <video src={previewSrc} controls className="max-w-full max-h-full object-contain" />
                  ) : (
                      <div className="text-[10px] text-gray-800 font-black animate-pulse">
                          بانتظار تصدير فيديو 0.5 لمعاينة النتيجة...
                      </div>
                  )}
               </div>
            </div>
            {isProcessing && (
              <div className="p-6 bg-black/60 border-t border-white/5 backdrop-blur-md">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-indigo-400">Merging Audio + Alpha Map</span>
                    <span className="text-xs font-mono text-white">{progress}%</span>
                 </div>
                 <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{width: `${progress}%`}}></div>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Sidebar Controls (Right) */}
      <div className="w-[380px] glass border-r border-[#30363d] p-8 flex flex-col gap-8 bg-[#0d1117] shadow-2xl z-20">
         <div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter">تصدير 0.5 شفاف</h2>
            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-[3px]">Side-By-Side Pro</p>
         </div>
         <div className="space-y-6">
            <label className="block border-2 border-dashed border-gray-800 rounded-2xl p-6 cursor-pointer bg-black/40 text-center group">
                <span className="text-[10px] font-black text-gray-500 group-hover:text-indigo-400">{videoFile ? videoFile.name : "اختر فيديو MP4"}</span>
                <input type="file" accept="video/mp4" onChange={handleFile} className="hidden" />
            </label>
            <div className="grid grid-cols-2 gap-3">
               <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                  <label className="text-[9px] text-gray-500 font-black block mb-2 uppercase">إجمالي الفريمات</label>
                  <input type="number" value={targetFrames} onChange={e => setTargetFrames(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent text-white font-mono outline-none text-sm" />
               </div>
               <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                  <label className="text-[9px] text-gray-500 font-black block mb-2 uppercase">الجودة (Mbps)</label>
                  <input type="number" value={bitrate} onChange={e => setBitrate(Number(e.target.value))} className="w-full bg-transparent text-white font-mono outline-none text-sm" />
               </div>
            </div>
            <button onClick={processTo05} disabled={!videoFile || isProcessing} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">تصدير فيديو 0.5</button>
         </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Mp4NormalTo05Page;
