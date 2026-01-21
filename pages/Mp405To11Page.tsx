
import React, { useState, useRef } from 'react';

interface Mp405To11PageProps {
  onComplete?: () => void;
}

const Mp405To11Page: React.FC<Mp405To11PageProps> = ({ onComplete }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [fps, setFps] = useState(24);
  const [bitrate, setBitrate] = useState(20); 
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setVideoFile(e.target.files[0]);
      videoRef.current!.src = URL.createObjectURL(e.target.files[0]);
    }
  };

  const processTo11 = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    
    // في نظام 0.5: العرض الكلي = العرض الأصلي * 1.5
    const realWidth = Math.round(video.videoWidth / 1.5);
    const realHeight = video.videoHeight;
    const duration = video.duration;
    const totalFrames = Math.floor(duration * fps);

    setIsProcessing(true);
    const finalCanvas = canvasRef.current;
    
    // نظام 1.1: العرض الكلي = العرض الأصلي * 2
    finalCanvas.width = realWidth * 2;
    finalCanvas.height = realHeight;
    const ctx = finalCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // دمج الصوت
    const stream = finalCanvas.captureStream(fps);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
      const source = audioCtx.createMediaElementSource(video);
      const destination = audioCtx.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioCtx.destination);
      const audioTrack = destination.stream.getAudioTracks()[0];
      if (audioTrack) stream.addTrack(audioTrack);
    } catch (e) {
      console.warn("Audio capture failed");
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
      a.download = `mido_05_to_11_audio_${Date.now()}.mp4`;
      a.click();
      setIsProcessing(false);
      audioCtx.close();
      // Call onComplete when processing is finished
      onComplete?.();
    };

    recorder.start();
    video.play();
    video.muted = false;

    const frameInterval = duration / totalFrames;

    for (let i = 0; i < totalFrames; i++) {
      video.currentTime = i * frameInterval;
      await new Promise(r => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(null); };
        video.addEventListener('seeked', onSeeked);
      });

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, finalCanvas.width, realHeight);
      
      // 1. رسم الملون (يسار المصدر)
      ctx.drawImage(video, 0, 0, realWidth, realHeight, 0, 0, realWidth, realHeight);
      
      // 2. رسم الشفافية (يمين المصدر مصغرة) وتكبيرها إلى 100% في اليمين الجديد
      ctx.drawImage(video, realWidth, 0, video.videoWidth - realWidth, realHeight * 0.5, realWidth, 0, realWidth, realHeight);

      setProgress(Math.round(((i + 1) / totalFrames) * 100));
    }
    
    video.pause();
    recorder.stop();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto page-enter text-right space-y-8" dir="rtl">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass p-8 rounded-[2.5rem] border-purple-500/20 shadow-2xl space-y-6 h-fit">
             <h2 className="text-xl font-black text-white italic">تحويل 0.5 ← 1.1 (فعلي مدمج بصوت)</h2>
             <div className="space-y-4">
                <label className="block border-2 border-dashed border-gray-800 rounded-2xl p-6 cursor-pointer bg-black/40 text-center">
                   <span className="text-xs font-bold text-gray-500">{videoFile ? videoFile.name : "اختر فيديو 0.5"}</span>
                   <input type="file" accept="video/mp4" onChange={handleFile} className="hidden" />
                </label>
                <div className="bg-black/60 p-4 rounded-xl border border-white/5">
                   <label className="text-[10px] text-gray-500 font-black block mb-2">الجودة (Bitrate Mbps)</label>
                   <input type="number" value={bitrate} onChange={e => setBitrate(Number(e.target.value))} className="w-full bg-transparent text-white font-mono outline-none" />
                </div>
                <button onClick={processTo11} disabled={!videoFile || isProcessing} className="w-full py-5 bg-purple-600 rounded-2xl font-black shadow-xl active:scale-95 transition-all">
                   {isProcessing ? `جاري المعالجة... ${progress}%` : "تصدير فيديو 1.1 كامل"}
                </button>
             </div>
          </div>
          <div className="glass p-8 rounded-[2.5rem] space-y-4 shadow-2xl">
             <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">معاينة المصدر 0.5</h3>
             <video ref={videoRef} controls className="w-full bg-black rounded-2xl border border-white/5 aspect-video object-contain" />
          </div>
          <div className="glass p-8 rounded-[2.5rem] space-y-4 shadow-2xl bg-black/80">
             <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest">معاينة الناتج 1.1</h3>
             <div className="bg-black rounded-2xl aspect-square overflow-hidden flex items-center justify-center border border-purple-500/10">
                {previewSrc ? <video src={previewSrc} controls className="w-full h-full object-contain" /> : <div className="text-[10px] text-gray-800 font-black">بانتظار التحويل</div>}
             </div>
          </div>
       </div>
       <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Mp405To11Page;
