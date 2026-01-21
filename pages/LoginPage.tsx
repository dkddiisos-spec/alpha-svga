
import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (status: boolean) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === 'alpha' && pass === 'tooty') {
      onLogin(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-black/90 backdrop-blur-3xl animate-in fade-in zoom-in duration-300">
      <div className="glass p-12 rounded-[3rem] w-full max-w-md border-white/5 space-y-8 shadow-[0_0_100px_rgba(31,111,235,0.1)]">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-xl">🔐</div>
          <h2 className="text-2xl font-black text-white italic">تسجيل الدخول للإدارة</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Admin Access Only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 font-black mr-2 uppercase">اسم المستخدم</label>
            <input 
              type="text" 
              value={user}
              onChange={e => setUser(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 font-black mr-2 uppercase">كلمة السر</label>
            <input 
              type="password" 
              value={pass}
              onChange={e => setPass(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold" 
            />
          </div>
          {error && <p className="text-red-500 text-[10px] font-black text-center">بيانات الدخول غير صحيحة!</p>}
          <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95">
            دخول النظام
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
