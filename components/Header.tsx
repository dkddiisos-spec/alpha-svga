
import React from 'react';
import { Page } from '../types';

interface HeaderProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  logoUrl?: string;
  siteName?: string;
}

const Header: React.FC<HeaderProps> = ({ currentPage, setPage, logoUrl, siteName }) => {
  return (
    <header className="bg-[#0d1117] border-b border-[#30363d] sticky top-0 z-50 px-8 h-20 flex items-center justify-between shadow-2xl">
      <div className="flex items-center gap-6 cursor-pointer" onClick={() => setPage(Page.STORE)}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
        ) : (
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg">
            {(siteName || 'M').charAt(0)}
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-white italic tracking-tighter uppercase">{siteName || 'MIDO STUDIO'}</h1>
          <span className="text-[8px] text-blue-500 font-bold uppercase tracking-widest">Ultimate Platform</span>
        </div>
      </div>

      <nav className="flex items-center gap-2">
        <button 
          onClick={() => setPage(Page.STORE)} 
          className={`nav-main-btn ${currentPage === Page.STORE ? 'active' : ''}`}
        >
          <span className="text-lg">🛒</span> المتجر
        </button>
        <button 
          onClick={() => setPage(Page.TOOLS_HUB)} 
          className={`nav-main-btn ${currentPage !== Page.STORE && currentPage !== Page.ADMIN && currentPage !== Page.LOGIN ? 'active' : ''}`}
        >
          <span className="text-lg">🛠️</span> الأدوات
        </button>
      </nav>

      <style>{`
        .nav-main-btn {
          padding: 10px 24px;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 900;
          color: #8b949e;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s;
        }
        .nav-main-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .nav-main-btn.active {
          background: #1f6feb;
          color: #fff;
          box-shadow: 0 10px 20px rgba(31,111,235,0.2);
        }
      `}</style>
    </header>
  );
};

export default Header;
