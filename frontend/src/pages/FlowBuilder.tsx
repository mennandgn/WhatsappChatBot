import { useCallback, useRef, useState, useEffect } from 'react';
import type { DragEvent } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  MarkerType,
  Panel,
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  MessageSquare,
  MousePointerClick,
  ListChecks,
  HelpCircle,
  List,
  Image,
  Link,
  Play,
  Save,
  Trash2,
  Plus,
  ArrowLeft,
  Zap,
  CheckCircle,
  ChevronRight,
  X,
  Layers,
  Eye,
  Copy,
  Search,
  LayoutGrid,
  Smartphone,
  Upload,
  RotateCcw,
  Send,
  FileText,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

// ─── Renk & İkon Eşleme ──────────────────────────────────────────────────────
const NODE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: ReactNode }> = {
  textMessage: {
    label: 'Metin Mesajı',
    color: 'text-blue-700',
    bgColor: 'bg-gradient-to-r from-blue-50 to-sky-50',
    borderColor: 'border-blue-200',
    icon: <MessageSquare size={15} className="text-blue-600" />,
  },
  buttonReply: {
    label: 'Cevap Düğümleri (WP)',
    color: 'text-emerald-700',
    bgColor: 'bg-gradient-to-r from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-300',
    icon: <MousePointerClick size={15} className="text-emerald-600" />,
  },
  multiChoice: {
    label: 'Çoklu Seçenekler',
    color: 'text-indigo-700',
    bgColor: 'bg-gradient-to-r from-indigo-50 to-blue-50',
    borderColor: 'border-indigo-200',
    icon: <ListChecks size={15} className="text-indigo-600" />,
  },
  askQuestion: {
    label: 'Soru Sor',
    color: 'text-emerald-700',
    bgColor: 'bg-gradient-to-r from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-200',
    icon: <HelpCircle size={15} className="text-emerald-600" />,
  },
  listMessage: {
    label: 'Liste Menüsü',
    color: 'text-teal-700',
    bgColor: 'bg-gradient-to-r from-teal-50 to-cyan-50',
    borderColor: 'border-teal-200',
    icon: <List size={15} className="text-teal-600" />,
  },
  sendMedia: {
    label: 'Medya & Belge',
    color: 'text-amber-700',
    bgColor: 'bg-gradient-to-r from-amber-50 to-orange-50',
    borderColor: 'border-amber-200',
    icon: <Image size={15} className="text-amber-600" />,
  },
  linkButton: {
    label: 'Web Linki',
    color: 'text-pink-700',
    bgColor: 'bg-gradient-to-r from-pink-50 to-rose-50',
    borderColor: 'border-pink-200',
    icon: <Link size={15} className="text-pink-600" />,
  },
  startNode: {
    label: 'Başlangıç',
    color: 'text-emerald-800',
    bgColor: 'bg-gradient-to-r from-emerald-100/80 to-green-50',
    borderColor: 'border-emerald-300',
    icon: <Play size={15} className="text-emerald-600 fill-emerald-600" />,
  },
};

// ─── Node Düzenleme Paneli ────────────────────────────────────────────────────
interface NodeEditPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (id: string, data: any) => void;
  onDuplicate: (node: Node) => void;
  onDelete: () => void;
}

