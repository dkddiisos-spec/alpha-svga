
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StorePage from './pages/StorePage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import ToolsHub from './pages/ToolsHub';
import SubscriptionWall from './components/SubscriptionWall';
import ProfilePage from './pages/ProfilePage';
import ConvertPage from './pages/ConvertPage';
import EditPage from './pages/EditPage';
import CompressPage from './pages/CompressPage';
import SvgaToMp4Page from './pages/SvgaToMp4Page';
import Mp405ToSvgaPage from './pages/Mp405ToSvgaPage';
import Mp4NormalTo05Page from './pages/Mp4NormalTo05Page';
import Mp4DirectToSvgaPage from './pages/Mp4DirectToSvgaPage';
import Mp405To11Page from './pages/Mp405To11Page';
import SvgaAddSoundPage from './pages/SvgaAddSoundPage';
import { Page, SiteConfig, UserStats } from './types';
import { apiService } from './services/apiService';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.STORE);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(() => {
    const key = localStorage.getItem('active_mido_key');
    return key === 'tooty.mido' || (key !== null && key.startsWith('MIDO-'));
  });

  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialTimeLeft, setTrialTimeLeft] = useState<string>('');
  const [config, setConfig] = useState<SiteConfig>({
    siteName: 'MIDO STUDIO', logoUrl: '', banners: [], vodafoneNumber: '01102930761',
    usdtAddress: '', binanceId: '', stats: { visitors: 0, downloads: 0, sales: 0 }
  });
  const [deviceId, setDeviceId] = useState<string>('');
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; 
  const WHATSAPP_MAIN = '01021182264';

  const toolPages = [
    Page.CONVERT, Page.EDIT, Page.COMPRESS, 
    Page.SVGA_TO_MP4, Page.MP4_05_TO_SVGA, Page.MP4_NORMAL_TO_05, 
    Page.MP4_DIRECT_TO_SVGA, Page.MP4_05_TO_11, Page.SVGA_ADD_SOUND
  ];

  useEffect(() => {
    let dId = localStorage.getItem('mido_device_id');
    if (!dId) {
      dId = 'MIDO-' + Math.random().toString(36).substr(2, 12).toUpperCase();
      localStorage.setItem('mido_device_id', dId);
    }
    setDeviceId(dId);
    loadData(dId);

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 't') {
        if (isLoggedIn) setCurrentPage(Page.ADMIN);
        else setCurrentPage(Page.LOGIN);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoggedIn]);

  const loadData = async (dId: string) => {
    try {
      const [remoteConfig, stats] = await Promise.all([
        apiService.getConfig(),
        apiService.getUserStats(dId)
      ]);
      setConfig(prev => ({ ...prev, ...remoteConfig }));
      setUserStats(stats);
      
      const activeKey = localStorage.getItem('active_mido_key');
      if (activeKey === 'tooty.mido') {
        setIsSubscribed(true);
        setIsTrialActive(false);
        return;
      }

      if (stats && stats.trialStartedAt === null) {
        await apiService.startTrial(dId);
        const updatedStats = await apiService.getUserStats(dId);
        setUserStats(updatedStats);
        checkAccess(updatedStats);
      } else {
        checkAccess(stats);
      }
    } catch (e) { console.error(e); }
  };

  const checkAccess = (stats: UserStats) => {
    const activeKey = localStorage.getItem('active_mido_key');
    if (activeKey === 'tooty.mido' || (activeKey && activeKey.startsWith('MIDO-'))) {
      setIsSubscribed(true);
      return;
    }
    if (stats && stats.trialStartedAt) {
      const elapsed = Date.now() - Number(stats.trialStartedAt);
      if (elapsed < TRIAL_DURATION_MS) {
        setIsTrialActive(true);
        const remaining = TRIAL_DURATION_MS - elapsed;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setTrialTimeLeft(`${hours} ساعة و ${mins} دقيقة`);
      } else {
        setIsTrialActive(false);
        setIsSubscribed(false);
      }
    }
  };

  const renderPage = () => {
    const isAccessAllowed = isSubscribed || isTrialActive;
    if (toolPages.includes(currentPage) && !isAccessAllowed) {
       return (
         <SubscriptionWall 
           onUnlock={() => { setIsSubscribed(true); loadData(deviceId); }} 
           config={config} 
           deviceId={deviceId} 
           userStats={userStats}
         />
       );
    }

    switch (currentPage) {
      case Page.STORE: return <StorePage config={config} />;
      case Page.LOGIN: return <LoginPage onLogin={(s) => {setIsLoggedIn(s); if(s) setCurrentPage(Page.ADMIN)}} />;
      case Page.ADMIN: return isLoggedIn ? <AdminDashboard config={config} setConfig={setConfig} /> : <LoginPage onLogin={setIsLoggedIn} />;
      case Page.TOOLS_HUB: return <ToolsHub setPage={setCurrentPage} config={config} isTrial={isTrialActive && !isSubscribed} timeLeft={trialTimeLeft} />;
      case Page.PROFILE: return <ProfilePage deviceId={deviceId} userStats={userStats} isSubscribed={isSubscribed} />;
      case Page.CONVERT: return <ConvertPage onComplete={() => loadData(deviceId)} />;
      case Page.EDIT: return <EditPage onComplete={() => loadData(deviceId)} trialBanner={isTrialActive && !isSubscribed ? trialTimeLeft : null} />;
      case Page.COMPRESS: return <CompressPage onComplete={() => loadData(deviceId)} />;
      case Page.SVGA_TO_MP4: return <SvgaToMp4Page onComplete={() => loadData(deviceId)} />;
      case Page.MP4_05_TO_SVGA: return <Mp405ToSvgaPage onComplete={() => loadData(deviceId)} />;
      case Page.MP4_NORMAL_TO_05: return <Mp4NormalTo05Page onComplete={() => loadData(deviceId)} />;
      case Page.MP4_DIRECT_TO_SVGA: return <Mp4DirectToSvgaPage onComplete={() => loadData(deviceId)} />;
      case Page.MP4_05_TO_11: return <Mp405To11Page onComplete={() => loadData(deviceId)} />;
      case Page.SVGA_ADD_SOUND: return <SvgaAddSoundPage onComplete={() => loadData(deviceId)} />;
      default: return <StorePage config={config} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#05070a] select-none text-right" dir="rtl">
      <Header currentPage={currentPage} setPage={setCurrentPage} logoUrl={config.logoUrl} siteName={config.siteName} />
      <main className="flex-1 overflow-hidden relative">
        {renderPage()}
      </main>
      
      {/* WhatsApp Floating Button */}
      <a 
        href={`https://wa.me/2${WHATSAPP_MAIN}`} 
        target="_blank" 
        rel="noreferrer" 
        className="fixed bottom-24 right-6 z-[250] w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group animate-bounce-slow"
        title="تواصل معنا"
      >
        <span className="text-white text-3xl">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </span>
        <div className="absolute right-full mr-4 px-4 py-2 bg-white text-[#05070a] text-[10px] font-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">تحدث معنا مباشرة</div>
      </a>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-2xl border-white/5 shadow-2xl z-[200] flex gap-8">
         <button onClick={() => setCurrentPage(Page.STORE)} className={`nav-icon ${currentPage === Page.STORE ? 'active' : ''}`}>🏪</button>
         <button onClick={() => setCurrentPage(Page.TOOLS_HUB)} className={`nav-icon ${toolPages.includes(currentPage) || currentPage === Page.TOOLS_HUB ? 'active' : ''}`}>🛠️</button>
         <button onClick={() => setCurrentPage(Page.PROFILE)} className={`nav-icon ${currentPage === Page.PROFILE ? 'active' : ''}`}>👤</button>
      </nav>

      <style>{`
        .nav-icon { font-size: 20px; opacity: 0.4; transition: all 0.3s; }
        .nav-icon:hover { opacity: 1; transform: translateY(-3px); }
        .nav-icon.active { opacity: 1; transform: translateY(-5px) scale(1.2); filter: drop-shadow(0 0 10px #1f6feb); }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default App;
