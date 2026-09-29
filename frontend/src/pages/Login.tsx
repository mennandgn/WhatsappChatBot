import React, { useState } from 'react';
import { User, ShieldCheck, GraduationCap, Lock, KeyRound, ChevronLeft, UserPlus, Sparkles, Cpu, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<'student' | 'admin' | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        // KAYIT (REGISTER)
        const response = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.detail || 'Kayıt sırasında bir hata oluştu!');
        }
        
        setSuccessMsg(data.message);
        setIsRegisterMode(false);
        setPassword('');
      } else {
        // GİRİŞ (LOGIN)
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.detail || 'Kullanıcı adı veya şifre hatalı!');
        }

        if (selectedRole === 'admin' && data.role !== 'admin') {
          throw new Error('Yönetici paneline giriş yetkiniz bulunmuyor!');
        }

        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', data.username);

        if (data.role === 'admin' && selectedRole === 'admin') {
          navigate('/admin');
        } else {
          navigate('/chat');
        }
      }
    } catch (err: any) {
      setError(err.message || "Sunucu bağlantı hatası!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-blue-50/60 text-slate-800 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* Yumuşak Ferah Arka Plan Işımaları (Soft Ambient Glow) */}
      <div className="absolute top-[-10%] left-[-5%] w-[550px] h-[550px] rounded-full bg-blue-300/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-200/25 blur-[140px] pointer-events-none" />
      <div className="absolute top-[35%] right-[15%] w-[350px] h-[350px] rounded-full bg-sky-200/25 blur-[100px] pointer-events-none" />

      {/* İnce Zarif Nokta Izgarası (Dot Grid) */}
      <div 
        className="absolute inset-0 opacity-[0.25] pointer-events-none" 
        style={{ backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`, backgroundSize: '24px 24px' }} 
      />

      {/* Başlık & Üniversite Kurumsal Kimliği */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10 relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/70 border border-blue-200/80 text-xs font-semibold text-blue-800 mb-4 shadow-sm">
          <Sparkles size={14} className="text-blue-600 animate-pulse" />
          <span>Mühendislik Fakültesi • Bilgisayar Mühendisliği</span>
        </div>

        <div className="flex items-center justify-center gap-3.5 mb-2.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/25 flex items-center justify-center text-white">
            <GraduationCap size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Adıyaman Üniversitesi
          </h1>
        </div>

        <p className="text-slate-600 text-sm md:text-base max-w-md mx-auto font-medium">
          Yapay Zeka Destekli Öğrenci Danışmanı & Senaryo Yönetim Portalı
        </p>
      </motion.div>

      {/* İçerik Kartları */}
      <div className="w-full max-w-4xl relative z-10">
        <AnimatePresence mode="wait">
          {!selectedRole ? (
            <motion.div 
              key="role-select"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto"
            >
              {/* Öğrenci Kartı */}
              <div 
                onClick={() => { setSelectedRole('student'); setIsRegisterMode(false); }}
                className="group relative cursor-pointer rounded-2xl p-8 bg-white/90 backdrop-blur-xl border border-slate-200/90 hover:border-blue-400 transition-all duration-300 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_45px_rgba(37,99,235,0.14)] hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <User size={28} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-between">
                    Öğrenci Girişi
                    <ArrowRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </h2>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6 font-normal">
                    Ders müfredatları, staj yönetmeliği, mezuniyet şartları ve idari süreçler hakkında 7/24 danışmanınızla konuşun.
                  </p>
                </div>

                <div className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm text-center transition-all shadow-md shadow-blue-600/25">
                  Sisteme Gir / Kayıt Ol
                </div>
              </div>

              {/* Yönetici Kartı */}
              <div 
                onClick={() => { setSelectedRole('admin'); setIsRegisterMode(false); }}
                className="group relative cursor-pointer rounded-2xl p-8 bg-white/90 backdrop-blur-xl border border-slate-200/90 hover:border-emerald-400 transition-all duration-300 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_45px_rgba(16,185,129,0.14)] hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                    <ShieldCheck size={28} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-between">
                    Yönetici Portalı
                    <ArrowRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </h2>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6 font-normal">
                    WhatsApp ve web chatbot akışlarını görsel olarak çizin, belgeleri indeksleyin ve öğrenci analizlerini takip edin.
                  </p>
                </div>

                <div className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm text-center transition-all shadow-md shadow-emerald-600/25">
                  Yönetim Paneline Git
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="auth-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto w-full"
            >
              <div className="rounded-2xl p-8 bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.09)] relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${selectedRole === 'admin' ? 'from-emerald-500 to-teal-500' : 'from-blue-600 to-indigo-600'}`} />
                
                <button 
                  onClick={() => { setSelectedRole(null); setError(''); setSuccessMsg(''); }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition"
                >
                  <ChevronLeft size={16} /> Rol Seçimine Dön
                </button>

                <div className="text-center mb-6">
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${selectedRole === 'admin' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                    {selectedRole === 'admin' ? <ShieldCheck size={24} /> : <User size={24} />}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {selectedRole === 'admin' 
                      ? 'Yönetici Girişi' 
                      : isRegisterMode ? 'Yeni Öğrenci Kaydı' : 'Öğrenci Girişi'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {isRegisterMode ? 'Sisteme dahil olmak için kendinize bir kullanıcı adı belirleyin.' : 'Lütfen yetkili kullanıcı adı ve şifrenizle giriş yapın.'}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Kullanıcı Adı</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                        placeholder="Örn: mennan / ogrenci_no"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Şifre</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input 
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-200 text-center font-semibold"
                    >
                      {error}
                    </motion.div>
                  )}
                  
                  {successMsg && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs border border-emerald-200 text-center font-semibold"
                    >
                      {successMsg}
                    </motion.div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full flex justify-center items-center gap-2 text-white font-semibold py-3 rounded-xl shadow-lg transition-all text-sm ${
                      selectedRole === 'admin' 
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25' 
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                    } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {isRegisterMode ? <UserPlus size={16} /> : <KeyRound size={16} />}
                        {isRegisterMode ? 'Hesap Oluştur' : 'Giriş Yap'}
                      </>
                    )}
                  </button>
                </form>

                {selectedRole === 'student' && (
                  <div className="mt-5 text-center text-xs">
                    <button 
                      onClick={() => {
                        setIsRegisterMode(!isRegisterMode);
                        setError('');
                        setSuccessMsg('');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-semibold transition"
                    >
                      {isRegisterMode ? 'Zaten bir hesabınız var mı? Giriş Yapın' : 'Henüz hesabınız yok mu? Hemen Kayıt Olun'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Alt Bilgi */}
      <div className="mt-12 text-xs text-slate-500 flex items-center gap-2 font-medium">
        <Cpu size={14} className="text-slate-400" />
        <span>© 2026 Adıyaman Üniversitesi • Bilgisayar Mühendisliği Bölümü</span>
      </div>
    </div>
  );
}