function NodeEditPanel({ node, onClose, onUpdate, onDuplicate, onDelete }: NodeEditPanelProps) {
  if (!node) return null;
  const cfg = NODE_CONFIG[(node.data as any).type as string] || NODE_CONFIG.textMessage;
  const data = node.data as any;

  const update = (field: string, value: any) => {
    onUpdate(node.id, { ...data, [field]: value });
  };

  const updateOption = (idx: number, value: string) => {
    const opts = [...(data.options || [])];
    opts[idx] = value;
    onUpdate(node.id, { ...data, options: opts });
  };

  const addOption = () => {
    onUpdate(node.id, { ...data, options: [...(data.options || []), 'Yeni Seçenek'] });
  };

  const removeOption = (idx: number) => {
    const opts = (data.options || []).filter((_: any, i: number) => i !== idx);
    onUpdate(node.id, { ...data, options: opts });
  };

  return (
    <div className="w-84 bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl z-20 transition-all animate-in slide-in-from-right-4">
      {/* Başlık */}
      <div className={`px-4 py-3.5 border-b border-slate-200 flex items-center justify-between ${cfg.bgColor}`}>
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-white/80 shadow-xs">{cfg.icon}</div>
          <div>
            <span className={`text-xs font-extrabold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
            <p className="text-[10px] text-slate-500 font-mono">ID: {node.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicate(node)}
            className="p-1.5 rounded-lg hover:bg-white/80 text-slate-600 transition"
            title="Bu bloğu kopyala/çoğalt"
          >
            <Copy size={15} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/80 text-slate-500 transition">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Form Alanları */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Başlık / Etiket */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Blok Başlığı / Etiketi</label>
          <input
            type="text"
            value={data.label || ''}
            onChange={e => update('label', e.target.value)}
            placeholder="Örn: 1. Sınıf Müfredatı"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Metin / Soru / Başlangıç */}
        {['textMessage', 'askQuestion', 'startNode'].includes(data.type) && (
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              {data.type === 'askQuestion' ? 'Soru Metni' : 'Mesaj İçeriği'}
            </label>
            <textarea
              rows={5}
              value={data.message || ''}
              onChange={e => update('message', e.target.value)}
              placeholder="Mesajınızı buraya yazın..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-300 resize-none leading-relaxed"
            />
          </div>
        )}

        {/* WhatsApp Cevap Düğümleri (En Fazla 3 Buton) */}
        {data.type === 'buttonReply' && (
          <div className="space-y-3.5">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3 text-xs leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <Smartphone size={14} className="text-emerald-600" />
                <span>WhatsApp Cevap Düğümleri Kuralı</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Meta WhatsApp Cloud API kuralı gereğince <strong>en fazla 3 adet</strong> hızlı cevap butonu eklenebilir. Her buton başlığı en fazla <strong>20 karakter</strong> olmalıdır.
              </p>
            </div>

            {/* Görsel / Banner URL */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Görsel / Banner URL (İsteğe Bağlı)
              </label>
              <input
                type="text"
                value={data.mediaUrl || ''}
                onChange={e => update('mediaUrl', e.target.value)}
                placeholder="https://.../gorsel.jpg"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Örn: Mesajın üstünde gösterilecek görsel bağlantısı</p>
            </div>

            {/* Mesaj Metni */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Mesaj Metni
              </label>
              <textarea
                rows={4}
                value={data.message || ''}
                onChange={e => update('message', e.target.value)}
                placeholder="Öğrenciye iletilecek metin..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-400 resize-none leading-relaxed"
              />
            </div>

            {/* Hızlı Şablonlar */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Hızlı Şablon Butonları
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => update('options', ['ONAYLIYORUM ✅', 'ONAYLAMIYORUM ❌'])}
                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition"
                >
                  Onay / Red
                </button>
                <button
                  type="button"
                  onClick={() => update('options', ['EVET 👍', 'HAYIR 👎'])}
                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition"
                >
                  Evet / Hayır
                </button>
                <button
                  type="button"
                  onClick={() => update('options', ['DETAYLI BİLGİ ℹ️', 'DANIŞMANA SOR 👨‍🏫', 'ANA MENÜ 🏠'])}
                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition"
                >
                  3'lü Menü
                </button>
              </div>
            </div>

            {/* Buton Listesi (Maksimum 3) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Cevap Düğümleri
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (data.options || []).length >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {(data.options || []).length} / 3 Buton
                  </span>
                </div>
                <button
                  type="button"
                  disabled={(data.options || []).length >= 3}
                  onClick={() => {
                    if ((data.options || []).length < 3) {
                      update('options', [...(data.options || []), `Seçenek ${(data.options || []).length + 1}`]);
                    }
                  }}
                  className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition"
                >
                  <Plus size={12} /> {(data.options || []).length >= 3 ? 'Limit Doldu (3)' : 'Buton Ekle'}
                </button>
              </div>

              <div className="space-y-2">
                {(data.options || []).slice(0, 3).map((opt: string, idx: number) => {
                  const isTooLong = opt.length > 20;
                  return (
                    <div key={idx} className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          maxLength={25}
                          value={opt}
                          onChange={e => updateOption(idx, e.target.value)}
                          placeholder={`Buton ${idx + 1}`}
                          className={`flex-1 bg-white border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 ${
                            isTooLong
                              ? 'border-amber-400 focus:ring-amber-300'
                              : 'border-slate-300 focus:ring-emerald-400'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
                          title="Butonu Kaldır"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] px-7">
                        <span className={isTooLong ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                          {opt.length}/20 kr {isTooLong && '(WhatsApp 20 karakteri aşan kısmı keser)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Diğer Çoklu Seçenekli Bloklar */}
        {['multiChoice', 'listMessage'].includes(data.type) && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Üst Mesaj</label>
              <textarea
                rows={3}
                value={data.message || ''}
                onChange={e => update('message', e.target.value)}
                placeholder="Seçeneklerin üstündeki açıklama..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-violet-300 resize-none leading-relaxed"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Seçenekler ({(data.options || []).length})
                </label>
                <button
                  onClick={addOption}
                  className="text-[11px] bg-violet-100 hover:bg-violet-200 text-violet-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition"
                >
                  <Plus size={12} /> Ekle
                </button>
              </div>
              <div className="space-y-2">
                {(data.options || []).map((opt: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => updateOption(idx, e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-300"
                    />
                    <button
                      onClick={() => removeOption(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Medya / Belge */}
        {data.type === 'sendMedia' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Medya Türü</label>
              <select
                value={data.mediaType || 'document'}
                onChange={e => update('mediaType', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-300"
              >
                <option value="document">Belge / PDF 📑</option>
                <option value="image">Görsel / Resim 🖼️</option>
                <option value="video">Video 🎬</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Dosya URL'si</label>
              <input
                type="url"
                value={data.mediaUrl || ''}
                onChange={e => update('mediaUrl', e.target.value)}
                placeholder="https://... /belge.pdf"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Açıklama / Mesaj</label>
              <textarea
                rows={3}
                value={data.message || ''}
                onChange={e => update('message', e.target.value)}
                placeholder="Belge ile birlikte gönderilecek açıklama..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
              />
            </div>
          </>
        )}

        {/* Link Butonu */}
        {data.type === 'linkButton' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Buton Yazısı</label>
              <input
                type="text"
                value={data.buttonText || ''}
                onChange={e => update('buttonText', e.target.value)}
                placeholder="Örn: Resmi Web Sitesini Aç 🌐"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Hedef URL</label>
              <input
                type="url"
                value={data.url || ''}
                onChange={e => update('url', e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-pink-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Üst Mesaj</label>
              <textarea
                rows={3}
                value={data.message || ''}
                onChange={e => update('message', e.target.value)}
                placeholder="Link butonunun üstündeki mesaj..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-pink-300 resize-none leading-relaxed"
              />
            </div>
          </>
        )}
      </div>

      {/* Alt Aksiyonlar */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <button
          onClick={() => onDuplicate(node)}
          className="px-3 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1.5 border border-indigo-200"
        >
          <Copy size={13} /> Klonla
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition flex items-center gap-1.5 border border-rose-200"
        >
          <Trash2 size={13} /> Bloğu Sil
        </button>
      </div>
    </div>
  );
}

// ─── Custom Node Görünümü ─────────────────────────────────────────────────────
function CustomNode({ data, selected }: { data: any; selected: boolean }) {
  const cfg = NODE_CONFIG[data.type] || NODE_CONFIG.textMessage;
  const isStart = data.type === 'startNode';
  const hasOptions = ['buttonReply', 'multiChoice', 'listMessage'].includes(data.type);

  return (
    <div
      className={`
        min-w-[210px] max-w-[270px] rounded-2xl bg-white border transition-all duration-200 shadow-md backdrop-blur-md overflow-hidden
        ${selected ? 'ring-3 ring-indigo-500 shadow-xl shadow-indigo-500/20 scale-[1.03] border-indigo-400' : 'border-slate-200/90 hover:border-slate-300 hover:shadow-lg'}
      `}
    >
      {/* Giriş Noktası */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3.5 !h-3.5 !bg-indigo-500 !border-2 !border-white shadow-sm hover:scale-125 transition-transform"
        />
      )}

      {/* Başlık */}
      <div className={`px-3 py-2 flex items-center gap-2 border-b border-slate-100 ${cfg.bgColor}`}>
        <div className="p-1 rounded-lg bg-white/90 shadow-xs flex items-center justify-center">
          {cfg.icon}
        </div>
        <span className={`text-xs font-extrabold truncate ${cfg.color}`}>{data.label || cfg.label}</span>
        {isStart && (
          <span className="ml-auto text-[9px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full shadow-xs">BAŞLANGIÇ</span>
        )}
      </div>

      {/* İçerik Önizleme */}
      <div className="px-3 py-2 text-xs text-slate-600 space-y-1.5 bg-white">
        {data.message && (
          <p className="line-clamp-2 leading-relaxed bg-slate-50/90 p-2 rounded-xl border border-slate-100/90 text-[11px] text-slate-700 font-medium">
            {data.message}
          </p>
        )}

        {/* Medya Rozeti */}
        {data.type === 'sendMedia' && data.mediaUrl && (
          <div className="flex items-center gap-1.5 p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 text-[10px] font-bold">
            <FileText size={12} />
            <span className="truncate">{data.mediaType === 'document' ? 'PDF Belgesi' : 'Medya'}</span>
          </div>
        )}

        {/* Link Butonu */}
        {data.type === 'linkButton' && (
          <div className="flex items-center gap-1.5 p-1.5 bg-pink-50 rounded-lg border border-pink-200 text-pink-700 text-[10px] font-bold">
            <ExternalLink size={12} />
            <span className="truncate">{data.buttonText || 'Link Butonu'}</span>
          </div>
        )}

        {/* WhatsApp Cevap Düğümleri (En fazla 3 adet) */}
        {data.type === 'buttonReply' && (
          <div className="space-y-1.5 pt-1 border-t border-emerald-100">
            {data.mediaUrl && (
              <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-h-24 mb-1 flex items-center justify-center">
                <img src={data.mediaUrl} alt="Header" className="w-full h-full object-cover" onError={(e)=>{ (e.target as any).style.display = 'none'; }} />
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold px-1 mb-0.5">
              <span className="flex items-center gap-1">
                <Smartphone size={11} className="text-emerald-600" /> WhatsApp Butonları
              </span>
              <span className={`px-1.5 py-0.2 rounded font-mono ${ (data.options || []).length > 3 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
                {Math.min((data.options || []).length, 3)}/3
              </span>
            </div>
            {(data.options || []).slice(0, 3).map((opt: string, idx: number) => (
              <div
                key={idx}
                className="relative flex items-center justify-between bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl px-2.5 py-1.5 text-[11px] text-emerald-950 font-bold shadow-2xs transition-colors group"
              >
                <div className="flex items-center gap-1.5 truncate pr-3">
                  <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-700 text-[9px] flex items-center justify-center flex-shrink-0 border border-emerald-200 font-extrabold">
                    {idx + 1}
                  </span>
                  <span className="truncate">{opt}</span>
                </div>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`opt-${idx}`}
                  className="!w-3.5 !h-3.5 !bg-emerald-600 !border-2 !border-white shadow-sm group-hover:scale-125 transition-transform"
                />
              </div>
            ))}
            {(data.options || []).length > 3 && (
              <p className="text-[10px] text-rose-600 font-medium px-1">
                ⚠️ WhatsApp en fazla 3 buton destekler!
              </p>
            )}
          </div>
        )}

        {/* Diğer Seçenek Listeleri (multiChoice, listMessage) */}
        {hasOptions && data.type !== 'buttonReply' && (
          <div className="space-y-1 pt-1 border-t border-slate-100">
            {(data.options || []).map((opt: string, idx: number) => (
              <div key={idx} className="relative flex items-center justify-between bg-violet-50/70 border border-violet-100 rounded-lg px-2.5 py-1 text-[11px] text-violet-800 font-medium group">
                <span className="truncate pr-4">{opt}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`opt-${idx}`}
                  className="!w-3 !h-3 !bg-violet-600 !border-2 !border-white shadow-xs group-hover:scale-125 transition-transform"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Genel Çıkış Noktası (Seçeneksizler için) */}
      {!hasOptions && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3.5 !h-3.5 !bg-indigo-500 !border-2 !border-white shadow-sm hover:scale-125 transition-transform"
        />
      )}
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

// ─── Sol Araç Çubuğu ──────────────────────────────────────────────────────────
const TOOL_GROUPS = [
  {
    label: 'Temel Mesajlar',
    color: 'text-blue-700',
    tools: [
      { type: 'textMessage', desc: 'Düz metin yanıtı gönder' },
      { type: 'sendMedia', desc: 'PDF kılavuz veya görsel gönder' },
      { type: 'linkButton', desc: 'Resmi web linki butonu ekle' },
    ],
  },
  {
    label: 'Seçenekli Menüler',
    color: 'text-violet-700',
    tools: [
      { type: 'buttonReply', desc: 'WhatsApp Hızlı Cevap (En Fazla 3 Buton)' },
      { type: 'listMessage', desc: 'Açılır liste menüsü' },
      { type: 'multiChoice', desc: 'Çoklu soru şıkları' },
    ],
  },
  {
    label: 'Etkileşim',
    color: 'text-emerald-700',
    tools: [
      { type: 'askQuestion', desc: 'Öğrenciden bilgi/soru iste' },
    ],
  },
];

function ToolboxSidebar() {
  const onDragStart = (e: DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm select-none z-10">
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/80">
        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Layers size={14} className="text-indigo-600" />
          Blok Kütüphanesi
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Sürükle & Canvas'a Bırak</p>
      </div>

      {/* Başlangıç Bloğu */}
      <div className="px-3 pt-3 pb-1">
        <div
          draggable
          onDragStart={e => onDragStart(e, 'startNode')}
          className="flex items-center gap-2.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl px-3 py-2 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-emerald-400 transition-all select-none"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Play size={14} className="text-emerald-600 fill-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-800">Başlangıç Noktası</p>
            <p className="text-[10px] text-emerald-600">Akış buradan tetiklenir</p>
          </div>
        </div>
      </div>

      {/* Araç Grupları */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3.5">
        {TOOL_GROUPS.map(group => (
          <div key={group.label}>
            <p className={`text-[10px] font-black uppercase tracking-wider ${group.color} mb-1.5 px-1`}>{group.label}</p>
            <div className="space-y-1.5">
              {group.tools.map(tool => {
                const cfg = NODE_CONFIG[tool.type];
                return (
                  <div
                    key={tool.type}
                    draggable
                    onDragStart={e => onDragStart(e, tool.type)}
                    className={`flex items-center gap-2.5 border-2 ${cfg.borderColor} ${cfg.bgColor} rounded-xl px-2.5 py-1.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all select-none`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0 shadow-2xs">
                      {cfg.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${cfg.color} truncate`}>{cfg.label}</p>
                      <p className="text-[9px] text-slate-500 truncate">{tool.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* İpucu */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-2.5 text-[10px] text-indigo-700 leading-relaxed font-medium">
          💡 <strong>İpucu:</strong> Seçenek noktalarını (handle) birbirine bağlayarak konuşma rotaları oluşturabilirsiniz.
        </div>
      </div>
    </div>
  );
}

// ─── Otomatik Ağaç Düzenleme Algoritması ──────────────────────────────────────
function calculateAutoLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return [];

  const startNode = nodes.find(n => (n.data as any).type === 'startNode') || nodes[0];
  const depthMap = new Map<string, number>();
  const visited = new Set<string>();

  const queue: { id: string; depth: number }[] = [{ id: startNode.id, depth: 0 }];
  depthMap.set(startNode.id, 0);
  visited.add(startNode.id);

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const outEdges = edges.filter(e => e.source === id);
    for (const edge of outEdges) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        depthMap.set(edge.target, depth + 1);
        queue.push({ id: edge.target, depth: depth + 1 });
      }
    }
  }

  for (const node of nodes) {
    if (!depthMap.has(node.id)) {
      depthMap.set(node.id, 1);
    }
  }

  const levels = new Map<number, Node[]>();
  for (const node of nodes) {
    const d = depthMap.get(node.id) || 0;
    if (!levels.has(d)) levels.set(d, []);
    levels.get(d)!.push(node);
  }

  return nodes.map(node => {
    const d = depthMap.get(node.id) || 0;
    const levelNodes = levels.get(d) || [];
    const index = levelNodes.findIndex(n => n.id === node.id);

    const x = 120 + d * 360;
    const totalHeight = levelNodes.length * 190;
    const startY = Math.max(40, 360 - totalHeight / 2);
    const y = startY + index * 200;

    return {
      ...node,
      position: { x, y }
    };
  });
}

// ─── Canlı Test Simülatörü Drawer ─────────────────────────────────────────────
interface FlowSimulatorDrawerProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  options?: string[];
  mediaUrl?: string;
  mediaType?: string;
  url?: string;
  buttonText?: string;
  nodeId?: string;
}

function FlowSimulatorDrawer({ nodes, edges, onClose, onFocusNode }: FlowSimulatorDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const startNode = nodes.find(n => (n.data as any).type === 'startNode') || nodes[0];

  const pushNodeMessage = useCallback((node: Node) => {
    const data = node.data as any;
    setCurrentNodeId(node.id);
    onFocusNode(node.id);

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      sender: 'bot',
      text: data.message || (data.type === 'startNode' ? 'Akış Başlatıldı' : ''),
      options: data.options || [],
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      url: data.url,
      buttonText: data.buttonText,
      nodeId: node.id
    };

    setMessages(prev => [...prev, newMsg]);

    // Eğer bu düğümün tek bir çıkış bağlantısı varsa ve seçeneksizse, otomatik bir sonraki düğüme ilerle
    const hasOptions = data.options && data.options.length > 0;
    if (!hasOptions) {
      const outEdge = edges.find(e => e.source === node.id);
      if (outEdge) {
        const nextNode = nodes.find(n => n.id === outEdge.target);
        if (nextNode) {
          setTimeout(() => {
            pushNodeMessage(nextNode);
          }, 600);
        }
      }
    }
  }, [edges, nodes, onFocusNode]);

  // Simülatör açılınca başlangıç düğümünü tetikle
  useEffect(() => {
    if (startNode) {
      setMessages([]);
      pushNodeMessage(startNode);
    }
  }, [startNode, pushNodeMessage]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOptionClick = (optText: string, optIdx: number) => {
    // 1. Kullanıcı mesajını ekle
    setMessages(prev => [
      ...prev,
      { id: `user_${Date.now()}`, sender: 'user', text: optText }
    ]);

    // 2. İlgili kenarı bul
    let targetEdge = edges.find(e => e.source === currentNodeId && e.sourceHandle === `opt-${optIdx}`);
    if (!targetEdge) {
      targetEdge = edges.find(e => e.source === currentNodeId);
    }

    if (targetEdge) {
      const targetNode = nodes.find(n => n.id === targetEdge!.target);
      if (targetNode) {
        setTimeout(() => {
          pushNodeMessage(targetNode);
        }, 300);
        return;
      }
    }

    // Doğrudan kenar yoksa seçenek metniyle arama yap
    const matchedNode = nodes.find(n => {
      const nData = n.data as any;
      return (nData.label && optText.toLowerCase().includes(nData.label.toLowerCase())) ||
             (nData.message && nData.message.toLowerCase().includes(optText.toLowerCase()));
    });

    if (matchedNode) {
      setTimeout(() => {
        pushNodeMessage(matchedNode);
      }, 300);
    } else {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: `bot_err_${Date.now()}`,
            sender: 'bot',
            text: '⚠️ Bu seçenek için akışta bağlı bir sonraki blok bulunamadı.'
          }
        ]);
      }, 300);
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const query = inputText.trim();
    setInputText('');

    setMessages(prev => [
      ...prev,
      { id: `user_${Date.now()}`, sender: 'user', text: query }
    ]);

    // Mevcut düğümün seçeneklerinden biriyle eşleşiyor mu?
    const currentData = nodes.find(n => n.id === currentNodeId)?.data as any;
    if (currentData?.options) {
      const optIdx = currentData.options.findIndex((opt: string) =>
        opt.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(opt.toLowerCase())
      );
      if (optIdx !== -1) {
        handleOptionClick(currentData.options[optIdx], optIdx);
        return;
      }
    }

    // Genel düğümlerde ara
    const matchedNode = nodes.find(n => {
      if (n.id === 'node_ceng_start') return false;
      const nData = n.data as any;
      const lbl = (nData.label || '').toLowerCase();
      const msg = (nData.message || '').toLowerCase();
      const q = query.toLowerCase();
      return lbl.includes(q) || msg.includes(q);
    });

    if (matchedNode) {
      setTimeout(() => {
        pushNodeMessage(matchedNode);
      }, 300);
    } else {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: `bot_err_${Date.now()}`,
            sender: 'bot',
            text: '🤖 Bu kelime için akışta özel bir blok eşleşmedi; gerçek sistemde Gemini RAG devreye girer.'
          }
        ]);
      }, 300);
    }
  };

  return (
    <div className="fixed top-14 right-0 bottom-0 w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 flex flex-col shadow-2xl z-40 animate-in slide-in-from-right-6 text-white">
      {/* Üst Başlık */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between bg-slate-800/80">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-emerald-400" />
          <div>
            <h4 className="text-xs font-bold text-slate-100">Canlı Akış Simülatörü</h4>
            <p className="text-[10px] text-slate-400">Akışı gerçek zamanlı test edin</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (startNode) {
                setMessages([]);
                pushNodeMessage(startNode);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
            title="Simülasyonu Baştan Başlat"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Mesaj Akışı */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/60 text-xs">
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-xs'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-xs'
              }`}
            >
              {m.text && <p className="whitespace-pre-line leading-relaxed">{m.text}</p>}

              {/* Medya / PDF Rozeti */}
              {m.mediaUrl && (
                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-300">
                  <FileText size={16} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold">Resmi PDF Kılavuzu</p>
                    <a
                      href={m.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] underline text-amber-400 truncate block hover:text-amber-200"
                    >
                      Belgeyi İndir / Aç ↗
                    </a>
                  </div>
                </div>
              )}

              {/* URL Butonu */}
              {m.url && (
                <div className="mt-2">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/40 rounded-xl text-[11px] font-bold transition"
                  >
                    <ExternalLink size={13} />
                    <span>{m.buttonText || 'Bağlantıyı Aç'}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Buton Seçenekleri (WhatsApp Hızlı Cevap Tarzı) */}
            {m.options && m.options.length > 0 && (
              <div className="mt-2 space-y-1.5 w-full max-w-[85%]">
                <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                  <Smartphone size={11} className="text-emerald-400" />
                  <span>WhatsApp Hızlı Cevap ({Math.min(m.options.length, 3)}/3 Buton)</span>
                </div>
                {m.options.slice(0, 3).map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(opt, idx)}
                    className="w-full text-center py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-900 font-bold border border-emerald-400 hover:border-emerald-600 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 group cursor-pointer"
                  >
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Canvas Senkronizasyon Rozeti */}
            {m.nodeId && (
              <button
                onClick={() => onFocusNode(m.nodeId!)}
                className="mt-1 text-[9px] text-slate-500 hover:text-indigo-300 transition flex items-center gap-1"
                title="Canvas'ta bu bloğa odaklan"
              >
                <span>Canvas'ta Göster ({m.nodeId})</span>
              </button>
            )}
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Mesaj Girişi */}
      <form onSubmit={handleSendText} className="p-3 border-t border-slate-700 bg-slate-800/90 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Soru yazın veya buton seçin..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button
          type="submit"
          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-sm"
          title="Gönder"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

// ─── Kayıtlı Akış Listesi Modal ───────────────────────────────────────────────
interface FlowListItem {
  id: number;
  name: string;
  is_active: boolean;
  node_count: number;
  edge_count: number;
}

function FlowListModal({
  onClose,
  onLoad,
  token,
  activeFlowId,
  onDeleteSuccess,
}: {
  onClose: () => void;
  onLoad: (id: number) => void;
  token: string;
  activeFlowId?: number | null;
  onDeleteSuccess?: (id: number) => void;
}) {
  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/flows', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setFlows(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const handleDelete = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`"${name}" akışını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;

    try {
      const res = await fetch(`/api/flows/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFlows(prev => prev.filter(f => f.id !== id));
        if (onDeleteSuccess) onDeleteSuccess(id);
      } else {
        alert('Akış silinemedi.');
      }
    } catch {
      alert('Sunucu hatası.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800">Kayıtlı Akışlar ({flows.length})</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Yükleniyor...</div>
          ) : flows.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Layers size={36} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Henüz kayıtlı akış yok.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {flows.map(f => (
                <div
                  key={f.id}
                  onClick={() => { onLoad(f.id); onClose(); }}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition group cursor-pointer ${
                    activeFlowId === f.id
                      ? 'border-indigo-400 bg-indigo-50/70 shadow-2xs'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Zap size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800 truncate">{f.name}</p>
                      {f.is_active && (
                        <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">AKTİF</span>
                      )}
                      {activeFlowId === f.id && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">AÇIK</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{f.node_count} blok · {f.edge_count} bağlantı</p>
                  </div>
                  
                  {/* Sil Butonu */}
                  <button
                    onClick={(e) => handleDelete(e, f.id, f.name)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100 flex-shrink-0"
                    title="Bu akışı tamamen sil"
                  >
                    <Trash2 size={16} />
                  </button>

                  <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── JSON İçe Aktar Modal ─────────────────────────────────────────────────────
function JsonImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (data: { name?: string; nodes: any[]; edges: any[] }) => void;
}) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed.nodes)) {
        setError('Geçersiz format: "nodes" dizisi bulunamadı.');
        return;
      }
      onImport({
        name: parsed.name,
        nodes: parsed.nodes,
        edges: parsed.edges || [],
      });
      onClose();
    } catch (e: any) {
      setError(`JSON ayrıştırma hatası: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Akış JSON İçe Aktar</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600">
            Daha önce dışa aktarılmış veya yedeklenmiş akış JSON metnini buraya yapıştırınız:
          </p>
          <textarea
            rows={10}
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); setError(null); }}
            placeholder='{"nodes": [...], "edges": [...]}'
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            İptal
          </button>
          <button
            onClick={handleApply}
            disabled={!jsonText.trim()}
            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition shadow-sm"
          >
            İçe Aktar ve Uygula
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ana Builder Bileşeni ─────────────────────────────────────────────────────
let nodeIdCounter = 100;
const getNodeId = () => `node_${Date.now()}_${nodeIdCounter++}`;

function FlowBuilderInner() {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('Bilgisayar Mühendisliği Bölüm Asistanı Master Akışı');
  const [triggerKeywords, setTriggerKeywords] = useState('merhaba, selam, menü, başlat, yardım, ceng, bilgisayar mühendisliği, staj, ume, ders, proje, sınav, lab, sekreterlik, çap, yandal, yatay geçiş, dgs, erasmus, farabi, yaz okulu');
  const [flowId, setFlowId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [showFlowList, setShowFlowList] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Arama çubuğu durumu
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const token = localStorage.getItem('token') || '';
  const role  = localStorage.getItem('role')  || '';

  // Auth guard
  useEffect(() => {
    if (!token || role !== 'admin') {
      navigate('/');
    }
  }, [token, role, navigate]);

  // Unsaved changes takibi
  useEffect(() => {
    setHasUnsaved(true);
  }, [nodes, edges, flowName]);

  // Toast helper
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  // Aktif Akışı (Varsa Flow 16) Sayfa Açıldığında Otomatik Yükle
  useEffect(() => {
    if (!token) return;
    fetch('/api/flows', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: FlowListItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const active = data.find(f => f.is_active) || data[0];
          if (active) {
            onLoadFlow(active.id);
          }
        }
      })
      .catch(() => {});
  }, [token]);

  // Klavye kısayolları: Ctrl+S → Kaydet | Delete → Sil
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('flow-save-btn')?.click();
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.key === 'Delete' || e.key === 'Backspace') && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        if (selectedNode) {
          document.getElementById('flow-delete-btn')?.click();
        } else if (selectedEdgeId) {
          setEdges(eds => eds.filter(ed => ed.id !== selectedEdgeId));
          setSelectedEdgeId(null);
          showToast('Bağlantı silindi.', 'info');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedEdgeId, setEdges, showToast]);

  // Bağlantı kurma
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges(eds =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
            style: { stroke: '#6366f1', strokeWidth: 2 },
          },
          eds
        )
      );
      showToast('Bağlantı oluşturuldu.', 'success');
    },
    [setEdges, showToast]
  );

  // Drag & Drop
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (!rfInstance || !wrapperRef.current) return;
      const nodeType = e.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;
      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
      const defaultData: any = { type: nodeType, label: '', message: '', options: [] };
      if (nodeType === 'buttonReply') {
        defaultData.label = 'WhatsApp Cevap Düğümleri';
        defaultData.message = 'Güvenliğiniz için Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında görüşmelerimizin kayıt altına alındığını hatırlatmak isteriz.\n\nOnaylıyor musunuz?';
        defaultData.options = ['ONAYLIYORUM ✅', 'ONAYLAMIYORUM ❌'];
      } else if (['multiChoice', 'listMessage'].includes(nodeType)) {
        defaultData.options = ['Seçenek 1', 'Seçenek 2'];
      }
      const newNode: Node = { id: getNodeId(), type: 'custom', position, data: defaultData };
      setNodes(nds => [...nds, newNode]);
      setSelectedNode(newNode);
    },
    [rfInstance, setNodes]
  );

  // Node seçim
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setSelectedEdgeId(null);
  }, []);

  // Edge seçim
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNode(null);
  }, []);

  // Canvas tıkla → seçimi temizle
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdgeId(null);
    setShowSearchResults(false);
  }, []);

  // Node güncelleme
  const onUpdateNode = useCallback(
    (id: string, data: any) => {
      setNodes(nds => nds.map(n => (n.id === id ? { ...n, data } : n)));
      setSelectedNode(prev => (prev?.id === id ? { ...prev, data } : prev));
    },
    [setNodes]
  );

  // Node çoğaltma (Klonla)
  const onDuplicateNode = useCallback(
    (node: Node) => {
      const newNode: Node = {
        id: getNodeId(),
        type: node.type || 'custom',
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        data: JSON.parse(JSON.stringify(node.data)),
      };
      setNodes(nds => [...nds, newNode]);
      setSelectedNode(newNode);
      showToast('Blok çoğaltıldı ✨', 'success');
    },
    [setNodes, showToast]
  );

  // Seçili node sil
  const onDeleteSelected = useCallback(() => {
    if (!selectedNode) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    showToast('Blok silindi.', 'info');
  }, [selectedNode, setNodes, setEdges, showToast]);

  // Otomatik Düzenle (Auto Layout)
  const handleAutoLayout = useCallback(() => {
    const organized = calculateAutoLayout(nodes, edges);
    setNodes(organized);
    setTimeout(() => {
      rfInstance?.fitView({ padding: 0.15, duration: 600 });
    }, 50);
    showToast('Tüm bloklar otomatik olarak hiyerarşik düzene hizalandı ✨', 'success');
  }, [nodes, edges, setNodes, rfInstance, showToast]);

  // Belirli bir bloğa odaklan (Simülatörden veya Aramadan)
  const handleFocusNode = useCallback((nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId);
    if (target && rfInstance) {
      rfInstance.setCenter(target.position.x + 120, target.position.y + 70, { zoom: 1.15, duration: 700 });
      setSelectedNode(target);
    }
  }, [nodes, rfInstance]);

  // Kaydet
  const onSave = async () => {
    if (nodes.length === 0) {
      showToast('Canvas boş — önce blok ekleyin!', 'error');
      return;
    }
    setIsSaving(true);
    setSaveStatus('idle');
    const payload = {
      name: flowName,
      description: triggerKeywords,
      nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
    };
    try {
      let res: Response;
      if (flowId) {
        res = await fetch(`/api/flows/${flowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const d = await res.json();
          setFlowId(d.id);
        }
      }
      if (res.ok) {
        setSaveStatus('saved');
        setHasUnsaved(false);
        showToast(`"${flowName}" akışı (${nodes.length} blok) başarıyla kaydedildi ✓`, 'success');
      } else {
        setSaveStatus('error');
        showToast('Kaydetme başarısız. Oturum sürenizi kontrol edin.', 'error');
      }
    } catch {
      setSaveStatus('error');
      showToast('Sunucu bağlantı hatası.', 'error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Akış yükle
  const onLoadFlow = async (id: number) => {
    const res = await fetch(`/api/flows/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { showToast('Akış yüklenemedi.', 'error'); return; }
    const data = await res.json();
    setFlowId(data.id);
    setFlowName(data.name);
    setTriggerKeywords(data.description || '');
    setNodes(data.nodes || []);
    setEdges(
      (data.edges || []).map((e: any) => ({
        ...e,
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        style: { stroke: '#6366f1', strokeWidth: 2 },
      }))
    );
    setSelectedNode(null);
    setHasUnsaved(false);
    showToast(`"${data.name}" akışı yüklendi (${(data.nodes || []).length} blok).`, 'success');
    setTimeout(() => {
      rfInstance?.fitView({ padding: 0.15, duration: 600 });
    }, 100);
  };

  // Yayınla
  const onActivate = async () => {
    if (!flowId) { showToast('Önce akışı kaydedin!', 'error'); return; }
    if (hasUnsaved) { showToast('Yayınlamadan önce kaydedin!', 'error'); return; }
    const res = await fetch(`/api/flows/${flowId}/activate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) showToast(`"${flowName}" öğrenci ve WhatsApp arayüzünde aktif! ✅`, 'success');
    else showToast('Yayınlama başarısız.', 'error');
  };

  // Arama filtreleme
  const searchResults = searchQuery.trim()
    ? nodes.filter(n => {
        const d = n.data as any;
        const q = searchQuery.toLowerCase();
        return (
          n.id.toLowerCase().includes(q) ||
          (d.label && d.label.toLowerCase().includes(q)) ||
          (d.message && d.message.toLowerCase().includes(q)) ||
          (d.options && d.options.some((o: string) => o.toLowerCase().includes(q)))
        );
      })
    : [];

  // JSON payload önizlemesi
  const jsonPreview = JSON.stringify(
    {
      name: flowName,
      description: triggerKeywords,
      nodes: nodes.map(n => ({ id: n.id, type: (n.data as any).type, position: n.position, data: n.data })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
    },
    null,
    2
  );

  return (
    <div className="flex flex-col h-screen bg-slate-100" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Toast Bildirimleri ── */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-right-5 transition-all ${
          toastMsg.type === 'success' ? 'bg-emerald-600 text-white' :
          toastMsg.type === 'error'   ? 'bg-rose-600 text-white'  :
          'bg-slate-900 text-white'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle size={16} /> : toastMsg.type === 'error' ? <X size={16} /> : <Zap size={16} />}
          {toastMsg.text}
        </div>
      )}

      {/* ── JSON Önizleme Modal ── */}
      {showJsonPreview && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Akışın JSON Çıktısı</span>
              <button onClick={() => setShowJsonPreview(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition">
                <X size={16} />
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-5 text-xs text-emerald-400 font-mono leading-relaxed">
              {jsonPreview}
            </pre>
            <div className="px-5 py-3 border-t border-slate-700 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{nodes.length} blok · {edges.length} bağlantı</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonPreview);
                  showToast('JSON panoya kopyalandı!', 'success');
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Copy size={13} /> Kopyala
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── JSON İçe Aktar Modal ── */}
      {showJsonImport && (
        <JsonImportModal
          onClose={() => setShowJsonImport(false)}
          onImport={(imported) => {
            if (imported.name) setFlowName(imported.name);
            setNodes(imported.nodes.map(n => ({ ...n, type: 'custom' })));
            setEdges(
              imported.edges.map(e => ({
                ...e,
                type: 'smoothstep',
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
                style: { stroke: '#6366f1', strokeWidth: 2 },
              }))
            );
            setTimeout(() => rfInstance?.fitView({ padding: 0.15, duration: 600 }), 100);
            showToast('Akış başarıyla içe aktarıldı!', 'success');
          }}
        />
      )}

      {/* ── Üst Araç Çubuğu ── */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center gap-2.5 px-4 shadow-sm flex-shrink-0 z-20">
        <button
          onClick={() => {
            if (hasUnsaved && nodes.length > 0 && !window.confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?')) return;
            navigate('/admin');
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
        >
          <ArrowLeft size={14} /> Admin Panel
        </button>

        <div className="h-6 w-px bg-slate-200" />

        {/* Akış Başlığı */}
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-indigo-600" />
          <input
            type="text"
            value={flowName}
            onChange={e => setFlowName(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-indigo-400 outline-none px-1 py-0.5 min-w-[200px] max-w-[280px] truncate transition"
            placeholder="Akış başlığı..."
            title="Akış Adı"
          />
          {flowId && <span className="text-[10px] text-slate-400 font-mono">#{flowId}</span>}
          {hasUnsaved && nodes.length > 0 && (
            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">● Değişiklik Var</span>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* Düğüm Arama Çubuğu */}
        <div className="relative">
          <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-indigo-300 transition">
            <Search size={13} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Bloklarda ara (staj, çap, vize...)"
              className="text-xs text-slate-700 bg-transparent outline-none w-44 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Arama Sonuçları Açılır Menüsü */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-10 left-0 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-72 overflow-y-auto p-1.5 space-y-1 z-50 animate-in fade-in-50">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {searchResults.length} Blok Bulundu
              </div>
              {searchResults.map(n => {
                const d = n.data as any;
                const cfg = NODE_CONFIG[d.type] || NODE_CONFIG.textMessage;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      handleFocusNode(n.id);
                      setShowSearchResults(false);
                    }}
                    className="p-2 rounded-lg hover:bg-indigo-50/80 cursor-pointer transition flex items-start gap-2 border border-transparent hover:border-indigo-100"
                  >
                    <div className="p-1 rounded-md bg-white shadow-2xs mt-0.5">{cfg.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{d.label || cfg.label}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{d.message || n.id}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sayaçlar */}
        <div className="text-[11px] text-slate-400 font-medium hidden xl:flex items-center gap-2 ml-1">
          <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-semibold text-slate-600">{nodes.length} blok</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-semibold text-slate-600">{edges.length} bağ</span>
        </div>

        {/* Sağ Butonlar */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Otomatik Düzenle */}
          <button
            onClick={handleAutoLayout}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition border border-indigo-200"
            title="Blokları otomatik olarak hizala ve düzenle"
          >
            <LayoutGrid size={14} /> Otomatik Düzenle
          </button>

          {/* Canlı Test Simülatörü */}
          <button
            onClick={() => setShowSimulator(prev => !prev)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition border ${
              showSimulator
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
            }`}
            title="Akışı interaktif bir cep telefonu / sohbet kutusunda canlı test edin"
          >
            <Smartphone size={14} /> {showSimulator ? 'Simülatör Açık' : 'Test Et'}
          </button>

          {/* JSON İçe/Dışa */}
          <button
            onClick={() => setShowJsonImport(true)}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition border border-slate-200"
            title="JSON İçe Aktar"
          >
            <Upload size={13} />
          </button>
          <button
            onClick={() => setShowJsonPreview(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition border border-slate-200"
            title="Akışın JSON çıktısını görüntüle"
          >
            <Eye size={13} /> JSON
          </button>

          {/* Akış Yükle */}
          <button
            onClick={() => setShowFlowList(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition border border-slate-200"
          >
            <Layers size={14} /> Akışlar
          </button>

          {/* Seçili öğe sil */}
          {(selectedNode || selectedEdgeId) && (
            <button
              id="flow-delete-btn"
              onClick={selectedNode ? onDeleteSelected : () => {
                setEdges(eds => eds.filter(e => e.id !== selectedEdgeId));
                setSelectedEdgeId(null);
                showToast('Bağlantı silindi.', 'info');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition border border-rose-200"
              title="Sil (Delete)"
            >
              <Trash2 size={14} /> {selectedNode ? 'Bloğu Sil' : 'Bağlantıyı Sil'}
            </button>
          )}

          {/* Yayınla */}
          <button
            onClick={onActivate}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition border border-emerald-300"
            title="Bu akışı öğrenci ve WhatsApp arayüzünde aktif hale getir"
          >
            <CheckCircle size={14} /> Yayınla
          </button>

          {/* Kaydet */}
          <button
            id="flow-save-btn"
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 text-xs font-bold text-white px-4 py-1.5 rounded-lg transition shadow-sm disabled:opacity-60 ${
              saveStatus === 'saved' ? 'bg-emerald-600' : saveStatus === 'error' ? 'bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            title="Kaydet (Ctrl+S)"
          >
            {isSaving ? (
              <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle size={14} />
            ) : (
              <Save size={14} />
            )}
            {isSaving ? 'Kaydediliyor...' : saveStatus === 'saved' ? 'Kaydedildi!' : saveStatus === 'error' ? 'Hata!' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* ── Ana Çalışma Alanı ── */}
      <div className="flex flex-1 overflow-hidden relative">
        <ToolboxSidebar />

        {/* Canvas */}
        <div ref={wrapperRef} className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            className="bg-slate-50"
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
              style: { stroke: '#6366f1', strokeWidth: 2 },
            }}
          >
            <Controls className="!rounded-xl !border !border-slate-200 !shadow-md !overflow-hidden" />
            <MiniMap className="!rounded-xl !border !border-slate-200 !shadow-md !overflow-hidden" />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />

            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mt-20 bg-white border-2 border-dashed border-indigo-300 rounded-2xl px-10 py-12 text-center shadow-sm max-w-sm">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                    <Plus size={24} className="text-indigo-500" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">Akış Tasarımına Başla</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sol menüden bir blok sürükleyip bu alana bırak.<br />
                    Önce <strong className="text-emerald-600">Başlangıç Noktası</strong> ile başla.
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Sağ Düzenleme Paneli */}
        {selectedNode && (
          <NodeEditPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={onUpdateNode}
            onDuplicate={onDuplicateNode}
            onDelete={onDeleteSelected}
          />
        )}

        {/* Canlı Test Simülatörü Drawer */}
        {showSimulator && (
          <FlowSimulatorDrawer
            nodes={nodes}
            edges={edges}
            onClose={() => setShowSimulator(false)}
            onFocusNode={handleFocusNode}
          />
        )}
      </div>

      {/* ── Kayıtlı Akışlar Modal ── */}
      {showFlowList && (
        <FlowListModal
          token={token}
          onClose={() => setShowFlowList(false)}
          onLoad={onLoadFlow}
          activeFlowId={flowId}
          onDeleteSuccess={(id) => {
            if (flowId === id) {
              setFlowId(null);
              setFlowName('Yeni Akış');
              setTriggerKeywords('');
              setNodes([]);
              setEdges([]);
              showToast('Aktif akış silindi.', 'info');
            } else {
              showToast('Akış listeden silindi.', 'success');
            }
          }}
        />
      )}
    </div>
  );
}

export default function FlowBuilder() {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner />
    </ReactFlowProvider>
  );
}
