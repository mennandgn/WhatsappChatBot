import { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Send, 
  MessageSquare, 
  LogOut, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  Check, 
  Clock, 
  Sparkles, 
  GraduationCap, 
  ExternalLink,
  Bot
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  options?: string[];
  messageId?: number | null;
  rating?: number;
  isStreaming?: boolean;
}

interface ConversationItem {
  session_id: string;
  title: string;
  started_at: string | null;
  msg_count: number;
}

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const WELCOME_MSG: Message = {
  id: 1,
  text: "Merhaba! Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü resmi yapay zeka asistanına hoş geldiniz. 🎓\n\nDers içerikleri, yazılım/donanım staj yönergeleri, UME iş yeri eğitimi ve bölüm idari süreçleri hakkında size nasıl yardımcı olabilirim?",
  sender: 'bot',
  options: ["CENG Staj Esasları & Süresi", "1. ve 2. Sınıf Dersleri", "UME İş Yeri Eğitimi", "Bitirme Projesi Şartları"]
};

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string>(generateSessionId());
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [announcement, setAnnouncement] = useState<{ text: string; is_active: boolean; expires_at?: string | null; active_announcements?: any[] } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const username = localStorage.getItem('username') || 'anonim_ogrenci';

  const [activeFlows, setActiveFlows] = useState<any[]>([]);
  const [activeFlow, setActiveFlow] = useState<any | null>(null);

  const [faqTopics, setFaqTopics] = useState<string[]>([
    "Staj Başvuru Tarihleri",
    "Yaz Okulu Kredileri",
    "Mezuniyet Şartları",
    "Kayıt Dondurma Süreci",
    "Harf Notu Aralıkları",
    "Bütünleme Sınavları"
  ]);

  const [whatsappNumber, setWhatsappNumber] = useState<string>("15551662647");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    fetchConversations();

    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data && data.whatsapp_number) {
          setWhatsappNumber(data.whatsapp_number.replace(/[^0-9]/g, ''));
        }
      })
      .catch(() => {});

    fetch("/api/announcement")
      .then(res => res.json())
      .then(data => {
        if (data && data.is_active && data.text) {
          setAnnouncement(data);
        }
      })
      .catch(() => {});

    fetch("/api/faq")
      .then(res => res.json())
      .then(data => {
        if (data && data.faqs && Array.isArray(data.faqs) && data.faqs.length > 0) {
          const topics = data.faqs.map((f: any) => f.topic);
          setFaqTopics(topics);
          setMessages(prev => {
            if (prev.length === 1 && prev[0].id === 1) {
              return [{
                ...prev[0],
                options: topics
              }];
            }
            return prev;
          });
        }
      })
      .catch(() => {});

    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data && data.welcome_message) {
          setMessages(prev => {
            if (prev.length === 1 && prev[0].id === 1) {
              return [{
                ...prev[0],
                text: data.welcome_message
              }];
            }
            return prev;
          });
        }
      })
      .catch(() => {});

    fetch("/api/flows/active/all")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d) && d.length > 0) {
          setActiveFlows(d);
        }
      })
      .catch(() => {});
  }, []);

  const fetchConversations = () => {
    fetch(`/api/conversations/${username}`)
      .then(res => res.json())
      .then(data => setConversations(data.conversations || []))
      .catch(err => console.error(err));
  };

  const loadConversation = async (conv: ConversationItem) => {
    setActiveConvId(conv.session_id);
    try {
      const res = await fetch(`/api/conversations/${username}/${conv.session_id}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        const loaded: Message[] = data.messages.map((m: any) => ({
          id: m.id,
          text: m.text,
          sender: m.role === 'user' ? 'user' : 'bot',
          messageId: m.message_id || null,
          rating: m.rating || 0
        }));
        setMessages(loaded);
        setSessionId(conv.session_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startNewChat = () => {
    const newId = generateSessionId();
    setSessionId(newId);
    setActiveConvId(null);
    setInputValue('');
    setMessages([WELCOME_MSG]);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/');
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRate = async (msgIndex: number, rating: number) => {
    const msg = messages[msgIndex];
    if (!msg.messageId) return;
    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, rating } : m));
    try {
      await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: msg.messageId, rating })
      });
    } catch (err) { console.error(err); }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newUserMsg: Message = { id: Date.now(), text, sender: 'user' };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');

    const history = messages.map(m => ({ role: m.sender === 'bot' ? 'assistant' : 'user', content: m.text }));
    setIsLoading(true);

    const botMsgId = Date.now() + 1;
    setMessages(prev => [...prev, { id: botMsgId, text: '', sender: 'bot', isStreaming: true }]);

    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/'); return; }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          session_id: sessionId,
          message: text,
          history
        })
      });

      if (!response.ok) throw new Error('Sunucu hatası');
      const data = await response.json();

      if (data.flow_id) {
        const matched = activeFlows.find((f: any) => f.id === data.flow_id);
        if (matched) {
          setActiveFlow(matched);
        }
      } else {
        setActiveFlow(null);
      }

      const fullText = data.text || '';
      setMessages(prev => prev.map(m =>
        m.id === botMsgId
          ? { ...m, text: fullText, isStreaming: false, options: data.options, messageId: data.message_id, rating: 0 }
          : m
      ));

      fetchConversations();

    } catch {
      setMessages(prev => prev.map(m =>
        m.id === botMsgId ? { ...m, text: "Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı veya backend durumunu kontrol edin.", isStreaming: false } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] font-sans overflow-hidden antialiased">
      {/* SOL KENAR ÇUBUĞU (SIDEBAR) */}
      <aside className="w-80 bg-[#090e1a] text-slate-200 flex flex-col flex-shrink-0 border-r border-slate-800/80 shadow-2xl z-20 hidden md:flex">
        {/* Üniversite & Bölüm Başlığı */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 p-[1px] shadow-md shadow-blue-500/20">
              <div className="w-full h-full bg-[#0b1222] rounded-xl flex items-center justify-center">
                <GraduationCap size={20} className="text-sky-400" />
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-400">Adıyaman Üniv.</div>
              <div className="text-sm font-semibold text-white tracking-tight">CENG AI Asistanı</div>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" title="Sistem Çevrimiçi" />
        </div>

        {/* Yeni Sohbet Butonu */}
        <div className="p-4">
          <button 
            onClick={startNewChat}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02]"
          >
            <Plus size={18} />
            <span>Yeni Sohbet Başlat</span>
          </button>
        </div>

        {/* Sekmeler: Hızlı Konular / Geçmiş */}
        <div className="flex px-4 gap-1.5 mb-2">
          <button 
            onClick={() => setShowHistory(false)}
            className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all ${
              !showHistory 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Hızlı Konular
          </button>
          <button 
            onClick={() => { setShowHistory(true); fetchConversations(); }}
            className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              showHistory 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock size={12} />
            <span>Geçmiş</span>
          </button>
        </div>

        {/* Konular & Geçmiş Listesi */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 custom-scrollbar">
          {!showHistory ? (
            <>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" />
                <span>Sıkça Sorulanlar</span>
              </div>
              {faqTopics.map((topic, index) => (
                <button 
                  key={index} 
                  onClick={() => sendMessage(topic)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all text-left group"
                >
                  <MessageSquare size={14} className="text-slate-500 group-hover:text-sky-400 transition-colors flex-shrink-0" />
                  <span className="truncate">{topic}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
                Önceki Sohbetler
              </div>
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-500 px-2 py-4 text-center">Henüz sohbet geçmişi bulunmuyor.</p>
              ) : (
                conversations.map(conv => (
                  <button 
                    key={conv.session_id} 
                    onClick={() => loadConversation(conv)}
                    className={`w-full flex flex-col gap-0.5 px-3 py-2 rounded-xl text-xs transition-all text-left ${
                      activeConvId === conv.session_id 
                        ? 'bg-blue-600/20 border border-blue-500/30 text-blue-200 font-medium' 
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{conv.title}</span>
                    <span className="text-[10px] text-slate-500">
                      {conv.msg_count} mesaj · {conv.started_at ? new Date(conv.started_at).toLocaleDateString('tr-TR') : ''}
                    </span>
                  </button>
                ))
              )}
            </>
          )}
        </div>

        {/* Aktif Akış Rozeti */}
        {activeFlow && (
          <div className="m-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
              <span>{activeFlow.name}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Önerilen butonlara basabilir veya serbest yazabilirsiniz.</p>
          </div>
        )}

        {/* Kullanıcı & Çıkış */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-between bg-[#070b14]/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400 flex-shrink-0">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">{username}</div>
              <div className="text-[10px] text-slate-500">Öğrenci Hesabı</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Oturumu Kapat"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ANA SOHBET PENCERESİ */}
      <main className="flex-1 flex flex-col relative bg-slate-50/50 h-full overflow-hidden">
        {/* Üst Bar (Header) */}
        <header className="h-16 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 font-bold md:hidden">
              <GraduationCap size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                Bilgisayar Mühendisliği Öğrenci Danışmanı
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  AI v2.4
                </span>
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">7/24 Kesintisiz Yönetmelik ve Müfredat Rehberi</p>
            </div>
          </div>

          {/* WhatsApp Hızlı Geçiş Butonu */}
          <button 
            onClick={() => window.open(`https://wa.me/${whatsappNumber || '15551662647'}?text=Merhaba,%20Mühendislik%20Bot%20Sisteminden%20geliyorum.`, "_blank")}
            className="group flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-md shadow-[#25D366]/20 hover:scale-[1.02]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span className="hidden sm:inline">WhatsApp'ta Başlat</span>
            <ExternalLink size={12} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </header>

        {/* Canlı Duyuru Bandı */}
        {announcement?.active_announcements && announcement.active_announcements.length > 0 ? (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-6 py-2 text-xs font-semibold shadow-sm flex-shrink-0 space-y-1.5">
            {announcement.active_announcements.map((ann: any, idx: number) => (
              <div key={ann.id || idx} className="flex items-center justify-between gap-3 max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="bg-white/20 p-1 rounded-md text-xs">📢</span>
                  <span className="truncate">{ann.text}</span>
                </div>
                {ann.expires_at && (
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono flex-shrink-0">
                    <Clock size={10} /> {new Date(ann.expires_at).toLocaleDateString('tr-TR')}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : announcement?.is_active && announcement.text ? (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto w-full">
              <div className="flex items-center gap-2 min-w-0">
                <span className="bg-white/20 p-1 rounded-md text-xs">📢</span>
                <span className="truncate">{announcement.text}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Mesaj Akış Alanı */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-4xl w-full mx-auto custom-scrollbar">
          <AnimatePresence>
            {messages.map((msg, msgIndex) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Bot Avatarı */}
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 p-[1px] shadow-sm flex-shrink-0 mt-1">
                    <div className="w-full h-full bg-[#0d1424] rounded-xl flex items-center justify-center text-sky-400">
                      <Bot size={18} />
                    </div>
                  </div>
                )}

                <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[78%]`}>
                  {/* Mesaj Balonu */}
                  <div 
                    className={`rounded-2xl px-5 py-3.5 text-sm md:text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-blue-500/10'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none shadow-slate-200/50'
                    }`}
                  >
                    {msg.text}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-sky-500 ml-1.5 animate-pulse rounded-full align-middle" />
                    )}
                  </div>

                  {/* Kopyala / Beğeni Aksiyonları */}
                  {msg.sender === 'bot' && !msg.isStreaming && msg.text && (
                    <div className="flex items-center gap-1.5 mt-2 ml-1">
                      <button 
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition" 
                        title="Metni Kopyala"
                      >
                        {copiedId === msg.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      {msg.messageId && (
                        <>
                          <button 
                            onClick={() => handleRate(msgIndex, msg.rating === 1 ? 0 : 1)}
                            className={`p-1 rounded-lg transition ${
                              msg.rating === 1 
                                ? 'text-emerald-600 bg-emerald-50' 
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`} 
                            title="Faydalı Yanıt"
                          >
                            <ThumbsUp size={14} />
                          </button>
                          <button 
                            onClick={() => handleRate(msgIndex, msg.rating === -1 ? 0 : -1)}
                            className={`p-1 rounded-lg transition ${
                              msg.rating === -1 
                                ? 'text-rose-600 bg-rose-50' 
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`} 
                            title="Yetersiz Yanıt"
                          >
                            <ThumbsDown size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Önerilen Butonlar (Pill Chips) */}
                  {msg.options && msg.options.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: 0.1 }}
                      className="mt-3.5 flex flex-wrap gap-2"
                    >
                      {msg.options.map((option, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => sendMessage(option)} 
                          disabled={isLoading}
                          className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-full transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center gap-1.5 group disabled:opacity-50"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:scale-125 transition-transform" />
                          <span>{option}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Alt Mesaj Yazma Kapsülü */}
        <footer className="p-4 md:p-6 bg-white/70 backdrop-blur-md border-t border-slate-200/80 flex-shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}
            className="max-w-4xl mx-auto relative flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input 
                type="text" 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)}
                placeholder={activeFlow ? `(${activeFlow.name}) Seçeneklere dokunun veya serbest soru sorun...` : "Sorunuzu buraya yazın (Örn: Staj süresi kaç gündür?)..."}
                disabled={isLoading}
                className="w-full bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl pl-5 pr-14 py-3.5 md:py-4 transition-all shadow-inner outline-none text-sm md:text-base text-slate-800 placeholder-slate-400 disabled:opacity-60"
              />
              <button 
                type="submit" 
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl disabled:opacity-40 transition-all shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
          <div className="text-center text-[11px] text-slate-400 mt-2">
            Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü Yapay Zeka Danışmanı
          </div>
        </footer>
      </main>
    </div>
  );
}
