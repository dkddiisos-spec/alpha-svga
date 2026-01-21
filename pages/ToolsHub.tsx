
import React from 'react';
import { Page, SiteConfig } from '../types';

interface ToolsHubProps {
  setPage: (page: Page) => void;
  config: SiteConfig;
  isTrial?: boolean;
  timeLeft?: string;
}

const ToolsHub: React.FC<ToolsHubProps> = ({ setPage, config, isTrial, timeLeft }) => {
  const WHATSAPP_NUMBER = config?.vodafoneNumber || '01102930761';
  
  const tools = [
    { id: Page.CONVERT, name: 'MP4 1.1 ↔ SVGA', icon: '💎', desc: 'تحويل الفيديو عالي الدقة بقناتين (Color + Alpha).' },
    { id: Page.MP4_05_TO_SVGA, name: 'MP4 0.5 ↔ SVGA', icon: '📦', desc: 'تحويل الفيديو المضغوط بنظام 0.5 المستحدث.' },
    { id: Page.MP4_DIRECT_TO_SVGA, name: 'عادي ↔ SVGA', icon: '🎨', desc: 'إزالة الخلفية السوداء وتحويلها لشفافية مباشرة.' },
    { id: Page.EDIT, name: 'تعديل الطبقات', icon: '✏️', desc: 'حذف، استبدال، وتحريك طبقات SVGA مع مطابقة الأبعاد.' },
    { id: Page.COMPRESS, name: 'ضغط SVGA فعلي', icon: '📉', desc: 'تقليل الحجم الثنائي عن طريق حذف الفريمات الزائدة.' },
    { id: Page.SVGA_ADD_SOUND, name: 'إضافة صوت SVGA', icon: '🔊', desc: 'حقن ملفات MP3 داخل الـ SVGA للعروض التفاعلية.' },
    { id: Page.SVGA_TO_MP4, name: 'تصدير SBS 1.1', icon: '📹', desc: 'تحويل SVGA إلى فيديو شفاف بنظام 1.1.' },
    { id: Page.MP4_NORMAL_TO_05, name: 'تصدير 0.5 شفاف', icon: '🎞️', desc: 'تحويل فيديو عادي إلى نظام 0.5 الموفر للمساحة.' },
    { id: Page.MP4_05_TO_11, name: 'تحويل 0.5 ↔ 1.1', icon: '🔄', desc: 'تغيير نظام الشفافية بين المقاسات المختلفة.' }
  ];

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-24 select-none bg-[#05070a]">
      <div className="max-w-7xl mx-auto px-8 mt-12 space-y-12">
        
        {/* البانر الاحترافي العلوي */}
        <section className="glass rounded-[3rem] ring-1 ring-white/10 p-12 bg-gradient-to-r from-[#0d1117] to-[#161b22] shadow-2xl overflow-hidden relative" dir="rtl">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/10 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="flex-1 space-y-6 text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                MIDO ULTIMATE ENGINE V2
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter leading-tight">
                مركز الأدوات والتحويلات <br/> <span className="text-blue-500">الاحترافي</span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed max-w-2xl">
                استخدم أقوى محرك في الشرق الأوسط لمعالجة ملفات SVGA وتحويل الفيديوهات الشفافة بجميع أنظمتها (1.1 و 0.5) مع الحفاظ على أعلى جودة ممكنة.
              </p>
              
              <div className="flex flex-wrap items-center justify-start gap-4 pt-4">
                <button onClick={() => setPage(Page.STORE)} className="px-8 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-3">
                   🏪 تصفح المتجر
                </button>
                <a href={`https://wa.me/2${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="px-8 py-5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-sm border border-white/5 transition-all active:scale-95">
                   💬 تواصل مع المطور
                </a>
              </div>

              {isTrial && (
                <div className="mt-6 flex items-center gap-3 px-6 py-4 bg-orange-600/10 text-orange-400 rounded-2xl text-[11px] font-black border border-orange-500/20 animate-pulse">
                  <span className="text-lg">⏳</span>
                  <span>نسخة تجريبية نشطة — يتبقى لك {timeLeft} قبل التنشيط</span>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-[450px] aspect-video rounded-[2.5rem] bg-[#05070a] border border-white/5 flex items-center justify-center relative group">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 group-hover:opacity-100 transition-opacity"></div>
               <div className="grid grid-cols-3 gap-3 p-10 w-full opacity-40 group-hover:opacity-100 transition-all">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-white/5 border border-white/5 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                  ))}
               </div>
               <div className="absolute text-7xl filter drop-shadow-[0_0_20px_rgba(31,111,235,0.5)]">🛠️</div>
            </div>
          </div>
        </section>

        {/* شبكة الأدوات */}
        <section className="space-y-8" dir="rtl">
          <div className="flex items-center gap-6 px-4">
             <div className="flex flex-col">
                <h2 className="text-3xl font-black text-white italic tracking-tight">الأدوات المتاحة</h2>
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Select your processing unit</span>
             </div>
             <div className="flex-1 h-px bg-white/5"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setPage(tool.id)}
                className="glass group p-10 rounded-[3rem] ring-1 ring-white/5 hover:ring-blue-500/40 transition-all text-right flex items-start gap-8 active:scale-95 hover:translate-y-[-8px] hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
              >
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-4xl group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 transition-all shadow-inner border border-white/5">
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0 pt-2">
                  <h3 className="text-xl font-black text-white mb-3 group-hover:text-blue-400 transition-colors tracking-tight">{tool.name}</h3>
                  <p className="text-[11px] text-gray-500 font-bold leading-relaxed">{tool.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default ToolsHub;
