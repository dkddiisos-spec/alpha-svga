
import React, { useState, useRef } from 'react';

const Mp4ColorToSbsPage: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [alphaMode, setAlphaMode] = useState<'solid' | 'black-removal'>('solid');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [fps, setFps] = useState(24);
  const [bitrate, setBitrate] = useState(25);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setVideoFile(e.target.files[0]);
      const url = URL.createObjectURL(e.target.files[0]);
      if (videoRef.current) videoRef.current.src = url;
    }
  };

  const processToSbs = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    
    const w = video.videoWidth;
    const h = video.videoHeight;
    const duration = video.duration;
    const totalFrames = Math.floor(duration * fps);

    setIsProcessing(true);
    const finalCanvas = canvasRef.current;
    finalCanvas.width = w * 2;
    finalCanvas.height = h;
    const ctx = finalCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // --- التقاط الصوت الفعلي ---
    const canvasStream = finalCanvas.captureStream(fps);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(video);
    const destination = audioCtx.createMediaStreamDestination();
    source.connect(destination);
    source.connect(audioCtx.destination);
    
    const audioTrack = destination.stream.getAudioTracks()[0];
    if (audioTrack) {
      canvasStream.addTrack(audioTrack);
    }

    const recorder = new MediaRecorder(canvasStream, { 
      mimeType: 'video/webm;codecs=vp8', 
      videoBitsPerSecond: bitrate * 1000000 
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setPreviewSrc(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mido_sbs_audio_fixed_${Date.now()}.mp4`;
      a.click();
      setIsProcessing(false);
      audioCtx.close();
    };

    recorder.start();
    video.play();
    video.muted = false;

    const frameTime = 1000 / fps;
    for (let i = 0; i < totalFrames; i++) {
      if (!canvasRef.current) break;
      const start = performance.now();
      video.currentTime = (i / totalFrames) * duration;
      await new Promise(r => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(null); };
        video.addEventListener('seeked', onSeeked);
      });

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, finalCanvas.width, h);
      ctx.drawImage(video, 0, 0, w, h, 0, 0, w, h);
      
      if (alphaMode === 'solid') {
        ctx.fillStyle = "white";
        ctx.fillRect(w, 0, w, h);
      } else {
        const colorData = ctx.getImageData(0, 0, w, h);
        const alphaOutput = ctx.createImageData(w, h);
        for (let j = 0; j < colorData.data.length; j += 4) {
          const brightness = (colorData.data[j] + colorData.data[j+1] + colorData.data[j+2]) / 3;
          alphaOutput.data[j] = alphaOutput.data[j+1] = alphaOutput.data[j+2] = brightness;
          alphaOutput.data[j+3] = 255;
        }
        ctx.putImageData(alphaOutput, w, 0);
      }

      setProgress(Math.round(((i + 1) / totalFrames) * 100));
      const elapsed = performance.now() - start;
      await new Promise(r => setTimeout(r, Math.max(0, frameTime - elapsed)));
    }

    video.pause();
    recorder.stop();
  };

  return (
    <div className="p-10 max-w-6xl mx-auto page-enter space-y-10 text-right" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass p-10 rounded-[3.5rem] border-cyan-500/20 shadow-2xl space-y-10">
           <h2 className="text-3xl font-black text-white italic">ملون ← SBS 1.1 (دعم الصوت)</h2>
           <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setAlphaMode('solid')} className={`p-6 rounded-3xl border-2 transition-all ${alphaMode === 'solid' ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-800 bg-black text-gray-500'}`}>الشفافية الكاملة</button>
              <button onClick={() => setAlphaMode('black-removal')} className={`p-6 rounded-3xl border-2 transition-all ${alphaMode === 'black-removal' ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-800 bg-black text-gray-500'}`}>تحويل الأسود</button>
           </div>
           <button onClick={processToSbs} disabled={!videoFile || isProcessing} className="w-full py-8 bg-cyan-600 rounded-3xl font-black text-2xl shadow-xl transition-all">
              {isProcessing ? `جاري المزامنة مع الصوت... ${progress}%` : "تصدير فيديو SBS مدموج بالصوت"}
           </button>
           <input type="file" accept="video/mp4" onChange={handleFile} className="w-full bg-black border border-gray-800 p-6 rounded-3xl text-xs" />
        </div>
        <div className="glass p-10 rounded-[3.5rem] bg-black flex items-center justify-center min-h-[400px]">
           {previewSrc ? <video src={previewSrc} controls className="w-full rounded-2xl" /> : <div className="text-gray-800 font-black italic uppercase">شاشة المعاينة النهائية</div>}
        </div>
      </div>
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Mp4ColorToSbsPage;
