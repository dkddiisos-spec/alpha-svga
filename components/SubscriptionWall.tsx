
import React, { useState } from 'react';
import { LicenseKey, SiteConfig, UserStats } from '../types';
import { apiService } from '../services/apiService';

interface SubscriptionWallProps {
  onUnlock: () => void;
  config: SiteConfig;
  deviceId: string;
  userStats: UserStats | null;
}

const SubscriptionWall: React.FC<SubscriptionWallProps> = ({ onUnlock, config, deviceId, userStats }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = async () => {
    const trimmedKey = inputKey.trim();
    if (!trimmedKey) return;
    setIsVerifying(true);
    setError('');

    if (trimmedKey === 'tooty.mido') {
      localStorage.setItem('active_mido_key', 'tooty.mido');
      setIsVerifying(false);
      // نقوم بعمل تحديث كامل للموقع لضمان تفعيل الصلاحيات في App.tsx
      window.location.reload();
      return;
    }

    try {
      const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
      await apiService.activateKey(trimmedKey, deviceId, expiry);
      localStorage.setItem('active_mido_key', trimmedKey);
      onUnlock();
    } catch (e: any) {
      setError(e.message || 'كود التفعيل غير صالح أو منتهي الصلاحية');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500 h-full w-full absolute inset-0 z-[1000]">
      <div className="glass w-full max-w-xl p-12 rounded-[4rem] border-white/5 shadow-[0_0_150px_rgba(31,111,235,0.1)] text-right space-y-10" dir="rtl">
        
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-600/10 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-inner border border-blue-500/20">💎</div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter">انتهت فترة التجربة المجانية</h2>
          <div className="space-y-2">
             <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
               لقد استمتعت بفترة الاستخدام الحر.<br/>يرجى إدخال مفتاح التنشيط للمتابعة.
             </p>
             <span className="text-[9px] bg-blue-500/10 px-4 py-1 rounded-full text-blue-400 font-mono border border-blue-500/10">
               Device ID: {deviceId}
             </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
             <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest mr-2">كود التفعيل</label>
             <input 
               type="text" 
               placeholder="أدخل الكود هنا"
               value={inputKey}
               onChange={(e) => setInputKey(e.target.value)}
               disabled={isVerifying}
               className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-mono text-center text-lg outline-none focus:border-blue-500 transition-all shadow-inner"
             />
             {error && <p className="text-red-500 text-[10px] font-black text-center mt-2">{error}</p>}
          </div>

          <button 
            onClick={handleUnlock}
            disabled={isVerifying}
            className={`w-full py-6 bg-blue-600 hover:bg-blue-500 rounded-3xl font-black text-lg shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 ${isVerifying ? 'opacity-50 cursor-wait' : ''}`}
          >
            {isVerifying ? 'جاري التحقق...' : 'تنشيط الآن'}
          </button>

          <div className="pt-8 border-t border-white/5 text-center space-y-4">
             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[2px]">للاشتراك وطلب كود تفعيل</p>
             <a 
               href={`https://wa.me/2${config.vodafoneNumber}`} 
               target="_blank" 
               rel="noreferrer"
               className="inline-flex items-center gap-3 px-10 py-4 bg-green-600/10 text-green-500 rounded-2xl text-[10px] font-black hover:bg-green-600 hover:text-white transition-all"
             >
                <span className="text-sm">💬</span> تواصل مع الدعم عبر واتساب
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionWall;
