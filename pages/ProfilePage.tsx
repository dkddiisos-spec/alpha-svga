
import React from 'react';
import { UserStats, Page } from '../types';

interface ProfileProps {
  deviceId: string;
  userStats: UserStats | null;
  isSubscribed: boolean;
}

const ProfilePage: React.FC<ProfileProps> = ({ deviceId, userStats, isSubscribed }) => {
  const activeKey = localStorage.getItem('active_mido_key') || 'لا يوجد مفتاح نشط';

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-10" dir="rtl">
      <div className="text-center space-y-4 mb-12">
        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center text-4xl shadow-2xl shadow-blue-600/20 border border-white/10">👤</div>
        <h2 className="text-3xl font-black text-white italic">مركز التحكم بالمستخدم</h2>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Digital Asset Management Profile</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* بطاقة الاشتراك */}
        <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6 relative overflow-hidden">
           <div className={`absolute top-0 right-0 px-4 py-1 text-[8px] font-black uppercase ${isSubscribed ? 'bg-green-600' : 'bg-blue-600'}`}>
              {isSubscribed ? 'Premium Access' : 'Free / Trial'}
           </div>
           <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">حالة الحساب</h3>
           <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                 <span className="text-[10px] text-gray-500 font-bold">المفتاح النشط:</span>
                 <span className="text-xs font-mono text-blue-400 select-all">{activeKey}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-[10px] text-gray-500 font-bold">بصمة الجهاز:</span>
                 <span className="text-[10px] font-mono text-white/60 select-all">{deviceId}</span>
              </div>
           </div>
        </div>

        {/* بطاقة الإحصائيات */}
        <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
           <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">إحصائيات الأدوات</h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                 <span className="block text-[24px] font-black text-white">{userStats?.usageCount || 0}</span>
                 <span className="text-[8px] text-gray-500 uppercase font-black">عملية تعديل</span>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                 <span className="block text-[24px] font-black text-blue-500">{isSubscribed ? '∞' : '24h'}</span>
                 <span className="text-[8px] text-gray-500 uppercase font-black">مدة الوصول</span>
              </div>
           </div>
        </div>
      </div>

      {/* تنبيه أمان */}
      <div className="bg-orange-600/10 border border-orange-500/20 p-6 rounded-3xl flex items-center gap-6">
         <div className="text-2xl">⚠️</div>
         <div className="space-y-1">
            <h4 className="text-xs font-black text-orange-400">تنبيه حماية الجهاز</h4>
            <p className="text-[10px] text-gray-500 leading-relaxed">المفتاح مرتبط بهذا الجهاز حصرياً. في حال تسجيل الدخول من متصفح آخر أو جهاز آخر، ستحتاج لمفتاح جديد لضمان أمان حسابك.</p>
         </div>
      </div>

      <button 
        onClick={() => { localStorage.clear(); window.location.reload(); }}
        className="w-full py-4 bg-white/5 hover:bg-red-600/10 text-red-500 rounded-2xl font-black text-[10px] border border-white/5 uppercase transition-all"
      >
        تسجيل خروج ومسح البيانات
      </button>
    </div>
  );
};

export default ProfilePage;
