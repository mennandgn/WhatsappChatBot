import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Brain, 
  FileText, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Check,
  Trash2, 
  RefreshCw, 
  Users, 
  MessageSquare, 
  Activity, 
  LogOut, 
  ExternalLink, 
  Search, 
  FolderOpen, 
  FileIcon, 
  Sparkles,
  Layers,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Download,
  Megaphone,
  Edit3,
  X,
  Save,
  Clock,
  User,
  FlaskConical,
  Zap,
  ShieldAlert,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Plus,
  Send,
  UserCheck,
  UserX,
  Menu,
  Radio,
  Copy,
  Key,
  ArrowLeft,
  Smartphone,
  Globe,
  Eye,
  EyeOff,
  Power,
  Play,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type AdminTab = 
  | 'analytics' 
  | 'logs' 
  | 'unanswered' 
  | 'playground' 
  | 'knowledge'
  | 'announcement'
  | 'faqs'
  | 'users'
  | 'guardrails'
  | 'settings'
  | 'whatsapp';

export default function Admin() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token') || '';
  const role = localStorage.getItem('role') || '';

  // Admin Güvenlik Kontrolü: Giriş yapılmamışsa veya admin değilse ana sayfaya yönlendir
  useEffect(() => {
    if (!token || role !== 'admin') {
      navigate('/');
    }
  }, [token, role, navigate]);

  const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const currentToken = localStorage.getItem('token') || '';
    const headers = new Headers(init?.headers || {});
    if (currentToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
    const response = await window.fetch(input, { ...init, headers });
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      navigate('/');
      throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    }
    return response;
  };

  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');

  // Mobil Menü ve Canlı Akış State'leri
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);

  // Ortak Bildirim State
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showNotif = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
    if (tab === 'logs') fetchLogs();
    if (tab === 'knowledge') fetchDocs();
    if (tab === 'users') fetchUsers();
    if (tab === 'faqs') fetchFaqs();
    if (tab === 'guardrails') fetchGuardrails();
    if (tab === 'settings') fetchSettings();
  };

  // İstatistikler ve Cevapsız Sorular
  const [stats, setStats] = useState<any>(null);
  const [unanswered, setUnanswered] = useState<any[]>([]);

  // Sohbet Günlükleri (Logs)
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logRatingFilter, setLogRatingFilter] = useState<string>('all');

  // Bilgi Bankası (Knowledge Base) State'leri
  const [knowledgeView, setKnowledgeView] = useState<'list' | 'upload-pdf' | 'text-train'>('list');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [isReindexing, setIsReindexing] = useState(false);

  // Şifre Sıfırlama State'leri
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isResettingPass, setIsResettingPass] = useState(false);

  // Belge Düzenleme Modal State
  const [editingDoc, setEditingDoc] = useState<{ filename: string; source: string; content: string } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Metin Eğitimi State
  const [trainTitle, setTrainTitle] = useState('');
  const [trainContent, setTrainContent] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [teachingLogId, setTeachingLogId] = useState<number | null>(null);

  // PDF Eğitimi State
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Canlı Duyuru State
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementStartsAt, setAnnouncementStartsAt] = useState<string>('');
  const [announcementExpiresAt, setAnnouncementExpiresAt] = useState<string>('');
  const [announcementHistory, setAnnouncementHistory] = useState<any[]>([]);
  const [editingAnnId, setEditingAnnId] = useState<number | null>(null);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const hasLiveAnnouncement = announcementHistory.some((item: any) => item.is_currently_live);

  // 1. AI Playground State
  const [playgroundQuery, setPlaygroundQuery] = useState('');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<{ answer: string; sources?: any[]; source_type?: string; is_flow?: boolean } | null>(null);

  // 2. FAQ Management State
  const [faqs, setFaqs] = useState<any[]>([]);
  const [newFaqTopic, setNewFaqTopic] = useState('');
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [editingFaqText, setEditingFaqText] = useState('');

  // 3. User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // 4. Guardrails State
  const [bannedKeywords, setBannedKeywords] = useState<string[]>([]);
  const [newBannedKeyword, setNewBannedKeyword] = useState('');
  const [guardrailRejectionMsg, setGuardrailRejectionMsg] = useState('');
  const [isSavingGuardrails, setIsSavingGuardrails] = useState(false);

  // 5. System Settings State
  const [botSettings, setBotSettings] = useState({
    bot_name: 'Bilgisayar Mühendisliği Asistanı',
    department_name: 'Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü',
    bot_tone: 'resmi',
    welcome_message: 'Merhaba! Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü resmi asistanına hoş geldiniz. 💻 CENG dersleri, yazılım/donanım stajı, bitirme projeleri ve bölüm idari süreçleri hakkında size nasıl yardımcı olabilirim?',
    whatsapp_number: '15551662647'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // 6. WhatsApp & Meta Settings State
  const [waSettings, setWaSettings] = useState({
    webhook_url: '',
    verify_token: 'whatsapp_bot_verify_token_2026',
    phone_id: '',
    access_token: '',
    app_id: '',
    app_secret: ''
  });
  const [detectedTunnelUrl, setDetectedTunnelUrl] = useState('');
  const [waStatus, setWaStatus] = useState<any>(null);
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);
  const [isSavingWa, setIsSavingWa] = useState(false);
  const [isStartingTunnel, setIsStartingTunnel] = useState(false);
  const [isStoppingTunnel, setIsStoppingTunnel] = useState(false);
  const [showWaToken, setShowWaToken] = useState(false);
  const [showWaSecret, setShowWaSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 7. Gelişmiş WhatsApp Kullanıcı Deneyimi State'leri
  const [testRecipientPhone, setTestRecipientPhone] = useState('');
  const [isSendingTestMsg, setIsSendingTestMsg] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  
  // WhatsApp Simülatör State'i
  const [simQuery, setSimQuery] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simChat, setSimChat] = useState<Array<{ sender: 'user' | 'bot'; text: string; options?: string[]; interactive_type?: string; time?: string }>>([
    {
      sender: 'bot',
      text: 'Merhaba! Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü resmi asistanına hoş geldiniz. 💻 Bölümümüz, staj süreçleri, dersler ve sınavlar hakkında bilgi almak için aşağıdaki seçenekleri kullanabilir veya doğrudan mesaj yazabilirsiniz.',
      options: ['CENG Stajı', 'Ders Müfredatı', 'Bölüm İletişim'],
      interactive_type: 'button',
      time: '10:00'
    }
  ]);

  // Son Gelen WhatsApp Mesajları State'i
  const [recentWaMessages, setRecentWaMessages] = useState<any[]>([]);
  const [isLoadingRecentWa, setIsLoadingRecentWa] = useState(false);

  // ===================== VERİ ÇEKME FONKSİYONLARI =====================
  const fetchStats = async () => {
    try {
      const res = await authFetch("http://localhost:8000/api/analytics");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUnanswered = async () => {
    try {
      const res = await authFetch("http://localhost:8000/api/unanswered");
      const data = await res.json();
      setUnanswered(data.questions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDocs = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await authFetch("http://localhost:8000/api/documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      let url = `http://localhost:8000/api/logs?limit=100`;
      if (logSearch) url += `&search=${encodeURIComponent(logSearch)}`;
      if (logRatingFilter === 'positive') url += `&rating=1`;
      if (logRatingFilter === 'negative') url += `&rating=-1`;
      if (logRatingFilter === 'unrated') url += `&rating=0`;

      const res = await authFetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchAnnouncement = async () => {
    try {
      const res = await authFetch("http://localhost:8000/api/announcement");
      const data = await res.json();
      if (data) {
        setAnnouncementHistory(data.history || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFaqs = async () => {
    try {
      const res = await authFetch("http://localhost:8000/api/faq");
      const data = await res.json();
      setFaqs(data.faqs || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await authFetch("http://localhost:8000/api/users");
      const data = await res.json();
      setUsersList(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchGuardrails = async () => {
    try {
      const res = await authFetch("http://localhost:8000/api/guardrails");
      const data = await res.json();
      if (data) {
        setBannedKeywords(data.banned_keywords || []);
        setGuardrailRejectionMsg(data.rejection_message || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await authFetch("http://localhost:8000/api/settings");
      const data = await res.json();
      if (data) setBotSettings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWaSettings = async () => {
    try {
      const res = await authFetch("http://localhost:8000/api/settings/whatsapp-meta");
      const data = await res.json();
      if (data && data.settings) {
        setWaSettings(data.settings);
        setDetectedTunnelUrl(data.detected_tunnel_url || '');
        setWaStatus(data.meta_status || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentWaMessages = async () => {
    setIsLoadingRecentWa(true);
    try {
      const res = await authFetch("http://localhost:8000/api/whatsapp/recent-messages");
      const data = await res.json();
      if (data && data.messages) {
        setRecentWaMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingRecentWa(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUnanswered();
    fetchDocs();
    fetchLogs();
    fetchAnnouncement();
    fetchFaqs();
    fetchUsers();
    fetchGuardrails();
    fetchSettings();
    fetchWaSettings();
    fetchRecentWaMessages();
  }, []);

  // Canlı Akış (Auto-Refresh) - 20 saniyede bir sessiz arka plan güncellemesi
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
      fetchUnanswered();
      fetchDocs();
    }, 20000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, logSearch, logRatingFilter]);

  // ===================== EĞİTİM & İŞLEM İŞLEYİCİLERİ =====================
  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainTitle.trim() || !trainContent.trim()) return;

    setIsTraining(true);
    try {
      const res = await authFetch("http://localhost:8000/api/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: trainTitle.trim(), 
          content: trainContent.trim(),
          log_id: teachingLogId
        })
      });
      if (res.ok) {
        if (teachingLogId) {
          setUnanswered(prev => prev.filter((q: any) => q.id !== teachingLogId));
        }
        setTeachingLogId(null);
        setTrainTitle('');
        setTrainContent('');
        await fetchDocs();
        await fetchUnanswered();
        await fetchLogs();
        setKnowledgeView('list');
        showNotif('success', `"${trainTitle}" bilgisi sisteme öğretildi ve cevapsız sorular listesinden kaldırıldı!`);
      } else {
        showNotif('error', 'Eğitim kaydedilirken hata oluştu.');
      }
    } catch {
      showNotif('error', 'Sunucuya bağlanılamadı.');
    }
    setIsTraining(false);
  };

  const handleResolveUnanswered = async (logId: number) => {
    try {
      const res = await authFetch(`http://localhost:8000/api/unanswered/${logId}/resolve`, { method: "PATCH" });
      if (res.ok) {
        setUnanswered(prev => prev.filter((q: any) => q.id !== logId));
        showNotif('success', 'Soru çözüldü olarak işaretlendi ve listeden kaldırıldı.');
      } else {
        showNotif('error', 'İşlem başarısız oldu.');
      }
    } catch {
      showNotif('error', 'Sunucu hatası.');
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      showNotif('error', 'Sadece .pdf formatında dosyalar yükleyebilirsiniz.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await authFetch("http://localhost:8000/api/upload-pdf", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        await fetchDocs();
        setKnowledgeView('list');
        showNotif('success', `"${file.name}" yüklendi ve vektör veritabanına işlendi.`);
      } else {
        showNotif('error', data.detail || 'PDF yükleme hatası.');
      }
    } catch {
      showNotif('error', 'Sunucuya bağlanırken hata oluştu.');
    }
    setIsUploading(false);
  };

  const handleDeleteLog = async (logId: number) => {
    if (!window.confirm("Bu sohbet kaydını silmek istediğinize emin misiniz?")) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/logs/${logId}`, { method: "DELETE" });
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== logId));
        showNotif('success', 'Sohbet kaydı silindi.');
      } else {
        showNotif('error', 'Kayıt silinemedi.');
      }
    } catch {
      showNotif('error', 'Sunucu hatası.');
    }
  };

  const handleDeleteUnanswered = async (logId: number) => {
    if (!window.confirm("Bu cevapsız soruyu listeden silmek istediğinize emin misiniz?")) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/logs/${logId}`, { method: "DELETE" });
      if (res.ok) {
        setUnanswered(prev => prev.filter((q: any) => q.id !== logId));
        showNotif('success', 'Cevapsız soru silindi.');
      } else {
        showNotif('error', 'Kayıt silinemedi.');
      }
    } catch {
      showNotif('error', 'Sunucu hatası.');
    }
  };

  const handleClearAllUnanswered = async () => {
    if (!window.confirm("Tüm cevapsız soruları temizlemek istediğinize emin misiniz?")) return;
    try {
      const res = await authFetch("http://localhost:8000/api/unanswered/all", { method: "DELETE" });
      if (res.ok) {
        setUnanswered([]);
        showNotif('success', 'Tüm cevapsız sorular temizlendi.');
      } else {
        showNotif('error', 'Temizleme başarısız oldu.');
      }
    } catch {
      showNotif('error', 'Sunucu hatası.');
    }
  };

  const handleReindex = async () => {
    if (!window.confirm("Tüm belgeler baştan taranıp vektör veritabanı optimize edilecek. Devam edilsin mi?")) return;
    setIsReindexing(true);
    try {
      const res = await authFetch("http://localhost:8000/api/reindex", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await fetchDocs();
        showNotif('success', 'Vektör veritabanı başarıyla baştan derlendi!');
      } else {
        showNotif('error', data.detail || 'İndeksleme hatası.');
      }
    } catch {
      showNotif('error', 'Sunucu hatası.');
    }
    setIsReindexing(false);
  };

  const handleSaveResetPassword = async () => {
    if (!resettingUser || !newPasswordInput.trim()) return;
    if (newPasswordInput.trim().length < 4) {
      showNotif('error', 'Yeni şifre en az 4 karakter olmalıdır.');
      return;
    }
    setIsResettingPass(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/users/${resettingUser.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPasswordInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showNotif('success', `${resettingUser.username} kullanıcısının şifresi başarıyla güncellendi.`);
        setResettingUser(null);
        setNewPasswordInput('');
      } else {
        showNotif('error', data.detail || 'Şifre güncellenemedi.');
      }
    } catch {
      showNotif('error', 'Sunucu hatası.');
    }
    setIsResettingPass(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePdfUpload(file);
  };

  const handleOpenEdit = async (doc: any) => {
    try {
      const res = await authFetch(`http://localhost:8000/api/documents/${encodeURIComponent(doc.filename)}/content`);
      const data = await res.json();
      setEditingDoc({
        filename: doc.filename,
        source: doc.source,
        content: data.content || ''
      });
    } catch {
      showNotif('error', 'Belge içeriği okunamadı.');
    }
  };

  const handleSaveDocEdit = async () => {
    if (!editingDoc) return;
    setIsSavingEdit(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/documents/${encodeURIComponent(editingDoc.filename)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingDoc.content })
      });
      if (res.ok) {
        await fetchDocs();
        showNotif('success', `"${editingDoc.source}" belgesi güncellendi ve yapay zeka tekrar eğitildi!`);
        setEditingDoc(null);
      } else {
        showNotif('error', 'Güncelleme kaydedilemedi.');
      }
    } catch {
      showNotif('error', 'Sunucu hatası oluştu.');
    }
    setIsSavingEdit(false);
  };

  const handleDeleteDoc = async (filename: string, sourceName: string) => {
    if (!window.confirm(`"${sourceName}" belgesini silmek istediğinize emin misiniz? Yapay zeka bu bilgiyi tamamen unutacaktır.`)) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/documents/${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (res.ok) {
        await fetchDocs();
        showNotif('success', `"${sourceName}" silindi.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAnnouncement = async (publish: boolean = true) => {
    if (publish && !announcementText.trim()) {
      showNotif('error', 'Lütfen önce duyuru metnini yazınız!');
      return;
    }
    setIsSavingAnnouncement(true);
    try {
      const res = await authFetch("http://localhost:8000/api/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: editingAnnId,
          text: announcementText.trim(), 
          is_active: publish,
          starts_at: announcementStartsAt || null,
          expires_at: announcementExpiresAt || null
        })
      });
      if (res.ok) {
        setEditingAnnId(null);
        setAnnouncementText('');
        setAnnouncementStartsAt('');
        setAnnouncementExpiresAt('');
        await fetchAnnouncement();
        showNotif('success', publish ? 'Duyuru başarıyla yayınlandı/güncellendi!' : 'Duyuru taslak olarak kaydedildi.');
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotif('error', errData.detail || 'Duyuru kaydedilemedi.');
      }
    } catch {
      showNotif('error', 'Sunucuya bağlanılamadı.');
    }
    setIsSavingAnnouncement(false);
  };

  const handleDeleteAnnouncement = async (annId: number) => {
    if (!window.confirm("Bu duyuruyu geçmişten silmek istediğinize emin misiniz?")) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/announcement/${annId}`, { method: "DELETE" });
      if (res.ok) {
        showNotif('success', 'Duyuru geçmişten silindi.');
        await fetchAnnouncement();
      } else {
        showNotif('error', 'Duyuru silinemedi.');
      }
    } catch {
      showNotif('error', 'Sunucu hatası.');
    }
  };

  const handleClearPastAnnouncements = async () => {
    if (!window.confirm("Tüm geçmiş ve taslak duyuruları silmek istediğinize emin misiniz? (Yayındaki canlı duyurular korunacaktır)")) return;
    try {
      const res = await authFetch("http://localhost:8000/api/announcement/clear-past", { method: "DELETE" });
      if (res.ok) {
        showNotif('success', 'Tüm geçmiş ve taslak duyurular temizlendi.');
        await fetchAnnouncement();
      } else {
        showNotif('error', 'Geçmiş duyurular temizlenemedi.');
      }
    } catch {
      showNotif('error', 'Sunucu hatası.');
    }
  };

  const handleToggleAnnouncementActive = async (annId: number) => {
    try {
      const res = await authFetch(`http://localhost:8000/api/announcement/${annId}/toggle-active`, { method: "POST" });
      if (res.ok) {
        showNotif('success', 'Duyuru yayın durumu güncellendi!');
        await fetchAnnouncement();
      } else {
        showNotif('error', 'Duyuru yayın durumu değiştirilemedi.');
      }
    } catch {
      showNotif('error', 'Sunucu hatası.');
    }
  };

  // 1. AI Playground Sorgusu
  const handlePlaygroundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playgroundQuery.trim()) return;
    setPlaygroundLoading(true);
    try {
      const res = await authFetch("http://localhost:8000/api/test-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: playgroundQuery })
      });
      const data = await res.json();
      setPlaygroundResult(data);
    } catch {
      showNotif('error', 'Test sorgusu çalıştırılamadı.');
    } finally {
      setPlaygroundLoading(false);
    }
  };

  // 2. FAQ Ekleme & Silme
  const handleAddFaq = async () => {
    if (!newFaqTopic.trim()) return;
    const updated = [...faqs, { id: Date.now(), topic: newFaqTopic.trim() }];
    try {
      const res = await authFetch("http://localhost:8000/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faqs: updated })
      });
      if (res.ok) {
        setFaqs(updated);
        setNewFaqTopic('');
        showNotif('success', 'Yeni SSS başlığı eklendi!');
      }
    } catch {
      showNotif('error', 'SSS kaydedilemedi.');
    }
  };

  const handleDeleteFaq = async (id: number) => {
    const updated = faqs.filter(f => f.id !== id);
    try {
      await authFetch("http://localhost:8000/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faqs: updated })
      });
      setFaqs(updated);
      showNotif('success', 'SSS kaldırıldı.');
    } catch {
      showNotif('error', 'İşlem başarısız.');
    }
  };

  const handleSaveFaqEdit = async (faqId: number) => {
    if (!editingFaqText.trim()) return;
    const updated = faqs.map(f => f.id === faqId ? { ...f, topic: editingFaqText.trim() } : f);
    try {
      const res = await authFetch("http://localhost:8000/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faqs: updated })
      });
      if (res.ok) {
        setFaqs(updated);
        setEditingFaqId(null);
        setEditingFaqText('');
        showNotif('success', 'Kısayol butonu başarıyla güncellendi!');
      } else {
        showNotif('error', 'Güncelleme kaydedilemedi.');
      }
    } catch {
      showNotif('error', 'Sunucuya bağlanılamadı.');
    }
  };

  // 3. Kullanıcı Rolü & Silme
  const handleToggleUserRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    try {
      const res = await authFetch(`http://localhost:8000/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        await fetchUsers();
        showNotif('success', `Kullanıcı rolü '${newRole}' olarak güncellendi.`);
      }
    } catch {
      showNotif('error', 'Rol güncellenemedi.');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`"${username}" kullanıcısını ve tüm verilerini silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchUsers();
        showNotif('success', `${username} silindi.`);
      }
    } catch {
      showNotif('error', 'Kullanıcı silinemedi.');
    }
  };

  // 4. Guardrails Kaydet
  const handleAddBannedKeyword = () => {
    if (!newBannedKeyword.trim()) return;
    if (bannedKeywords.includes(newBannedKeyword.trim().toLowerCase())) return;
    setBannedKeywords([...bannedKeywords, newBannedKeyword.trim().toLowerCase()]);
    setNewBannedKeyword('');
  };

  const handleRemoveBannedKeyword = (kw: string) => {
    setBannedKeywords(bannedKeywords.filter(k => k !== kw));
  };

  const handleSaveGuardrails = async () => {
    setIsSavingGuardrails(true);
    try {
      const res = await authFetch("http://localhost:8000/api/guardrails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banned_keywords: bannedKeywords,
          rejection_message: guardrailRejectionMsg
        })
      });
      if (res.ok) {
        showNotif('success', 'Güvenlik filtreleri başarıyla kaydedildi!');
      }
    } catch {
      showNotif('error', 'Filtre kaydedilemedi.');
    }
    setIsSavingGuardrails(false);
  };

  // 5. Ayarları Kaydet
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await authFetch("http://localhost:8000/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(botSettings)
      });
      if (res.ok) {
        showNotif('success', 'Sistem ve bot ayarları güncellendi!');
      }
    } catch {
      showNotif('error', 'Ayarlar kaydedilemedi.');
    }
    setIsSavingSettings(false);
  };

  // 6. WhatsApp & Meta Webhook İşlemleri
  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) {
      showNotif('error', 'Kopyalanacak metin boş!');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showNotif('success', `"${fieldName}" panoya kopyalandı!`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSaveWaSettings = async () => {
    setIsSavingWa(true);
    try {
      const res = await authFetch("http://localhost:8000/api/settings/whatsapp-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(waSettings)
      });
      const data = await res.json();
      if (res.ok) {
        showNotif('success', 'WhatsApp ve Meta ayarları başarıyla kaydedildi!');
        await fetchWaSettings();
      } else {
        showNotif('error', data.detail || 'Ayarlar kaydedilemedi.');
      }
    } catch {
      showNotif('error', 'Sunucuya bağlanılamadı.');
    } finally {
      setIsSavingWa(false);
    }
  };

  const handleTestWaConnection = async () => {
    setIsTestingWa(true);
    try {
      const res = await authFetch("http://localhost:8000/api/settings/whatsapp-meta/test-connection", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setWaStatus({
          is_valid: true,
          phone_number: data.data?.phone_number,
          verified_name: data.data?.verified_name,
          quality_rating: data.data?.quality_rating,
          current_meta_webhook: data.data?.current_meta_webhook,
          details: 'Canlı bağlantı testi başarılı'
        });
        showNotif('success', data.message || 'Meta bağlantısı başarıyla doğrulandı!');
      } else {
        showNotif('error', data.detail || 'Bağlantı testi başarısız.');
      }
    } catch {
      showNotif('error', 'Test isteği gönderilemedi.');
    } finally {
      setIsTestingWa(false);
    }
  };

  const handleSyncMetaWebhook = async () => {
    if (!waSettings.app_id.trim() || !waSettings.app_secret.trim()) {
      showNotif('error', 'Lütfen önce Meta App ID ve App Secret alanlarını doldurunuz!');
      return;
    }
    if (!waSettings.webhook_url.trim()) {
      showNotif('error', 'Lütfen önce Webhook URL alanını doldurunuz!');
      return;
    }

    setIsSyncingMeta(true);
    try {
      const res = await authFetch("http://localhost:8000/api/settings/whatsapp-meta/sync-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: waSettings.app_id.trim(),
          app_secret: waSettings.app_secret.trim(),
          webhook_url: waSettings.webhook_url.trim(),
          verify_token: waSettings.verify_token.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotif('success', '🎉 Harika! Meta Developers Webhook URL developers.facebook.com\'a girmeden otomatik güncellendi!');
        await fetchWaSettings();
      } else {
        showNotif('error', data.detail || 'Meta güncelleme hatası.');
      }
    } catch {
      showNotif('error', 'Meta sunucularına bağlanırken hata oluştu.');
    } finally {
      setIsSyncingMeta(false);
    }
  };

  const handleStartTunnel = async () => {
    setIsStartingTunnel(true);
    try {
      const res = await authFetch("http://localhost:8000/api/tunnel/start", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setDetectedTunnelUrl(data.tunnel_url);
        setWaSettings(prev => ({ ...prev, webhook_url: data.webhook_url }));
        if (data.meta_synced) {
          showNotif('success', '🚀 Tünel açıldı ve Meta Developers Webhook adresi otomatik güncellendi!');
        } else if (data.meta_msg) {
          showNotif('success', `Tünel açıldı: ${data.meta_msg}`);
        } else {
          showNotif('success', `🚀 Tünel başarıyla başlatıldı! (${data.tunnel_url})`);
        }
        await fetchWaSettings();
      } else {
        showNotif('error', data.detail || 'Tünel başlatılamadı.');
      }
    } catch {
      showNotif('error', 'Sunucuya bağlanılamadı.');
    } finally {
      setIsStartingTunnel(false);
    }
  };

  const handleStopTunnel = async () => {
    setIsStoppingTunnel(true);
    try {
      const res = await authFetch("http://localhost:8000/api/tunnel/stop", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setDetectedTunnelUrl('');
        showNotif('success', '🛑 Cloudflare tüneli durduruldu.');
        await fetchWaSettings();
      } else {
        showNotif('error', data.detail || 'Tünel durdurulamadı.');
      }
    } catch {
      showNotif('error', 'Sunucuya bağlanılamadı.');
    } finally {
      setIsStoppingTunnel(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipientPhone.trim()) {
      showNotif('error', 'Lütfen test mesajının gönderileceği telefon numarasını giriniz.');
      return;
    }
    setIsSendingTestMsg(true);
    try {
      const res = await authFetch("http://localhost:8000/api/settings/whatsapp-meta/send-test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_phone: testRecipientPhone.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showNotif('success', data.message || 'Test mesajı WhatsApp numaranıza başarıyla gönderildi!');
      } else {
        showNotif('error', data.detail || 'Test mesajı gönderilemedi.');
      }
    } catch {
      showNotif('error', 'Sunucuya bağlanılamadı.');
    } finally {
      setIsSendingTestMsg(false);
    }
  };

  const handleRunSimulator = async (overrideQuery?: string) => {
    const q = (overrideQuery || simQuery).trim();
    if (!q) return;

    const userMsg = {
      sender: 'user' as const,
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSimChat(prev => [...prev, userMsg]);
    setSimQuery('');
    setSimLoading(true);

    try {
      const res = await authFetch("http://localhost:8000/api/whatsapp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (res.ok) {
        setSimChat(prev => [
          ...prev,
          {
            sender: 'bot' as const,
            text: data.text,
            options: data.options || [],
            interactive_type: data.interactive_type || 'text',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setSimChat(prev => [
          ...prev,
          {
            sender: 'bot' as const,
            text: 'Üzgünüm, simülasyon yanıtı oluşturulurken bir hata oluştu.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch {
      setSimChat(prev => [
        ...prev,
        {
          sender: 'bot' as const,
          text: 'Sunucuya bağlanırken hata oluştu.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setSimLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/');
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Filtreli Belgeler ve Kullanıcılar
  const filteredDocuments = documents.filter(doc => {
    if (!docSearch.trim()) return true;
    const query = docSearch.toLowerCase();
    return (doc.source?.toLowerCase().includes(query) || 
            doc.preview?.toLowerCase().includes(query));
  });

  const filteredUsers = usersList.filter(u => 
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-gray-100 font-sans overflow-hidden">
      
      {/* ===================== MOBİL SIDEBAR BACKDROP ===================== */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ===================== SOL MENÜ (SIDEBAR) ===================== */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:flex lg:flex-shrink-0
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="overflow-y-auto flex-1">
          {/* Logo / Başlık */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className="text-white font-bold text-base leading-tight tracking-wide">CENG<span className="text-blue-400">Asistan</span></h1>
                <p className="text-xs text-slate-400 font-medium">Bölüm Yönetim Paneli</p>
              </div>
            </div>
            {/* Mobilde Menüyü Kapat Butonu */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition"
              title="Menüyü Kapat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Menü Grupları */}
          <nav className="p-3 space-y-4">
            
            {/* GRUP 1: ANALİZ & CANLI İZLEME */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Analiz & İzleme
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => handleTabChange('analytics')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'analytics'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 size={17} className={activeTab === 'analytics' ? 'text-white' : 'text-blue-400'} />
                    <span>Genel Analiz</span>
                  </div>
                  {activeTab === 'analytics' && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleTabChange('logs')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'logs'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={17} className={activeTab === 'logs' ? 'text-white' : 'text-cyan-400'} />
                    <span>Sohbet Günlüğü</span>
                  </div>
                  {activeTab === 'logs' && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleTabChange('unanswered')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'unanswered'
                      ? 'bg-rose-600 text-white shadow-md shadow-red-600/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <AlertCircle size={17} className={activeTab === 'unanswered' ? 'text-white' : 'text-rose-400'} />
                    <span>Cevapsız Sorular</span>
                  </div>
                  {unanswered.length > 0 && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === 'unanswered' ? 'bg-white text-rose-600' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {unanswered.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* GRUP 2: TEST & BİLGİ YÖNETİMİ */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Yapay Zeka & Bilgi
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => handleTabChange('playground')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'playground'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FlaskConical size={17} className={activeTab === 'playground' ? 'text-white' : 'text-amber-400'} />
                    <span>AI Test Simülatörü</span>
                  </div>
                  {activeTab === 'playground' && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleTabChange('knowledge')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'knowledge'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FolderOpen size={17} className={activeTab === 'knowledge' ? 'text-white' : 'text-emerald-400'} />
                    <span>Bilgi Bankası & Eğitim</span>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === 'knowledge' ? 'bg-white text-emerald-700' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {documents.length}
                  </span>
                </button>
              </div>
            </div>

            {/* GRUP 3: İLETİŞİM & KULLANICI & GÜVENLİK */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Yönetim & Güvenlik
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => handleTabChange('announcement')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'announcement'
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Megaphone size={17} className={activeTab === 'announcement' ? 'text-white' : 'text-orange-400'} />
                    <span>Canlı Duyuru Bandı</span>
                  </div>
                  {hasLiveAnnouncement && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                <button
                  onClick={() => handleTabChange('faqs')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'faqs'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Zap size={17} className={activeTab === 'faqs' ? 'text-white' : 'text-teal-400'} />
                    <span>Kısayol Butonları</span>
                  </div>
                  {activeTab === 'faqs' && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleTabChange('users')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'users'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users size={17} className={activeTab === 'users' ? 'text-white' : 'text-sky-400'} />
                    <span>Kullanıcı Yönetimi</span>
                  </div>
                  {activeTab === 'users' && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleTabChange('guardrails')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'guardrails'
                      ? 'bg-red-700 text-white shadow-md shadow-red-700/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert size={17} className={activeTab === 'guardrails' ? 'text-white' : 'text-red-400'} />
                    <span>Güvenlik & Kara Liste</span>
                  </div>
                  {activeTab === 'guardrails' && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleTabChange('settings')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'settings'
                      ? 'bg-slate-700 text-white shadow-md shadow-slate-700/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <SettingsIcon size={17} className={activeTab === 'settings' ? 'text-white' : 'text-slate-400'} />
                    <span>Sistem & Bot Ayarları</span>
                  </div>
                  {activeTab === 'settings' && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleTabChange('whatsapp')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone size={17} className={activeTab === 'whatsapp' ? 'text-white' : 'text-emerald-400'} />
                    <span>WhatsApp & Meta Ayarları</span>
                  </div>
                  {activeTab === 'whatsapp' && <ChevronRight size={15} />}
                </button>
              </div>
            </div>

          </nav>
        </div>

        {/* Alt Butonlar */}
        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <Link
            to="/chat"
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition"
          >
            <span className="flex items-center gap-2">
              <MessageSquare size={16} className="text-blue-400" />
              <span>Öğrenci Chatini Aç</span>
            </span>
            <ExternalLink size={14} className="text-slate-500" />
          </Link>

          <Link
            to="/flow-builder"
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-indigo-900/60 hover:text-white rounded-xl transition border border-indigo-700/40 bg-indigo-900/20"
          >
            <span className="flex items-center gap-2">
              <Layers size={16} className="text-indigo-400" />
              <span>Akış Tasarımcısı</span>
            </span>
            <ExternalLink size={14} className="text-slate-500" />
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 rounded-xl transition"
          >
            <LogOut size={16} />
            <span>Oturumu Kapat</span>
          </button>
        </div>
      </aside>

      {/* ===================== SAĞ İÇERİK ALANI ===================== */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        
        {/* Üst Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobil Menü Aç Butonu */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden transition border border-slate-200"
              title="Menüyü Aç"
            >
              <Menu size={20} />
            </button>

            <Layers className="text-slate-400 hidden sm:block" size={20} />
            <h2 className="text-sm sm:text-lg font-bold text-slate-800 truncate max-w-[180px] sm:max-w-none">
              {activeTab === 'analytics' && 'Genel Analiz & Canlı Metrikler'}
              {activeTab === 'logs' && 'Öğrenci Canlı Sohbet Kayıtları'}
              {activeTab === 'unanswered' && 'Yapay Zekanın Cevap Veremediği Sorular'}
              {activeTab === 'playground' && 'AI Test Simülatörü & Kaynak Denetimi'}
              {activeTab === 'knowledge' && 'Bilgi Bankası & Yapay Zeka Eğitimi'}
              {activeTab === 'announcement' && 'Öğrenci Sohbet Ekranına Süreli Duyuru'}
              {activeTab === 'faqs' && 'Hızlı Butonlar & Sıkça Sorulan Sorular'}
              {activeTab === 'users' && 'Öğrenci & Kullanıcı Hesapları'}
              {activeTab === 'guardrails' && 'Güvenlik, Argo ve Kara Liste Filtresi'}
              {activeTab === 'settings' && 'Bot Kişiliği, Üslup ve Karşılama Ayarları'}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Canlı Akış (Auto-Refresh) Butonu */}
            <button
              onClick={() => {
                const next = !isAutoRefresh;
                setIsAutoRefresh(next);
                if (next) {
                  showNotif('success', 'Canlı Akış açıldı: Veriler 20 saniyede bir otomatik yenilenecek.');
                } else {
                  showNotif('success', 'Canlı Akış durduruldu.');
                }
              }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3.5 py-2 rounded-xl border transition ${
                isAutoRefresh
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="20 saniyede bir verileri arka planda otomatik yeniler"
            >
              <span className={`w-2 h-2 rounded-full ${isAutoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
              <Radio size={14} className={isAutoRefresh ? 'text-emerald-600 animate-pulse' : 'text-slate-400'} />
              <span className="hidden md:inline">{isAutoRefresh ? 'Canlı Akış: Açık' : 'Canlı Akış'}</span>
            </button>

            <a
              href={`http://localhost:8000/api/export-logs?token=${encodeURIComponent(token)}`}
              download
              className="hidden md:flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition"
              title="Tüm sohbetleri Excel/CSV olarak indir"
            >
              <Download size={14} />
              <span>Raporu İndir (.CSV)</span>
            </a>
          </div>
        </header>

        {/* Bildirim Alanı */}
        <div className="px-8 pt-4">
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-xl flex items-center gap-3 shadow-sm border ${
                  notification.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {notification.type === 'success' ? (
                  <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle size={20} className="text-rose-600 flex-shrink-0" />
                )}
                <p className="text-sm font-medium">{notification.text}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===================== İÇERİK SEKMELERİ ===================== */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* 1. GENEL ANALİZ */}
          {activeTab === 'analytics' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {!stats ? (
                <div className="p-12 text-center text-slate-400">Analiz verileri yükleniyor...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Users size={22} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase">Kayıtlı Öğrenci</p>
                        <h3 className="text-xl font-bold text-slate-800">{stats.total_students}</h3>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={22} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase">Toplam Soru</p>
                        <h3 className="text-xl font-bold text-slate-800">{stats.total_questions}</h3>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <ThumbsUp size={22} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase">Olumlu Oylar</p>
                        <h3 className="text-xl font-bold text-emerald-600">👍 {stats.positive_ratings || 0}</h3>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                        <ThumbsDown size={22} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase">Olumsuz Oylar</p>
                        <h3 className="text-xl font-bold text-rose-600">👎 {stats.negative_ratings || 0}</h3>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <Activity size={22} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase">Memnuniyet</p>
                        <h3 className="text-xl font-bold text-purple-600">%{stats.satisfaction_rate || 100}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Sistem Durumu & Hızlı Kontrol Paneli */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle size={22} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-800">Sistem & Asistan Durumu</h3>
                          <p className="text-xs text-slate-400">Yapay zeka asistanı aktif ve öğrencilere hizmet veriyor</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Çevrimiçi & Aktif
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Öğretilmiş Belgeler</span>
                        <span className="text-xl font-bold text-slate-800">{documents.length} adet</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">Vektör veritabanında hazır</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Kayıtlı Kullanıcı</span>
                        <span className="text-xl font-bold text-slate-800">{usersList.length} kişi</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">Sistemde yetkilendirilmiş</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Canlı Duyuru Yayını</span>
                        <span className="text-sm font-bold text-slate-800 truncate block">
                          {hasLiveAnnouncement ? 'Yayında 📢' : 'Aktif Duyuru Yok'}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">Öğrenci ekranı üst bandı</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* 2. SOHBET GÜNLÜĞÜ */}
          {activeTab === 'logs' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative w-72">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={logSearch}
                      onChange={e => setLogSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                      placeholder="Soru veya cevapta ara..."
                      className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-200"
                    />
                  </div>

                  <select
                    value={logRatingFilter}
                    onChange={e => setLogRatingFilter(e.target.value)}
                    className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="all">Tüm Oylar</option>
                    <option value="positive">Sadece Beğenilenler (👍)</option>
                    <option value="negative">Sadece Beğenilmeyenler (👎)</option>
                    <option value="unrated">Oylanmayanlar</option>
                  </select>

                  <button
                    onClick={fetchLogs}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
                  >
                    Filtrele
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Toplam <strong>{logs.length}</strong> kayıt listeleniyor
                </div>
              </div>

              {isLoadingLogs ? (
                <div className="p-16 text-center text-slate-400">Sohbetler yükleniyor...</div>
              ) : logs.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/80 space-y-2">
                  <MessageSquare size={44} className="mx-auto text-slate-300" />
                  <h4 className="text-base font-bold text-slate-700">Kayıt Bulunamadı</h4>
                  <p className="text-xs text-slate-400">Arama kriterlerinize uyan sohbet kaydı bulunmuyor.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {logs.map((log: any) => (
                    <div
                      key={log.id}
                      className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      {/* Üst Bilgi: Kullanıcı + Kaynak Etiketi */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                            <User size={14} />
                          </span>
                          <span className="font-bold text-slate-800 text-xs">{log.username || 'Öğrenci'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {log.is_flow || (log.source_type && log.source_type.includes('Akış')) ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                              ⚡ Akış
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                              🤖 Yapay Zeka
                            </span>
                          )}
                          {log.rating === 1 && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-full">
                              👍
                            </span>
                          )}
                          {log.rating === -1 && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded-full">
                              👎
                            </span>
                          )}
                          {log.is_unanswered && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-full">
                              ⚠️ Cevapsız
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Soru ve Cevap Mesaj Baloncukları */}
                      <div className="space-y-2 flex-1">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Öğrenci Sorusu</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {log.created_at ? new Date(log.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800">"{log.question}"</p>
                        </div>

                        <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/60">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Yanıt</span>
                          <p className="text-xs leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
                            {log.answer}
                          </p>
                        </div>
                      </div>

                      {/* Kart Alt Aksiyonları */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock size={11} />
                          {log.created_at ? new Date(log.created_at).toLocaleDateString('tr-TR') : ''}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(log.question);
                              showNotif('success', 'Soru panoya kopyalandı.');
                            }}
                            className="text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition"
                            title="Soruyu kopyala"
                          >
                            <Copy size={13} />
                          </button>

                          <button
                            onClick={() => {
                              setTrainTitle(log.question);
                              setTrainContent(log.answer);
                              handleTabChange('knowledge');
                              setKnowledgeView('text-train');
                              showNotif('success', 'Soru ve cevap Bilgi Bankası formuna aktarıldı.');
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-lg transition flex items-center gap-1"
                            title="Cevabı düzelt ve kural olarak öğret"
                          >
                            <Edit3 size={12} />
                            <span>Düzelt & Öğret</span>
                          </button>

                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Sohbet kaydını sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* 3. CEVAPSIZ SORULAR */}
          {activeTab === 'unanswered' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-4xl">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                      <AlertCircle size={20} />
                      <span>Yapay Zekanın "Bilmiyorum" Dediği Sorular ({unanswered.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Öğrencilerin sorduğu ancak botun bilgi bankasında bulamadığı sorular burada toplanır.
                    </p>
                  </div>
                  {unanswered.length > 0 && (
                    <button
                      onClick={handleClearAllUnanswered}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200 rounded-xl transition flex items-center gap-1.5 flex-shrink-0"
                      title="Tüm cevapsız soruları listeden temizle"
                    >
                      <Trash2 size={14} />
                      <span>Tümünü Temizle</span>
                    </button>
                  )}
                </div>

                {unanswered.length === 0 ? (
                  <div className="py-16 text-center">
                    <CheckCircle size={48} className="mx-auto text-emerald-400 mb-3" />
                    <h4 className="text-base font-bold text-slate-700">Tebrikler!</h4>
                    <p className="text-sm text-slate-500">Cevapsız kalmış hiçbir soru bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unanswered.map((q: any) => (
                      <div key={q.id} className="p-4 rounded-xl border border-rose-100 bg-rose-50/60 flex items-start justify-between gap-4 hover:border-rose-200 transition">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {q.created_at ? new Date(q.created_at).toLocaleString('tr-TR') : ''}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">"{q.question}"</p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setTrainTitle(q.question);
                              setTeachingLogId(q.id);
                              handleTabChange('knowledge');
                              setKnowledgeView('text-train');
                            }}
                            className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                            title="Bu kuralı bilgi bankasına ekleyerek yapay zekaya öğret"
                          >
                            <Brain size={14} />
                            <span>Bunu Öğret</span>
                          </button>

                          <button
                            onClick={() => handleResolveUnanswered(q.id)}
                            className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                            title="Bu soruyu çözüldü olarak işaretle ve listeden kaldır"
                          >
                            <CheckCircle size={14} />
                            <span>Çözüldü</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUnanswered(q.id)}
                            className="p-2 text-rose-600 hover:text-rose-800 bg-rose-100/80 hover:bg-rose-200 rounded-lg transition flex items-center gap-1"
                            title="Bu cevapsız soruyu sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 4. AI PLAYGROUND (TEST SİMÜLATÖRÜ) */}
          {activeTab === 'playground' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl space-y-6">
              <div className="bg-white p-7 rounded-2xl shadow-sm border border-slate-200/80 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FlaskConical className="text-amber-600" size={22} />
                    <span>Yapay Zeka Test Simülatörü & Kaynak Denetimi</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Öğrenci moduna geçmeden doğrudan buradan soru sorun. Yapay zekanın cevabını ve bu cevabı <strong>hangi kaynak belge parçalarından</strong> çıkardığını anında görün.
                  </p>
                </div>

                <form onSubmit={handlePlaygroundSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={playgroundQuery}
                    onChange={e => setPlaygroundQuery(e.target.value)}
                    placeholder="Örn: 2026 stajı kaç iş günü ve hangi tarihte başlar?"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  />
                  <button
                    type="submit"
                    disabled={playgroundLoading || !playgroundQuery.trim()}
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    {playgroundLoading ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>Test Et</span>
                  </button>
                </form>

                {playgroundResult && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Cevap İçeriği</span>
                        {playgroundResult.source_type && (
                          <span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-2xs ${
                            playgroundResult.is_flow 
                              ? 'bg-indigo-100 text-indigo-900 border-indigo-300' 
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            {playgroundResult.source_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {playgroundResult.answer}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-600" />
                        <span>Kullanılan Vektör Kaynak Parçaları ({playgroundResult.sources?.length || 0})</span>
                      </h4>
                      {playgroundResult.sources && playgroundResult.sources.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {playgroundResult.sources.map((src: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                              <span className="font-bold text-slate-700 block">Kaynak #{idx + 1}</span>
                              <p className="text-slate-600 leading-relaxed font-mono text-[11px]">{src.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Vektör eşleşmesi bulunamadı (Genel cevap veya guardrail tetiklendi).</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* 5. BİLGİ BANKASI & EĞİTİM (BİRLEŞTİRİLMİŞ) */}
          {activeTab === 'knowledge' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl">
              {/* PDF Yükleme Formu */}
              {knowledgeView === 'upload-pdf' && (
                <div className="bg-white p-7 rounded-2xl shadow-sm border border-slate-200/80 space-y-5 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Upload className="text-indigo-600" size={20} />
                        <span>PDF Dosyası Yükleme</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Fakülte yönetmeliklerini veya duyuru PDF'lerini yükleyin; yapay zeka sayfaları okur ve ezberler.
                      </p>
                    </div>
                    <button
                      onClick={() => setKnowledgeView('list')}
                      className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
                    >
                      <ArrowLeft size={14} /> Belge Listesine Dön
                    </button>
                  </div>

                  <div
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => {
                      if (!isUploading) document.getElementById('sidebar-pdf-input')?.click();
                    }}
                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                      dragOver
                        ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                        : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80'
                    }`}
                  >
                    {isUploading ? (
                      <div className="space-y-3">
                        <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto" />
                        <p className="text-indigo-600 font-bold text-sm">PDF okunuyor ve vektör veritabanına işleniyor...</p>
                        <p className="text-slate-400 text-xs">Bu işlem birkaç saniye sürebilir.</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                          <Upload size={28} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700">
                          PDF Dosyasını Buraya Sürükleyin veya Tıklayın
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Maksimum 50 MB, metin tabanlı PDF dosyaları
                        </p>
                      </>
                    )}
                  </div>

                  <input
                    id="sidebar-pdf-input"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}

              {/* Metin Kural Yazma Formu */}
              {knowledgeView === 'text-train' && (
                <div className="bg-white p-7 rounded-2xl shadow-sm border border-slate-200/80 space-y-4 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Brain className="text-purple-600" size={20} />
                        <span>Doğrudan Metin / Kural Girerek Öğret</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Öğrencilere duyurmak istediğiniz kuralları ve cevapları doğrudan yazın.
                      </p>
                    </div>
                    <button
                      onClick={() => setKnowledgeView('list')}
                      className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
                    >
                      <ArrowLeft size={14} /> Belge Listesine Dön
                    </button>
                  </div>

                  {teachingLogId && (
                    <div className="bg-purple-50 border border-purple-200 text-purple-800 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain size={16} className="text-purple-600 flex-shrink-0" />
                        <span><strong>Cevapsız Soru Öğretiliyor:</strong> Bu kural kaydedildiğinde ilgili soru otomatik olarak cevapsız sorular listesinden kaldırılacaktır.</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setTeachingLogId(null)}
                        className="text-purple-600 hover:text-purple-900 font-bold ml-2 underline text-xs flex-shrink-0"
                      >
                        İlişkiyi Kaldır
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleTrain} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Konu Başlığı</label>
                      <input
                        type="text"
                        value={trainTitle}
                        onChange={e => setTrainTitle(e.target.value)}
                        placeholder="Örn: 2026 Yaz Stajı Son Başvuru Tarihi"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">İçerik (Kurallar ve Açıklama)</label>
                      <textarea
                        value={trainContent}
                        onChange={e => setTrainContent(e.target.value)}
                        rows={8}
                        placeholder="Mühendislik Fakültesi staj yönergesine göre öğrenciler yaz stajı evraklarını en geç 15 Haziran mesai bitimine kadar teslim etmelidir..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isTraining || !trainTitle.trim() || !trainContent.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-purple-600/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isTraining ? (
                        <>
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          <span>Yapay Zekaya İşleniyor...</span>
                        </>
                      ) : (
                        <>
                          <Brain size={18} />
                          <span>Sisteme Öğret & Kaydet</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Varsayılan: Belge Listesi & Aksiyon Çubuğu */}
              {knowledgeView === 'list' && (
                <>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative w-full md:w-80">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={docSearch}
                        onChange={e => setDocSearch(e.target.value)}
                        placeholder="Belgelerde veya içerikte ara..."
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-200 transition"
                      />
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
                      <button
                        onClick={() => setKnowledgeView('upload-pdf')}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
                      >
                        <Upload size={14} />
                        <span>+ PDF Yükle</span>
                      </button>
                      <button
                        onClick={() => setKnowledgeView('text-train')}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-purple-600/20"
                      >
                        <Brain size={14} />
                        <span>+ Yeni Kural Yaz</span>
                      </button>
                      <button
                        onClick={handleReindex}
                        disabled={isReindexing}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200/80 disabled:opacity-50"
                        title="Vektör veritabanını ve RAG model hafızasını yeniden derler"
                      >
                        <RefreshCw size={14} className={isReindexing ? 'animate-spin text-indigo-600' : ''} />
                        <span>{isReindexing ? 'İndeksleniyor...' : 'Vektör İndeksini Yenile'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                    <span>Kayıtlı Bilgiler ve Kurallar</span>
                    <span>Toplam {documents.length} kayıt</span>
                  </div>

                  {isLoadingDocs && documents.length === 0 ? (
                    <div className="p-16 text-center text-slate-400">Belgeler yükleniyor...</div>
                  ) : filteredDocuments.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/80 space-y-3">
                      <FolderOpen size={48} className="mx-auto text-slate-300" />
                      <h4 className="text-base font-bold text-slate-700">Hiç Belge Bulunamadı</h4>
                      <p className="text-xs text-slate-400">
                        {docSearch
                          ? 'Arama kriterlerinize uyan belge yok.'
                          : 'Henüz sisteme eklenmiş bir PDF veya kural yok.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredDocuments.map((doc, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className={`p-2 rounded-xl flex-shrink-0 ${
                                  doc.file_type === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-purple-50 text-purple-600'
                                }`}>
                                  {doc.file_type === 'pdf' ? <FileIcon size={20} /> : <Brain size={20} />}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-slate-800 truncate" title={doc.source}>
                                    {doc.source}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      doc.file_type === 'pdf' ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {doc.file_type === 'pdf' ? 'PDF Belgesi' : 'Metin Kuralı'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleOpenEdit(doc)}
                                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
                                  title="İçeriği gör ve düzenle"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDoc(doc.filename, doc.source)}
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition"
                                  title="Bu bilgiyi sil"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                              {doc.preview || 'İçerik önizlemesi bulunamadı.'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                            <span>Boyut: {formatSize(doc.size)}</span>
                            <span className="font-mono text-[10px] text-slate-400">{doc.filename}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* 8. CANLI DUYURU BANDI VE GEÇMİŞ YÖNETİMİ */}
          {activeTab === 'announcement' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* SOL KOLON: DUYURU OLUŞTUR / DÜZENLE FORMU */}
                <div className="lg:col-span-7 bg-white p-7 rounded-2xl shadow-sm border border-slate-200/80 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Megaphone className="text-amber-600" size={20} />
                        <span>{editingAnnId ? 'Duyuruyu Düzenle' : 'Yeni Canlı Duyuru Yayınla'}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Burada yayınlayacağınız duyuru, öğrencilerin sohbet penceresinin üst kısmında canlı bant olarak görüntülenir.
                      </p>
                    </div>
                    {editingAnnId && (
                      <button
                        onClick={() => {
                          setEditingAnnId(null);
                          setAnnouncementText('');
                          setAnnouncementStartsAt('');
                          setAnnouncementExpiresAt('');
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
                      >
                        + Yeni Duyuru Oluştur
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Duyuru Metni</label>
                    <textarea
                      rows={4}
                      value={announcementText}
                      onChange={e => setAnnouncementText(e.target.value)}
                      placeholder="Örn: ⚠️ Dikkat: Yaz okulu ders kayıtları 22 Haziran Cuma günü saat 17:00'de sona erecektir!"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-amber-200 transition"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Clock size={16} className="text-amber-600" />
                          <span>Otomatik Bitiş Tarihi & Saati (Opsiyonel)</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Belirlediğiniz zaman geldiğinde duyuru otomatik olarak yayından kalkar.
                        </p>
                      </div>

                      <div>
                        {hasLiveAnnouncement ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            🟢 Canlı Yayında
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-200 text-slate-600">
                            Yayında Değil
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="datetime-local"
                        value={announcementExpiresAt ? announcementExpiresAt.slice(0, 16) : ''}
                        onChange={e => setAnnouncementExpiresAt(e.target.value)}
                        className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-200"
                      />

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setHours(23, 59, 0, 0);
                            setAnnouncementExpiresAt(d.toISOString().slice(0, 16));
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition"
                        >
                          Bugün 23:59
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + 24 * 3600 * 1000);
                            setAnnouncementExpiresAt(d.toISOString().slice(0, 16));
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition"
                        >
                          +24 Saat
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + 3 * 24 * 3600 * 1000);
                            setAnnouncementExpiresAt(d.toISOString().slice(0, 16));
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition"
                        >
                          +3 Gün
                        </button>

                        {announcementExpiresAt && (
                          <button
                            type="button"
                            onClick={() => setAnnouncementExpiresAt('')}
                            className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-bold transition"
                          >
                            Süresiz Yap
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Öğrencide Nasıl Görünecek (Önizleme):</p>
                    {announcementText ? (
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="bg-white/20 p-1 rounded-full text-xs">📢</span>
                          <span>{announcementText}</span>
                        </div>
                        {announcementExpiresAt && (
                          <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono flex-shrink-0 ml-2">
                            <Clock size={10} /> Son: {new Date(announcementExpiresAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-100 text-slate-400 text-xs p-4 rounded-xl text-center italic">
                        Duyuru metni yazıldığında önizleme burada görünecektir.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleSaveAnnouncement(true)}
                      disabled={isSavingAnnouncement || !announcementText.trim()}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      {isSavingAnnouncement ? (
                        <>
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          <span>Yayınlanıyor...</span>
                        </>
                      ) : (
                        <>
                          <Megaphone size={18} />
                          <span>{editingAnnId ? 'Değişiklikleri Yayınla' : 'Duyuruyu Yayınla'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSaveAnnouncement(false)}
                      disabled={isSavingAnnouncement || !announcementText.trim()}
                      className="px-5 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition text-sm flex items-center gap-2"
                      title="Taslak olarak kaydet"
                    >
                      <span>Taslak Kaydet</span>
                    </button>
                  </div>
                </div>

                {/* SAĞ KOLON: AKTİF, ZAMANLANMIŞ VE GEÇMİŞ DUYURULAR (3 AYRI KUTUCUK) */}
                <div className="lg:col-span-5 space-y-5">
                  
                  {/* KUTUCUK 1: AKTİF / CANLI DUYURULAR */}
                  {(() => {
                    const activeAnnItems = announcementHistory.filter((item: any) => item.is_currently_live);
                    return (
                      <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white p-5 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between pb-3 border-b border-emerald-100 mb-3">
                          <h3 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span>Canlı Yayındaki Aktif Duyurular ({activeAnnItems.length})</span>
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🟢 YAYINDA
                          </span>
                        </div>

                        {activeAnnItems.length > 0 ? (
                          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                            {activeAnnItems.map((item: any) => (
                              <div key={item.id} className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm space-y-2">
                                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                                  "{item.text}"
                                </p>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                    <Clock size={11} className="text-emerald-600" />
                                    <span>{item.time_left_str || 'Süresiz Duyuru'}</span>
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleToggleAnnouncementActive(item.id)}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                                      title="Yayından Kaldır"
                                    >
                                      Yayından Kaldır
                                    </button>

                                    <button
                                      onClick={() => {
                                        setEditingAnnId(item.id);
                                        setAnnouncementText(item.text);
                                        setAnnouncementStartsAt(item.starts_at || '');
                                        setAnnouncementExpiresAt(item.expires_at || '');
                                        showNotif('success', 'Aktif duyuru düzenleme formuna yüklendi.');
                                      }}
                                      className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                                      title="Duyuruyu Düzenle"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-5 px-4 bg-white/70 rounded-xl text-center border border-dashed border-emerald-200">
                            <p className="text-xs font-bold text-slate-600 mb-1">Şu an yayında aktif bir duyuru yok</p>
                            <p className="text-[11px] text-slate-400">
                              Sol taraftaki formdan duyuru yayınlayabilir veya aşağıdan bir duyuruyu yayına alabilirsiniz.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* KUTUCUK 2: ZAMANLANMIŞ (GELECEK TARİHLİ) DUYURULAR */}
                  {(() => {
                    const scheduledItems = announcementHistory.filter((item: any) => item.is_scheduled && item.is_active);
                    if (scheduledItems.length === 0) return null;
                    return (
                      <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white p-5 rounded-2xl border border-blue-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                          <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={15} className="text-blue-600" />
                            <span>Zamanlanmış Duyurular ({scheduledItems.length})</span>
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                            ⏳ İLERİ TARİHLİ
                          </span>
                        </div>

                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {scheduledItems.map((item: any) => (
                            <div key={item.id} className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm space-y-2">
                              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                                "{item.text}"
                              </p>
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                                <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <Clock size={11} /> {item.time_left_str}
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleToggleAnnouncementActive(item.id)}
                                    className="px-2 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg text-[10px] font-bold transition"
                                    title="Tarihi Beklemeden Şimdi Yayına Al"
                                  >
                                    Şimdi Başlat
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingAnnId(item.id);
                                      setAnnouncementText(item.text);
                                      setAnnouncementStartsAt(item.starts_at || '');
                                      setAnnouncementExpiresAt(item.expires_at || '');
                                      showNotif('success', 'Zamanlanmış duyuru forma yüklendi.');
                                    }}
                                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAnnouncement(item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* KUTUCUK 3: GEÇMİŞ VE PASİF DUYURULAR */}
                  {(() => {
                    const pastItems = announcementHistory.filter((item: any) => !item.is_currently_live && !item.is_scheduled);
                    return (
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={15} className="text-amber-600" />
                            <span>Geçmiş & Taslak Duyurular ({pastItems.length})</span>
                          </h3>
                          {pastItems.length > 0 && (
                            <button
                              onClick={handleClearPastAnnouncements}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                              title="Tüm geçmiş ve taslak duyuruları sil"
                            >
                              <Trash2 size={12} />
                              <span>Toplu Sil</span>
                            </button>
                          )}
                        </div>

                        {pastItems.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs italic">
                            Geçmişte veya taslakta başka duyuru bulunmuyor.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {pastItems.map((item: any) => (
                              <div
                                key={item.id}
                                className={`p-3 rounded-xl border transition flex flex-col space-y-2 ${
                                  item.is_expired
                                    ? 'bg-slate-50/80 border-slate-200 opacity-80'
                                    : 'bg-white border-slate-200 hover:border-amber-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                                    "{item.text}"
                                  </p>
                                  
                                  {item.is_expired ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex-shrink-0">
                                      ⏰ Süresi Doldu
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                                      ⚪ Pasif / Taslak
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-100">
                                  <span className="font-medium text-slate-500 flex items-center gap-1">
                                    <Clock size={11} className="text-slate-400" />
                                    {item.time_left_str || 'Süresiz'}
                                  </span>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleToggleAnnouncementActive(item.id)}
                                      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold transition"
                                      title="Şimdi Yayına Al"
                                    >
                                      Yayına Al
                                    </button>

                                    <button
                                      onClick={() => {
                                        setEditingAnnId(item.id);
                                        setAnnouncementText(item.text);
                                        setAnnouncementStartsAt(item.starts_at || '');
                                        setAnnouncementExpiresAt(item.expires_at || '');
                                        showNotif('success', 'Duyuru forma aktarıldı.');
                                      }}
                                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                      title="Duyuruyu Düzenle"
                                    >
                                      <Edit3 size={13} />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteAnnouncement(item.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                      title="Sil"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

              </div>
            </motion.div>
          )}

          {/* 9. SSS & HIZLI BUTON YÖNETİMİ */}
          {activeTab === 'faqs' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-6">
              <div className="bg-white p-7 rounded-2xl shadow-sm border border-slate-200/80 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Zap className="text-teal-600" size={20} />
                    <span>Öğrenci Kısayol Butonları Yönetimi</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Buraya eklediğiniz her başlık, öğrencinin chat ekranında ilk mesajın altında ve sol menüde <strong>tek tıkla sorulabilir hazır buton (kısayol hapı)</strong> olarak görünür.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Yeni Kısayol Butonu Ekle</h4>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={newFaqTopic}
                      onChange={e => setNewFaqTopic(e.target.value)}
                      placeholder="Örn: Mazeret Sınavı Tarihleri"
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-200 w-full"
                    />
                    <button
                      onClick={handleAddFaq}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition text-xs flex items-center gap-1.5 flex-shrink-0 w-full sm:w-auto justify-center shadow-sm"
                    >
                      <Plus size={16} />
                      <span>Buton Ekle</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Öğrenci Chat Ekranında Görünen Aktif Butonlar ({faqs.length})
                  </h4>
                  {faqs.map(faq => (
                    <div
                      key={faq.id}
                      className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-teal-300 transition"
                    >
                      {editingFaqId === faq.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingFaqText}
                            onChange={e => setEditingFaqText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveFaqEdit(faq.id)}
                            className="flex-1 bg-slate-50 border border-teal-400 rounded-xl px-3.5 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-200"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveFaqEdit(faq.id)}
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                            title="Kaydet"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => { setEditingFaqId(null); setEditingFaqText(''); }}
                            className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                            title="Vazgeç"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs">
                              <Zap size={15} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{faq.topic}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingFaqId(faq.id); setEditingFaqText(faq.topic); }}
                              className="text-slate-400 hover:text-teal-600 p-2 rounded-lg hover:bg-teal-50 transition"
                              title="Bu kısayol butonunu düzenle"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              onClick={() => handleDeleteFaq(faq.id)}
                              className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition"
                              title="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 10. KULLANICI YÖNETİMİ (YÖNETİCİ & ÖĞRENCİ AYRI ŞIK TASARIM) */}
          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl space-y-6">
              
              {/* 1. ÖZET İSTATİSTİK KARTLARI */}
              {(() => {
                const adminList = filteredUsers.filter(u => u.role === 'admin');
                const studentList = filteredUsers.filter(u => u.role !== 'admin');
                const totalAdminQuestions = adminList.reduce((acc, u) => acc + (u.question_count || 0), 0);
                const totalStudentQuestions = studentList.reduce((acc, u) => acc + (u.question_count || 0), 0);

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* KART 1: YÖNETİCİ KADROSU */}
                      <div className="bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-white p-5 rounded-2xl border border-purple-200/90 shadow-sm flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield size={14} className="text-purple-600" />
                            <span>Yönetici (Admin) Kadrosu</span>
                          </span>
                          <div className="text-2xl font-black text-purple-950 flex items-baseline gap-2">
                            <span>{adminList.length} Kullanıcı</span>
                            <span className="text-xs font-semibold text-purple-600/80">({totalAdminQuestions} test sorusu)</span>
                          </div>
                          <p className="text-[11px] text-slate-500">Sistem ayarlarını, RAG kurallarını ve canlı duyuruları yönetebilir.</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-purple-100/80 text-purple-700 flex items-center justify-center font-bold text-xl shadow-inner flex-shrink-0">
                          👑
                        </div>
                      </div>

                      {/* KART 2: ÖĞRENCİ HESAPLARI */}
                      <div className="bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-white p-5 rounded-2xl border border-blue-200/90 shadow-sm flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Users size={14} className="text-blue-600" />
                            <span>Kayıtlı Öğrenciler</span>
                          </span>
                          <div className="text-2xl font-black text-blue-950 flex items-baseline gap-2">
                            <span>{studentList.length} Öğrenci</span>
                            <span className="text-xs font-semibold text-blue-600/80">({totalStudentQuestions} soru soruldu)</span>
                          </div>
                          <p className="text-[11px] text-slate-500">Sohbet asistanına aktif soru soran kayıtlı öğrenciler.</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold text-xl shadow-inner flex-shrink-0">
                          🎓
                        </div>
                      </div>
                    </div>

                    {/* ARAMA ÇUBUĞU */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative w-full sm:w-96">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                          placeholder="Kullanıcı adı veya rol ara..."
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 transition"
                        />
                      </div>
                      <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                        <span className="px-3 py-1 bg-slate-100 rounded-lg">Toplam {usersList.length} Kayıtlı Kullanıcı</span>
                      </div>
                    </div>

                    {isLoadingUsers ? (
                      <div className="p-16 text-center text-slate-400 font-medium">Kullanıcılar yükleniyor...</div>
                    ) : (
                      <div className="space-y-6">

                        {/* ==================== 1. YÖNETİCİ KADROSU KUTUCUĞU ==================== */}
                        <div className="bg-white rounded-2xl border border-purple-200/80 shadow-sm overflow-hidden">
                          <div className="p-4 bg-gradient-to-r from-purple-500/10 via-purple-50 to-white border-b border-purple-100 flex items-center justify-between">
                            <h3 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                              <span>👑 YÖNETİCİ (ADMİN) KADROSU ({adminList.length})</span>
                            </h3>
                            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                              Sistem Yetkilileri
                            </span>
                          </div>

                          {adminList.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs italic">
                              Arama filtrenize uyan yönetici bulunamadı.
                            </div>
                          ) : (
                            <div className="divide-y divide-purple-50">
                              {adminList.map(user => (
                                <div key={user.id} className="p-4 hover:bg-purple-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                                      {user.username.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-slate-800">{user.username}</h4>
                                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                                          👑 Admin
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        {user.question_count} soru / test mesajı gönderdi
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      onClick={() => {
                                        setResettingUser(user);
                                        setNewPasswordInput('');
                                      }}
                                      className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800 text-slate-700 font-bold transition shadow-sm flex items-center gap-1.5"
                                      title="Şifresini Yenile"
                                    >
                                      <Key size={13} className="text-amber-600" />
                                      <span>Şifre Sıfırla</span>
                                    </button>

                                    <button
                                      onClick={() => handleToggleUserRole(user.id, user.role)}
                                      className="text-xs px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold transition flex items-center gap-1.5"
                                      title="Öğrenci Rolüne Düşür"
                                    >
                                      <UserX size={13} />
                                      <span>Öğrenci Yap</span>
                                    </button>

                                    <button
                                      onClick={() => handleDeleteUser(user.id, user.username)}
                                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                      title="Kullanıcıyı Sil"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* ==================== 2. ÖĞRENCİ HESAPLARI KUTUCUĞU ==================== */}
                        <div className="bg-white rounded-2xl border border-blue-200/80 shadow-sm overflow-hidden">
                          <div className="p-4 bg-gradient-to-r from-blue-500/10 via-blue-50 to-white border-b border-blue-100 flex items-center justify-between">
                            <h3 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                              <span>🎓 KAYITLI ÖĞRENCİLER ({studentList.length})</span>
                            </h3>
                            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              Standart Kullanıcılar
                            </span>
                          </div>

                          {studentList.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs italic">
                              Arama filtrenize uyan öğrenci bulunamadı.
                            </div>
                          ) : (
                            <div className="divide-y divide-blue-50">
                              {studentList.map(user => (
                                <div key={user.id} className="p-4 hover:bg-blue-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                                      {user.username.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-slate-800">{user.username}</h4>
                                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                                          🎓 Öğrenci
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        Toplam {user.question_count} soru sordu
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      onClick={() => {
                                        setResettingUser(user);
                                        setNewPasswordInput('');
                                      }}
                                      className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800 text-slate-700 font-bold transition shadow-sm flex items-center gap-1.5"
                                      title="Şifresini Yenile"
                                    >
                                      <Key size={13} className="text-amber-600" />
                                      <span>Şifre Sıfırla</span>
                                    </button>

                                    <button
                                      onClick={() => handleToggleUserRole(user.id, user.role)}
                                      className="text-xs px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold transition flex items-center gap-1.5"
                                      title="Yönetici Yap"
                                    >
                                      <UserCheck size={13} />
                                      <span>Admin Yap</span>
                                    </button>

                                    <button
                                      onClick={() => handleDeleteUser(user.id, user.username)}
                                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                      title="Öğrenci Hesabını Sil"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </>
                );
              })()}

            </motion.div>
          )}

          {/* 11. GÜVENLİK & KARA LİSTE */}
          {activeTab === 'guardrails' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-6">
              <div className="bg-white p-7 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <ShieldAlert className="text-rose-600" size={20} />
                    <span>Güvenlik, Argo ve Kara Liste Filtresi</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Öğrenciler soru sorarken bu anahtar kelimelerden biri tespit edilirse yapay zeka harici cevap vermez ve doğrudan belirlediğiniz nazik uyarıyı iletir.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Engellenecek Kelimeler ({bannedKeywords.length})
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBannedKeyword}
                      onChange={e => setNewBannedKeyword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddBannedKeyword())}
                      placeholder="Yasaklı kelime yazıp ekle deyin..."
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                    />
                    <button
                      type="button"
                      onClick={handleAddBannedKeyword}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition text-xs flex items-center gap-1.5"
                    >
                      <Plus size={16} />
                      <span>Ekle</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[90px]">
                    {bannedKeywords.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Henüz yasaklı kelime eklenmedi.</p>
                    ) : (
                      bannedKeywords.map(kw => (
                        <span
                          key={kw}
                          className="px-3 py-1 bg-white border border-rose-200 text-rose-700 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBannedKeyword(kw)}
                            className="hover:text-rose-900 transition"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Öğrenciye Gösterilecek Otomatik Ret Yanıtı
                  </label>
                  <textarea
                    rows={3}
                    value={guardrailRejectionMsg}
                    onChange={e => setGuardrailRejectionMsg(e.target.value)}
                    placeholder="Bu platform yalnızca fakülte akademik ve idari işlemlerine hizmet vermektedir..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>

                <button
                  onClick={handleSaveGuardrails}
                  disabled={isSavingGuardrails}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {isSavingGuardrails ? (
                    <>
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Güvenlik Kurallarını Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* 12. SİSTEM & BOT AYARLARI */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-6">
              <div className="bg-white p-7 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <SettingsIcon className="text-slate-700" size={20} />
                    <span>Sistem, Kişilik ve Karşılama Ayarları</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Botun yanıt verme üslubunu, fakülte adını ve açılış mesajını koda dokunmadan tek tıkla özelleştirin.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Asistan / Bot İsmi
                      </label>
                      <input
                        type="text"
                        value={botSettings.bot_name}
                        onChange={e => setBotSettings({ ...botSettings, bot_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Fakülte / Kurum Adı
                      </label>
                      <input
                        type="text"
                        value={botSettings.department_name}
                        onChange={e => setBotSettings({ ...botSettings, department_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Kurumsal WhatsApp Numarası
                      </label>
                      <input
                        type="text"
                        value={botSettings.whatsapp_number || ''}
                        onChange={e => setBotSettings({ ...botSettings, whatsapp_number: e.target.value })}
                        placeholder="Örn: 15551662647"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Bot Yanıt Üslubu / Kişilik
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBotSettings({ ...botSettings, bot_tone: 'resmi' })}
                        className={`p-4 rounded-xl border text-left transition ${
                          botSettings.bot_tone === 'resmi'
                            ? 'bg-blue-50/70 border-blue-500 text-blue-900 ring-2 ring-blue-100'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <h4 className="text-sm font-bold">Resmi & Akademik</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Mesafe koruyan, kurumsal, yönetmelik diliyle net cevaplar.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBotSettings({ ...botSettings, bot_tone: 'samimi' })}
                        className={`p-4 rounded-xl border text-left transition ${
                          botSettings.bot_tone === 'samimi'
                            ? 'bg-purple-50/70 border-purple-500 text-purple-900 ring-2 ring-purple-100'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <h4 className="text-sm font-bold">Samimi & Rehber Öğrenci</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Dostane, sıcak, teşvik edici ve genç üniversiteli üslubu.</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      İlk Karşılama Mesajı (Chat Giriş)
                    </label>
                    <textarea
                      rows={3}
                      value={botSettings.welcome_message}
                      onChange={e => setBotSettings({ ...botSettings, welcome_message: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-slate-800/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {isSavingSettings ? (
                    <>
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Sistem Ayarlarını Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* 13. WHATSAPP & META WEBHOOK YÖNETİMİ */}
          {activeTab === 'whatsapp' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl space-y-6">
              
              {/* 🟢 1. MASTER KONTROL & CANLI BOT DURUM PANOSU */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${
                      detectedTunnelUrl && waStatus?.current_meta_webhook === waSettings.webhook_url
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                        : detectedTunnelUrl
                          ? 'bg-amber-500 text-white shadow-amber-500/20'
                          : 'bg-slate-200 text-slate-600'
                    }`}>
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-800">WhatsApp Danışman Asistanı</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          detectedTunnelUrl && waStatus?.current_meta_webhook === waSettings.webhook_url
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : detectedTunnelUrl
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            detectedTunnelUrl ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`} />
                          {detectedTunnelUrl && waStatus?.current_meta_webhook === waSettings.webhook_url
                            ? '● Bot Canlı & Mesaj Alıyor'
                            : detectedTunnelUrl
                              ? '▲ Tünel Açık (Meta Eşitlenmeli)'
                              : '○ Bot Çevrimdışı (Tünel Kapalı)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Öğrenciler WhatsApp üzerinden yazdığında otomatik cevaplar, butonlar ve menülerle anında karşılanır.
                      </p>
                    </div>
                  </div>

                  {/* Tünel Aksiyon Butonları */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                    {detectedTunnelUrl ? (
                      <>
                        <button
                          type="button"
                          onClick={handleStartTunnel}
                          disabled={isStartingTunnel || isStoppingTunnel}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                          title="Tüneli kapatıp yeni bir adres ile baştan başlatır"
                        >
                          <RefreshCw size={13} className={isStartingTunnel ? 'animate-spin' : ''} />
                          <span>{isStartingTunnel ? 'Yenileniyor...' : 'Yeniden Başlat'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleStopTunnel}
                          disabled={isStartingTunnel || isStoppingTunnel}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                          title="Cloudflare tünelini durdurur"
                        >
                          <Power size={13} className={isStoppingTunnel ? 'animate-spin' : ''} />
                          <span>{isStoppingTunnel ? 'Durduruluyor...' : 'Tüneli Durdur'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartTunnel}
                        disabled={isStartingTunnel || isStoppingTunnel}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-emerald-600/25 disabled:opacity-50"
                      >
                        {isStartingTunnel ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Tünel Başlatılıyor & Meta Eşitleniyor...</span>
                          </>
                        ) : (
                          <>
                            <Play size={14} fill="currentColor" />
                            <span>🚀 Cloudflare Tünelini Başlat</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={handleTestWaConnection}
                      disabled={isTestingWa}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                      title="Meta bağlantısını canlı kontrol et"
                    >
                      <RefreshCw size={12} className={isTestingWa ? 'animate-spin text-emerald-600' : ''} />
                      <span>{isTestingWa ? 'Kontrol...' : 'Durumu Yenile'}</span>
                    </button>
                  </div>
                </div>

                {/* 4'LÜ SİSTEM TEŞHİS GÖSTERGELERİ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Kayıtlı Numara</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono block truncate">
                      {waStatus?.phone_number || 'Tanımlanmadı'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                      {waStatus?.verified_name || 'Test Hesabı'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Meta Kalite Puanı</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${waStatus?.quality_rating === 'GREEN' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        {waStatus?.quality_rating === 'GREEN' ? 'Yeşil (Yüksek)' : (waStatus?.quality_rating || 'Bilinmiyor')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Mesaj iletimi serbest</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Cloudflare Tüneli</span>
                    <span className={`text-xs sm:text-sm font-bold block truncate ${detectedTunnelUrl ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {detectedTunnelUrl ? '● Tünel Açık' : '○ Tünel Kapalı'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block truncate font-mono">
                      {detectedTunnelUrl ? detectedTunnelUrl.replace('https://', '') : 'Bağlantı yok'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Meta Callback Eşleşmesi</span>
                    <span className={`text-xs sm:text-sm font-bold block truncate ${
                      waStatus?.current_meta_webhook && waStatus.current_meta_webhook === waSettings.webhook_url
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}>
                      {waStatus?.current_meta_webhook && waStatus.current_meta_webhook === waSettings.webhook_url
                        ? '✓ Birebir Eşleşti'
                        : '▲ Eşitlenmeli'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                      {waStatus?.current_meta_webhook && waStatus.current_meta_webhook === waSettings.webhook_url
                        ? 'WhatsApp hazır'
                        : 'Tek tıkla eşitleyin'}
                    </span>
                  </div>
                </div>

                {/* Uyuşmazlık Uyarısı & Hızlı Eşitleme Çözümü */}
                {waStatus?.current_meta_webhook && waSettings.webhook_url && waStatus.current_meta_webhook !== waSettings.webhook_url && (
                  <div className="mt-4 p-3.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold">Meta Webhook Güncellemesi Gerekiyor: </span>
                        Tünel adresiniz değiştiği için Facebook Developers'taki eski adres güncellenmeli.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncMetaWebhook}
                      disabled={isSyncingMeta}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Zap size={13} />
                      <span>{isSyncingMeta ? 'Eşitleniyor...' : 'Meta\'yı Şimdi Eşitle'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 🚀 2 KOLONLU ETKİLEŞİM & SİMÜLASYON ALANI */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* SOL KOLON (5 Kolon): TEST MESAJI GÖNDERME & CANLI GELEN MESAJLAR */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* KART 1: KENDİ TELEFONUMA CANLI WHATSAPP TEST MESAJI */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Send size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">Kendi Telefonuna Canlı Test Gönder</h4>
                        <p className="text-[11px] text-slate-500">Botun butonlu cevabını kendi WhatsApp'ınızda anında görün.</p>
                      </div>
                    </div>

                    <form onSubmit={handleSendTestMessage} className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          WhatsApp Numaranız
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={testRecipientPhone}
                            onChange={e => setTestRecipientPhone(e.target.value)}
                            placeholder="0507 082 43 44"
                            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                          <button
                            type="submit"
                            disabled={isSendingTestMsg || !testRecipientPhone.trim()}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50"
                          >
                            {isSendingTestMsg ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>İletiliyor...</span>
                              </>
                            ) : (
                              <>
                                <Send size={13} />
                                <span>Gönder</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        💡 Numaranızı <code>05xx...</code> veya <code>905xx...</code> formatında yazabilirsiniz.
                      </p>
                    </form>
                  </div>

                  {/* KART 2: CANLI GELEN WHATSAPP MESAJLARI (SON SORULAR) */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-emerald-600" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">WhatsApp Gelen Son Mesajlar</h4>
                      </div>
                      <button
                        type="button"
                        onClick={fetchRecentWaMessages}
                        disabled={isLoadingRecentWa}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
                        title="Yenile"
                      >
                        <RefreshCw size={13} className={isLoadingRecentWa ? 'animate-spin text-emerald-600' : ''} />
                      </button>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {recentWaMessages.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          Henüz WhatsApp üzerinden kayıtlı soru bulunmuyor.
                        </div>
                      ) : (
                        recentWaMessages.map(m => (
                          <div key={m.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/60 transition space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-slate-700 font-mono">+{m.sender}</span>
                              <span className="text-slate-400">{m.created_at || ''}</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                              "{m.question}"
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                              Bot: {m.answer}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* SAĞ KOLON (7 Kolon): WHATSAPP CANLI GÖRSEL SİMÜLATÖRÜ */}
                <div className="lg:col-span-7">
                  <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden flex flex-col h-[520px]">
                    
                    {/* WhatsApp Üst Çubuğu (Header) */}
                    <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-lg shrink-0">
                          🎓
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm">Adıyaman Üniv. CENG Asistanı</span>
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white text-emerald-700 text-[9px] font-black">
                              ✓
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-100 block">çevrimiçi</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSimChat([{
                          sender: 'bot',
                          text: 'Merhaba! Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü resmi asistanına hoş geldiniz. 💻 Staj, dersler veya sınavlar hakkında bir konu seçebilirsiniz.',
                          options: ['CENG Stajı', 'Ders Müfredatı', 'Bölüm İletişim'],
                          interactive_type: 'button',
                          time: '10:00'
                        }])}
                        className="text-[11px] text-emerald-100 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition"
                        title="Simülatör sohbetini temizle"
                      >
                        Temizle
                      </button>
                    </div>

                    {/* WhatsApp Sohbet Mesaj Alanı */}
                    <div className="flex-1 bg-[#efeae2] p-4 overflow-y-auto space-y-3.5 text-xs">
                      {simChat.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                          
                          {/* Kullanıcı Mesajı */}
                          {msg.sender === 'user' ? (
                            <div className="bg-[#d9fdd3] text-slate-800 rounded-xl rounded-tr-xs px-3 py-2 max-w-[85%] shadow-xs space-y-1">
                              <p className="text-xs whitespace-pre-wrap">{msg.text}</p>
                              <span className="text-[9px] text-slate-500 text-right block">{msg.time || '10:01'}</span>
                            </div>
                          ) : (
                            /* Bot Mesajı (WhatsApp Resmi Kart Tasarımı) */
                            <div className="bg-white text-slate-800 rounded-xl rounded-tl-xs p-3 max-w-[90%] shadow-xs space-y-2 border border-slate-200/40">
                              
                              {/* Resmi Başlık */}
                              <div className="border-b border-slate-100 pb-1.5">
                                <span className="font-bold text-[11px] text-slate-900 block">🎓 ADIYAMAN ÜNİVERSİTESİ</span>
                                <span className="text-[10px] text-slate-500 block">🏛️ Bilgisayar Mühendisliği Bölümü</span>
                              </div>

                              {/* Gövde Metni */}
                              <p className="text-xs whitespace-pre-wrap leading-relaxed text-slate-700">
                                {msg.text}
                              </p>

                              {/* Alt Bilgi */}
                              <div className="pt-1 text-[10px] text-slate-400 italic">
                                ⚡ Mühendislik Fakültesi Danışman Asistanı
                              </div>

                              {/* Butonlar veya Liste Seçenekleri */}
                              {msg.options && msg.options.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                  {msg.options.map((opt, oIdx) => (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() => handleRunSimulator(opt)}
                                      className="w-full text-center py-2 px-3 bg-slate-50 hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 font-bold rounded-lg border border-slate-200/80 hover:border-emerald-300 transition text-[11px] shadow-2xs flex items-center justify-center gap-1.5"
                                    >
                                      <span>{opt}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              <span className="text-[9px] text-slate-400 text-right block pt-0.5">{msg.time || '10:02'}</span>
                            </div>
                          )}

                        </div>
                      ))}

                      {simLoading && (
                        <div className="bg-white rounded-xl px-3 py-2 shadow-xs text-xs text-slate-500 inline-flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                          <span className="text-[11px]">Asistan yanıt yazıyor...</span>
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Hızlı Öneri Çipleri & Gönderme Girişi */}
                    <div className="bg-[#f0f2f5] p-2.5 border-t border-slate-200 shrink-0 space-y-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                        <span className="text-slate-400 font-bold shrink-0 text-[10px]">Hızlı:</span>
                        {['CENG Stajı', 'AGNO 1.80 Barajı', 'Bitirme Projesi', 'Bölüm İletişim'].map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleRunSimulator(q)}
                            className="bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-2 py-0.5 rounded-full border border-slate-300 text-[10px] font-medium shrink-0 transition"
                          >
                            {q}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={simQuery}
                          onChange={e => setSimQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleRunSimulator()}
                          placeholder="Mesaj yazın ve WhatsApp görünümünü test edin..."
                          className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleRunSimulator()}
                          disabled={simLoading || !simQuery.trim()}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center shrink-0 disabled:opacity-50"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* ⚙️ 3. GELİŞMİŞ META API & KİMLİK AYARLARI (AÇILIR-KAPANIR AKORDİYON) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setIsAdvancedSettingsOpen(!isAdvancedSettingsOpen)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                      <Key size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        ⚙️ Gelişmiş Meta API & Webhook Ayarları (App ID, Secret, Token)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isAdvancedSettingsOpen 
                          ? 'Ayarları gizlemek için tıklayın.' 
                          : 'Bu bilgiler sisteminizde kayıtlıdır. Yalnızca token veya gizli anahtarlarınızı değiştirmek istediğinizde açın.'}
                      </p>
                    </div>
                  </div>
                  <div className="text-slate-400 p-1">
                    {isAdvancedSettingsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {/* Akordiyon İçeriği */}
                <AnimatePresence>
                  {isAdvancedSettingsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-6 border-t border-slate-100 space-y-6 bg-slate-50/30"
                    >
                      {/* WEBHOOK URL & DOĞRULAMA BELİRTECİ */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Globe size={16} className="text-blue-600" />
                          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Webhook (Callback URL) & Verify Token</h5>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-slate-700">Webhook Geri Çağırma Adresi</label>
                              {detectedTunnelUrl && (
                                <button
                                  type="button"
                                  onClick={() => setWaSettings({ ...waSettings, webhook_url: `${detectedTunnelUrl}/webhook/whatsapp/meta` })}
                                  className="text-[10px] font-bold text-emerald-700 hover:underline"
                                >
                                  Tüneli Doldur
                                </button>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={waSettings.webhook_url}
                                onChange={e => setWaSettings({ ...waSettings, webhook_url: e.target.value.trim() })}
                                placeholder="https://...trycloudflare.com/webhook/whatsapp/meta"
                                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-200"
                              />
                              <button
                                type="button"
                                onClick={() => copyToClipboard(waSettings.webhook_url, 'Webhook URL')}
                                className="px-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-xs font-bold"
                              >
                                {copiedField === 'Webhook URL' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Doğrulama Belirteci (Verify Token)</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={waSettings.verify_token}
                                onChange={e => setWaSettings({ ...waSettings, verify_token: e.target.value })}
                                placeholder="adiyaman_muhendislik_2026"
                                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-200"
                              />
                              <button
                                type="button"
                                onClick={() => copyToClipboard(waSettings.verify_token, 'Verify Token')}
                                className="px-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-xs font-bold"
                              >
                                {copiedField === 'Verify Token' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* META API ERİŞİM BİLGİLERİ */}
                      <div className="space-y-4 pt-4 border-t border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <Key size={16} className="text-indigo-600" />
                          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Meta API Erişim Bilgileri (Phone ID & Token)</h5>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Telefon Numarası Kimliği (Phone ID)</label>
                            <input
                              type="text"
                              value={waSettings.phone_id}
                              onChange={e => setWaSettings({ ...waSettings, phone_id: e.target.value })}
                              placeholder="1278607355343552"
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-slate-700">Meta Access Token</label>
                              <button
                                type="button"
                                onClick={() => setShowWaToken(!showWaToken)}
                                className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                              >
                                {showWaToken ? <EyeOff size={11} /> : <Eye size={11} />}
                                <span>{showWaToken ? 'Gizle' : 'Göster'}</span>
                              </button>
                            </div>
                            <input
                              type={showWaToken ? 'text' : 'password'}
                              value={waSettings.access_token}
                              onChange={e => setWaSettings({ ...waSettings, access_token: e.target.value })}
                              placeholder="EAAPvPobOrksB..."
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* FACEBOOK DEVELOPERS OTOMATİK EŞİTLEME */}
                      <div className="space-y-4 pt-4 border-t border-slate-200/60 bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-indigo-200 uppercase tracking-wider">3. Facebook Developers API Entegrasyonu</h5>
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                            Otomatik Eşitleme
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-indigo-300 uppercase mb-1">Meta App ID</label>
                            <input
                              type="text"
                              value={waSettings.app_id}
                              onChange={e => setWaSettings({ ...waSettings, app_id: e.target.value })}
                              placeholder="1107476758834763"
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold text-indigo-300 uppercase">Meta App Secret</label>
                              <button
                                type="button"
                                onClick={() => setShowWaSecret(!showWaSecret)}
                                className="text-[10px] text-indigo-300 hover:text-white"
                              >
                                {showWaSecret ? 'Gizle' : 'Göster'}
                              </button>
                            </div>
                            <input
                              type={showWaSecret ? 'text' : 'password'}
                              value={waSettings.app_secret}
                              onChange={e => setWaSettings({ ...waSettings, app_secret: e.target.value })}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleSyncMetaWebhook}
                          disabled={isSyncingMeta}
                          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                        >
                          {isSyncingMeta ? (
                            <>
                              <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                              <span>Meta Developers ile Eşitleniyor...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={14} />
                              <span>Meta Webhook'unu Otomatik Güncelle (developers.facebook.com'a Girmeden)</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* KAYDET BUTONU */}
                      <button
                        onClick={handleSaveWaSettings}
                        disabled={isSavingWa}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs disabled:opacity-50 shadow-sm"
                      >
                        {isSavingWa ? (
                          <>
                            <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                            <span>Kaydediliyor...</span>
                          </>
                        ) : (
                          <>
                            <Save size={15} />
                            <span>Gelişmiş Ayarları Kaydet</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          )}

        </div>
      </main>

      {/* ===================== BELGE DÜZENLEME MODAL (INLINE EDIT) ===================== */}
      <AnimatePresence>
        {editingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Edit3 size={18} className="text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Belgeyi Düzenle: <span className="text-blue-600">{editingDoc.source}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setEditingDoc(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <div className="text-xs text-slate-500 bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>Bu metni düzenleyip kaydettiğinizde, yapay zeka yeni içeriği anında hafızasına alacaktır.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Belge Metni
                  </label>
                  <textarea
                    rows={15}
                    value={editingDoc.content}
                    onChange={e => setEditingDoc({ ...editingDoc, content: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs font-mono leading-relaxed outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleSaveDocEdit}
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Kaydediliyor & Eğitiliyor...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Değişiklikleri Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {resettingUser && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-amber-600" />
                  <h3 className="font-bold text-slate-800 text-sm">
                    Şifre Sıfırla: <span className="text-indigo-600">{resettingUser.username}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setResettingUser(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500">
                  Kullanıcı için yeni bir parola belirleyin. Kaydettikten sonra öğrenci sisteme bu yeni parolayla giriş yapabilir.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Yeni Şifre
                  </label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    placeholder="En az 4 karakter girin..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-200 transition"
                    autoFocus
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleSaveResetPassword}
                  disabled={isResettingPass || !newPasswordInput.trim()}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition flex items-center gap-2 shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  {isResettingPass ? (
                    <>
                      <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Key size={15} />
                      <span>Şifreyi Güncelle</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
