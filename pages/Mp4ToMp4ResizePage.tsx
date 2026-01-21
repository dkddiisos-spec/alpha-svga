
import React, { useState, useRef } from 'react';

const Mp4ToMp4ResizePage: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [fps, setFps] = useState(24);
  const [bitrate, setBitrate] = useState(12);
  const [targetFrames, setTargetFrames] = useState<number | ''>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      videoRef.current!.src = URL.createObjectURL(file);
      videoRef.current!.onloadedmetadata = () => {
         setTargetFrames(Math.floor(videoRef.current!.duration * fps));
      };
    }
  };

  const processTo05 = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    
    const realWidth = (video.videoWidth / 2) | 0;
    const realHeight = video.videoHeight;
    const duration = video.duration;
    const finalFrames = targetFrames === '' ? Math.floor(duration * fps) : targetFrames;

    setIsProcessing(true);
    const finalCanvas = canvasRef.current;
    const alphaW = Math.floor(realWidth * 0.5);
    const alphaH = Math.floor(realHeight * 0.5);
    
    finalCanvas.width = realWidth + alphaW;
    finalCanvas.height = realHeight;
    const ctx = finalCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // دمج الصوت من الفيديو المصدر
    const stream = finalCanvas.captureStream(fps);
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(video);
      const destination = audioCtx.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioCtx.destination);
      const audioTrack = destination.stream.getAudioTracks()[0];
      if (audioTrack) stream.addTrack(audioTrack);
    } catch (e) {
      console.warn("Could not capture audio stream, exporting without sound.");
    }

    const recorder = new MediaRecorder(stream, { 
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
      a.download = `mido_1.1_to_0.5_q${bitrate}_f${finalFrames}_${Date.now()}.mp4`;
      a.click();
      setIsProcessing(false);
    };

    recorder.start();
    const frameInterval = duration / finalFrames;

    // تشغيل الفيديو لضمان التقاط الصوت أثناء التصدير إذا أمكن
    video.muted = false;
    video.play();

    for (let i = 0; i < finalFrames; i++) {
      video.currentTime = i * frameInterval;
      await new Promise(r => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(null); };
        video.addEventListener('seeked', onSeeked);
      });

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, finalCanvas.width, realHeight);
      ctx.drawImage(video, 0, 0, realWidth, realHeight, 0, 0, realWidth, realHeight);
      ctx.drawImage(video, realWidth, 0, realWidth, realHeight, realWidth, 0, alphaW, alphaH);

      setProgress(Math.round(((i + 1) / finalFrames) * 100));
    }
    
    video.pause();
    recorder.stop();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto page-enter text-right space-y-8" dir="rtl">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass p-8 rounded-[2.5rem] border-orange-500/20 shadow-2xl space-y-6 h-fit">
             <h2 className="text-xl font-black text-white italic">تحويل MP4 1.1 ← MP4 0.5 (مع الصوت)</h2>
             <p className="text-[10px] text-gray-400">تصدير فعلي يحافظ على الصوت ويقلل الحجم بنظام 0.5.</p>
             <div className="space-y-4">
                <label className="block border-2 border-dashed border-gray-800 rounded-2xl p-6 cursor-pointer bg-black/40 text-center">
                   <span className="text-xs font-bold text-gray-500">{videoFile ? videoFile.name : "اختر فيديو 1.1"}</span>
                   <input type="file" accept="video/mp4" onChange={handleFile} className="hidden" />
                </label>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-black/60 p-4 rounded-xl border border-white/5">
                      <label className="text-[10px] text-gray-500 font-black block mb-2">إجمالي الفريمات</label>
                      <input type="number" value={targetFrames} onChange={e => setTargetFrames(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent text-white font-mono outline-none" />
                   </div>
                   <div className="bg-black/60 p-4 rounded-xl border border-white/5">
                      <label className="text-[10px] text-gray-500 font-black block mb-2">الجودة (Mbps)</label>
                      <input type="number" value={bitrate} onChange={e => setBitrate(Number(e.target.value))} className="w-full bg-transparent text-white font-mono outline-none" />
                   </div>
                </div>
                <div className="bg-black/60 p-4 rounded-xl border border-white/5">
                   <label className="text-[10px] text-gray-500 font-black block mb-2">الفريمات بالثانية (FPS)</label>
                   <input type="number" value={fps} onChange={e => setFps(Number(e.target.value))} className="w-full bg-transparent text-white font-mono outline-none" />
                </div>
                <button onClick={processTo05} disabled={!videoFile || isProcessing} className="w-full py-5 bg-orange-600 rounded-2xl font-black shadow-xl active:scale-95 transition-all">
                   {isProcessing ? `جاري التصدير مع الصوت... ${progress}%` : "بدء التحويل الفعلي"}
                </button>
             </div>
          </div>
          <div className="glass p-8 rounded-[2.5rem] space-y-4 shadow-2xl">
             <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">فيديو المصدر 1.1</h3>
             <video ref={videoRef} controls className="w-full bg-black rounded-2xl border border-white/5 aspect-video object-contain" />
          </div>
          <div className="glass p-8 rounded-[2.5rem] space-y-4 shadow-2xl bg-black/80">
             <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest">المعاينة النهائية</h3>
             <div className="bg-black rounded-2xl aspect-square overflow-hidden flex items-center justify-center border border-orange-500/10">
                {previewSrc ? <video src={previewSrc} controls className="w-full h-full object-contain" /> : <div className="text-[10px] text-gray-800 font-black">انتظار التصدير</div>}
             </div>
          </div>
       </div>
       <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Mp4ToMp4ResizePage;
