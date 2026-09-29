import sys
import os
import re
from fastapi import FastAPI, Depends, File, UploadFile, HTTPException, Security, Form, Response, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from app.rag import rag_engine
import app.models as models
from app.database import engine, get_db, SessionLocal
from app.auth import (
    router as auth_router, 
    get_password_hash, 
    get_current_user, 
    get_current_admin,
    security_scheme,
    SECRET_KEY,
    ALGORITHM
)
import jwt
from datetime import datetime

# Root dizini sys.path'e ekle (ingest.py erişimi için)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from ingest import ingest_data, ingest_file
except ImportError:
    ingest_data = lambda force_rebuild=True: None
    ingest_file = lambda filepath: False

def run_background_reindex():
    try:
        print("\n[Background Worker] Vektör veritabanı tam indeksleme başlatıldı...", flush=True)
        ingest_data(force_rebuild=True)
        rag_engine.__init__()
        print("[Background Worker] Vektör veritabanı indeksleme başarıyla tamamlandı!\n", flush=True)
    except Exception as e:
        print(f"\n[Background Worker Hatası]: {e}\n", flush=True)

# Uygulama baslarken PostgreSQL tablolarini otomatik olustur
models.Base.metadata.create_all(bind=engine)

from app.tunnel import (
    is_cloudflared_running,
    detect_active_tunnel_url,
    start_cloudflared_tunnel,
    stop_cloudflared_tunnel
)

def update_backend_env(updates: dict):
    """backend/.env dosyasini gunceller ve kalici hale getirir."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if not os.path.exists(env_path):
        env_path = os.path.join(os.getcwd(), ".env")
    if not os.path.exists(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        existing_keys = set()
        new_lines = []
        for line in lines:
            trimmed = line.strip()
            if "=" in trimmed and not trimmed.startswith("#"):
                k, _ = trimmed.split("=", 1)
                k = k.strip()
                existing_keys.add(k)
                if k in updates and updates[k] is not None:
                    new_lines.append(f"{k}={updates[k]}\n")
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)
        
        for k, v in updates.items():
            if k not in existing_keys and v is not None:
                new_lines.append(f"{k}={v}\n")
                
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    except Exception as e:
        print(f"[ENV Guncelleme Uyarisi]: {e}", flush=True)

def get_meta_wa_settings(db: Session = None):
    """PostgreSQL SystemSetting tablosundan veya .env'den WhatsApp Meta ayarlarini ceker."""
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    try:
        record = db.query(models.SystemSetting).filter(models.SystemSetting.key == "whatsapp_meta_settings").first()
        val = record.value if (record and isinstance(record.value, dict)) else {}
        return {
            "webhook_url": val.get("webhook_url") or "",
            "verify_token": val.get("verify_token") or os.getenv("META_WA_VERIFY_TOKEN", "whatsapp_bot_verify_token_2026"),
            "phone_id": val.get("phone_id") or os.getenv("META_WA_PHONE_ID", ""),
            "access_token": val.get("access_token") or os.getenv("META_WA_TOKEN", ""),
            "app_id": val.get("app_id") or os.getenv("META_APP_ID", ""),
            "app_secret": val.get("app_secret") or os.getenv("META_APP_SECRET", "")
        }
    finally:
        if should_close:
            db.close()

def seed_initial_data():
    """Flat JSON dosyalarındaki ayarları ve verileri PostgreSQL veritabanına otomatik aktarır."""
    import json
    db = SessionLocal()
    try:
        # 1. Bot Ayarları
        bot_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "bot_settings").first()
        if not bot_setting:
            default_settings = {
                "bot_name": "Bilgisayar Mühendisliği Asistanı",
                "department_name": "Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü",
                "bot_tone": "resmi",
                "welcome_message": "Merhaba! Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü resmi asistanına hoş geldiniz. 💻 CENG dersleri, yazılım/donanım stajı, bitirme projeleri ve bölüm idari süreçleri hakkında size nasıl yardımcı olabilirim?",
                "whatsapp_number": "15551662647"
            }
            if os.path.exists("data/settings.json"):
                try:
                    with open("data/settings.json", "r", encoding="utf-8") as f:
                        default_settings.update(json.load(f))
                except Exception:
                    pass
            db.add(models.SystemSetting(key="bot_settings", value=default_settings))
            db.commit()

        # 2. Guardrails (Kara Liste & Filtre)
        guardrail_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "guardrails").first()
        if not guardrail_setting:
            default_guardrails = {
                "banned_keywords": ["küfür", "hakaret", "kumar", "siyaset", "parti", "bahis"],
                "rejection_message": "Bu platform yalnızca fakülte akademik ve idari işlemlerine hizmet vermektedir. Lütfen fakülteyle ilgili bir soru sorunuz."
            }
            if os.path.exists("data/guardrails.json"):
                try:
                    with open("data/guardrails.json", "r", encoding="utf-8") as f:
                        default_guardrails.update(json.load(f))
                except Exception:
                    pass
            db.add(models.SystemSetting(key="guardrails", value=default_guardrails))
            db.commit()

        # 3. SSS (FAQs)
        faq_count = db.query(models.FAQItem).count()
        if faq_count == 0:
            default_faqs = [
                {"topic": "CENG Staj Koşulları ve Süresi", "category": "CENG Stajı", "order": 1},
                {"topic": "Programlama & Müfredat Dersleri", "category": "CENG Dersleri", "order": 2},
                {"topic": "Bitirme Projesi (CENG401/402)", "category": "Bitirme Projesi", "order": 3},
                {"topic": "Bilgisayar Mühendisliği Laboratuvarları", "category": "Laboratuvarlar", "order": 4},
                {"topic": "AGNO 1.80 Barajı & Mezuniyet", "category": "Sınav & AGNO", "order": 5},
                {"topic": "Bölüm Sekreterliği & İletişim", "category": "İletişim", "order": 6}
            ]
            if os.path.exists("data/faqs.json"):
                try:
                    with open("data/faqs.json", "r", encoding="utf-8") as f:
                        file_faqs = json.load(f).get("faqs", [])
                        if file_faqs:
                            default_faqs = [
                                {"topic": item.get("topic", "").strip(), "category": item.get("category", "Genel"), "order": idx}
                                for idx, item in enumerate(file_faqs, 1)
                            ]
                except Exception:
                    pass
            for f_item in default_faqs:
                db.add(models.FAQItem(**f_item))
            db.commit()

        # 4. Duyuru Geçmişi
        ann_count = db.query(models.Announcement).count()
        if ann_count == 0 and os.path.exists("data/announcement.json"):
            try:
                with open("data/announcement.json", "r", encoding="utf-8") as f:
                    ann_data = json.load(f)
                    for item in ann_data.get("history", []):
                        db.add(models.Announcement(
                            text=item.get("text", ""),
                            is_active=bool(item.get("is_active", True)),
                            starts_at=item.get("starts_at"),
                            expires_at=item.get("expires_at")
                        ))
                    db.commit()
            except Exception:
                pass

        # 5. WhatsApp Meta Ayarlari
        wa_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "whatsapp_meta_settings").first()
        if not wa_setting:
            detected_tunnel = detect_active_tunnel_url()
            default_webhook = f"{detected_tunnel}/webhook/whatsapp/meta" if detected_tunnel else "https://don-pierce-rare-swim.trycloudflare.com/webhook/whatsapp/meta"
            default_wa = {
                "webhook_url": default_webhook,
                "verify_token": os.getenv("META_WA_VERIFY_TOKEN", "adiyaman_muhendislik_2026"),
                "phone_id": os.getenv("META_WA_PHONE_ID", "1278607355343552"),
                "access_token": os.getenv("META_WA_TOKEN", ""),
                "app_id": os.getenv("META_APP_ID", ""),
                "app_secret": os.getenv("META_APP_SECRET", "")
            }
            db.add(models.SystemSetting(key="whatsapp_meta_settings", value=default_wa))
            db.commit()
    except Exception as e:
        print(f"[Seed Hatasi]: {e}", flush=True)
    finally:
        db.close()

seed_initial_data()

app = FastAPI(
    title="Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölüm Asistanı API",
    description="Bilgisayar Mühendisliği Bölümü öğrencileri için RAG altyapılı yapay zeka ve akış asistanı",
    version="1.0.0",
)

app.include_router(auth_router)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
allowed_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageHistory(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    username: str
    category: Optional[str] = None
    session_id: Optional[str] = None
    message: str
    history: Optional[List[MessageHistory]] = []

class ChatResponse(BaseModel):
    text: str
    options: Optional[List[str]] = None

@app.get("/")
async def root():
    return {"message": "API çalışıyor."}

def get_flow_options(node: dict, nodes: list, edges: list) -> list:
    """Belirli bir node'dan sonraki buton seçeneklerini bulur."""
    data = node.get("data", {})
    if data.get("type") in ["buttonReply", "multiChoice", "listMessage"]:
        return data.get("options", [])
    out_edge = next((e for e in edges if e.get("source") == node.get("id")), None)
    if out_edge:
        next_node = next((n for n in nodes if n.get("id") == out_edge.get("target")), None)
        if next_node:
            return get_flow_options(next_node, nodes, edges)
    return []

def extract_node_content(node: dict, nodes: list, edges: list) -> dict:
    """Node nesnesinden dönülecek metin ve buton seçeneklerini üretir."""
    data = node.get("data", {})
    ntype = data.get("type")
    
    text = ""
    if ntype == "textMessage":
        text = data.get("message") or "Mesaj içeriği yok."
    elif ntype in ["buttonReply", "multiChoice", "listMessage"]:
        text = data.get("message") or "Lütfen bir seçenek seçin:"
    elif ntype == "sendMedia":
        caption = data.get("caption") or data.get("message", "")
        url = data.get("mediaUrl") or data.get("url", "")
        mtype = data.get("mediaType", "pdf").lower()
        parts = []
        if caption:
            parts.append(caption)
        if url:
            parts.append(f"📄 *Resmi İndirme Bağlantısı / PDF Belgesi:*\n{url}")
        text = "\n\n".join(parts) if parts else f"📄 Belge Gönderildi ({mtype.upper()})"
    elif ntype == "linkButton":
        msg = data.get("message", "")
        btn = data.get("buttonText", "Resmi Sayfayı İncele")
        url = data.get("url", "")
        text = f"{msg}\n\n🔗 *{btn}:*\n{url}".strip() if msg else f"🔗 *{btn}:*\n{url}"
    elif ntype == "askQuestion":
        text = data.get("message") or "Lütfen cevabınızı yazın:"
    elif ntype == "startNode":
        text = data.get("message") or "Akış başlatıldı."
    else:
        text = data.get("message") or "Yanıt"
        
    options = get_flow_options(node, nodes, edges)
    return {
        "text": text,
        "options": options,
        "media_url": data.get("mediaUrl") or data.get("url", ""),
        "media_type": data.get("mediaType", "")
    }

def normalize_tr(text: str) -> str:
    if not text:
        return ""
    tr_map = str.maketrans("çğıöşüiÇĞİÖŞÜI", "cgiosuicgiosui")
    t = text.translate(tr_map).lower()
    return re.sub(r'[-_/.,!?():;*#]+', ' ', t).strip()

def is_option_matched(opt_str: str, query: str) -> bool:
    o_norm = normalize_tr(opt_str)
    q_norm = normalize_tr(query)
    
    if not o_norm or not q_norm:
        return False
        
    # Tam eşleşme
    if o_norm == q_norm:
        return True

    # Seçenek metni kullanıcının sorgusu içinde tam bir ifade/kelime öbeği olarak geçiyorsa
    # Örn: Kullanıcı "1. ve 2. sınıf dersleri hakkında bilgi" yazdıysa ve seçenek "1. ve 2. sınıf dersleri" ise
    if o_norm in q_norm and len(o_norm) >= 6:
        return True

    # Buton veya liste tıklandığında gelen metin seçeneğin kırpılmış/kısaltılmış hali olabilir
    # Örn: Seçenek "Bitirme Projesi Şartları", Buton başlığı "Bitirme Projesi"
    if q_norm in o_norm and len(q_norm) >= 4:
        return True

    # Kullanıcı seçeneğin kendisini yazdıysa (veya ufak harf hatası yaptıysa) kelime örtüşmesine bak:
    o_words = [w for w in o_norm.split() if len(w) >= 3]
    q_words = [w for w in q_norm.split() if len(w) >= 3]
    if o_words and q_words:
        common = set(o_words).intersection(set(q_words))
        # Eğer örtüşen kelime sayısı seçeneğin anlamlı kısmını kapsıyorsa
        if len(common) >= 2 and (len(common) / len(o_words) >= 0.50):
            return True
        if len(o_words) == 1 and len(q_words) == 1 and o_words[0] == q_words[0]:
            return True
            
    return False

def check_is_unanswered(answer_text: str) -> bool:
    """
    Yapay zekanın öğrenciye verdiği cevabın bir 'bilgi yokluğu / cevapsızlık'
    içerip içermediğini gelişmiş Türkçe normalizasyonuyla tespit eder.
    """
    if not answer_text:
        return True
        
    t = normalize_tr(answer_text)
    
    unanswered_phrases = [
        "bilgi bulunmuyor",
        "bilgi bulunmamaktadir",
        "bilgi yer almiyor",
        "bilgiye sahip degilim",
        "bilgim yok",
        "bilmiyorum",
        "kesin bir bilgi",
        "net bir bilgi",
        "veritabaninda bilgi",
        "veritabanimda",
        "sistemimde kesin",
        "eslesme bulamadim",
        "bu konuda bilgim",
        "yanlis yonlendirmemek adina",
        "danisman hocana danismani",
        "danisman hocana sormani",
        "bolum sekreterligine danismani",
        "bolum sekreterligine sormani",
        "akademik takvimi incelemeni",
        "kapsamim disindadir",
        "yardimci olamam",
        "cevap veremiyorum",
        "bu konuda bir bilgi"
    ]
    
    return any(phrase in t for phrase in unanswered_phrases)

def match_active_flow(query: str, db: Session) -> Optional[dict]:
    """
    Veritabanındaki aktif akışları sorgular.
    1. Aşama: Kullanıcının mesajı herhangi bir aktif düğümün (örn: Cevap Düğmeleri) seçeneğiyle eşleşiyorsa,
       ilgili kenarı (edge) takip eder ve hedef düğümün yanıtını döner.
    2. Aşama: Kullanıcının mesajı bir akışın adı veya tetikleyici kelimeleriyle eşleşiyorsa, akışı başlangıç düğümünden başlatır.
    """
    active_flows = db.query(models.ChatFlow).filter(models.ChatFlow.is_active == True).all()
    q_lower = query.strip().lower()

    if not q_lower:
        return None

    # FAZ 1: Buton / Seçenek Eşleşmesi (Node Traversal)
    for flow in active_flows:
        nodes = flow.nodes or []
        edges = flow.edges or []
        
        for node in nodes:
            data = node.get("data", {})
            options = data.get("options", [])
            if not isinstance(options, list):
                continue
                
            for opt_idx, opt in enumerate(options):
                opt_str = str(opt).strip()
                if not opt_str:
                    continue
                
                # Seçenek metni ile kullanıcı girdisi esleşiyor mu?
                if is_option_matched(opt_str, query):
                    # ReactFlow option handle formatı: "opt-{opt_idx}"
                    target_edge = next(
                        (e for e in edges if e.get("source") == node.get("id") and e.get("sourceHandle") == f"opt-{opt_idx}"),
                        None
                    )
                    if not target_edge:
                        target_edge = next((e for e in edges if e.get("source") == node.get("id")), None)

                    if target_edge:
                        target_node_id = target_edge.get("target")
                        target_node = next((n for n in nodes if n.get("id") == target_node_id), None)
                        if target_node:
                            res = extract_node_content(target_node, nodes, edges)
                            return {
                                **res,
                                "category": flow.name,
                                "flow_id": flow.id,
                                "node_id": target_node.get("id")
                            }

    # FAZ 2: Akış Başlangıç / Tetikleyici Eşleşmesi
    for flow in active_flows:
        nodes = flow.nodes or []
        edges = flow.edges or []

        triggers = []
        if flow.description:
            triggers.extend([t.strip().lower() for t in flow.description.replace("\n", ",").split(",") if t.strip()])
        
        if flow.name and flow.name.strip().lower() not in ["yeni akış", "yeni akis", "flow"]:
            triggers.append(flow.name.strip().lower())

        start_node_for_trigger = next((n for n in nodes if n.get("data", {}).get("type") == "startNode"), None)
        if start_node_for_trigger:
            s_msg = start_node_for_trigger.get("data", {}).get("message", "").strip().lower()
            if s_msg and len(s_msg) >= 3 and s_msg not in ["merhaba", "selam"]:
                triggers.append(s_msg)

        matched = any(tr in q_lower or q_lower in tr for tr in triggers if len(tr) >= 2)

        if matched and nodes:
            # 1. Kullanıcı sorgusundaki anlamlı anahtar kelimeleri çıkar
            stop_words = {"hakkinda", "hakkında", "bilgi", "ver", "nedir", "nasil", "nasıl", "alabilirim", "istiyorum", "nelerdir", "bölüm", "bolum", "muhendisligi", "mühendisliği", "icin", "için"}
            q_norm = normalize_tr(q_lower)
            query_keywords = [w for w in q_norm.split() if len(w) >= 3 and w not in stop_words]

            best_node = None
            best_score = 0

            # Sadece selamlama / menü sorgusu ise doğrudan ana menüye veya startNode'a git
            is_greeting = any(w in q_norm for w in ["merhaba", "selam", "gunaydin", "iyi gunler", "menu", "menü", "basla", "yardim"])
            
            if not is_greeting and query_keywords:
                for node in nodes:
                    n_id = normalize_tr(str(node.get("id", "")))
                    n_label = normalize_tr(str(node.get("data", {}).get("label", "")))
                    n_msg = normalize_tr(str(node.get("data", {}).get("message", "")))
                    
                    # startNode giriş karşılama düğümüdür; konuya özel aramalarda tercih edilmez
                    if node.get("id") in ["node_ceng_start", "node_root_start"]:
                        continue

                    score = 0

                    # 1. Tam Cümlecik / İfade Eşleşmesi
                    if len(q_norm) >= 5:
                        if q_norm in n_label:
                            score += 25
                        elif q_norm in n_msg:
                            score += 15

                    # 2. Seçeneklerde / Başlıklarda Doğrudan İfade Eşleşmesi
                    for opt in node.get("data", {}).get("options", []):
                        opt_norm = normalize_tr(str(opt))
                        if len(opt_norm) >= 4 and (opt_norm in q_norm or q_norm in opt_norm):
                            score += 18
                        common_words = set(q_norm.split()) & set(opt_norm.split())
                        if len(common_words) >= 2:
                            score += 8 * len(common_words)

                    # 3. Anlamlı Kelime ve Kök Eşleşmesi
                    for kw in query_keywords:
                        kw_stem = kw[:4] if len(kw) >= 4 else kw
                        if kw_stem in n_id:
                            score += 4
                        if kw in n_label:
                            score += 6
                        elif kw_stem in n_label:
                            score += 3
                        if kw in n_msg:
                            score += 2
                    
                    # Eğer düğüm seçenekli bir alt menü ise öncelik ver
                    if node.get("data", {}).get("options"):
                        score += 2

                    if score > best_score:
                        best_score = score
                        best_node = node

            # Eğer konuya özel bir alt menü/düğüm bulunduysa onu hedefle
            if best_node and best_score >= 3:
                target_node = best_node
            else:
                # Selamlama veya genel arama: Ana menü düğümünü bul
                main_menu_node = next((n for n in nodes if n.get("id") in ["node_ceng_main_menu", "node_root_menu"]), None)
                if not main_menu_node and start_node_for_trigger:
                    out_edge = next((e for e in edges if e.get("source") == start_node_for_trigger.get("id")), None)
                    if out_edge:
                        main_menu_node = next((n for n in nodes if n.get("id") == out_edge.get("target")), None)
                target_node = main_menu_node or start_node_for_trigger or nodes[0]

            res = extract_node_content(target_node, nodes, edges)
            return {
                **res,
                "category": flow.name,
                "flow_id": flow.id,
                "start_node_id": target_node.get("id")
            }

    return None

@app.post("/chat")
@app.post("/api/chat")
async def chat_endpoint(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # 1. Önce Veritabanındaki Aktif Akışları (Senaryoları) Kontrol Et
    flow_match = match_active_flow(req.message, db)
    
    if flow_match:
        source_label = f"⚡ Görsel Akış Diyagramı ({flow_match.get('category', 'Akış')})"
        response_data = {
            "text": flow_match["text"],
            "options": flow_match["options"],
            "source": source_label
        }
        detected_category = flow_match.get("category", "Akış")
        is_unanswered = False
    else:
        # 2. Akış eşleşmezse Gemini + RAG (Vektör Bilgi Bankası) devreye girer
        history_dicts = [{"role": h.role, "content": h.content} for h in req.history] if req.history else []
        if not history_dicts and req.session_id:
            recent_logs = db.query(models.MessageLog).filter(
                models.MessageLog.session_id == req.session_id
            ).order_by(models.MessageLog.created_at.desc()).limit(3).all()
            for l in reversed(recent_logs):
                history_dicts.append({"role": "user", "content": l.question})
                history_dicts.append({"role": "assistant", "content": l.answer})

        response_data = rag_engine.get_response(req.message, history=history_dicts)
        response_data["source"] = "🤖 Yapay Zeka (RAG)"
        
        # "Bilmiyorum / bilgi bulunmuyor" cevaplarını gelişmiş normalizasyonla tespit et
        is_unanswered = response_data.get("is_unanswered", False) or check_is_unanswered(response_data.get("text", ""))
        detected_category = response_data.get("category") or req.category or "Genel"

    username_to_use = req.username or (current_user.get("sub") if isinstance(current_user, dict) else None) or "anonim_ogrenci"
    user = db.query(models.User).filter(models.User.username == username_to_use).first()
    if not user:
        user = models.User(
            username=username_to_use,
            password_hash=get_password_hash("ogrenci123"),
            role="student"
        )
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            user = db.query(models.User).filter(models.User.username == username_to_use).first()

    user_id = user.id if user else None
    new_log = models.MessageLog(
        user_id=user_id,
        session_id=req.session_id,
        category=detected_category,
        question=req.message,
        answer=response_data["text"],
        is_unanswered=is_unanswered
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    message_id = new_log.id

    return {**response_data, "message_id": message_id}


from sqlalchemy import func

@app.get("/api/analytics", dependencies=[Depends(get_current_admin)])
async def get_analytics(db: Session = Depends(get_db)):
    total_students = db.query(models.User).filter(models.User.role == "student").count()
    total_questions = db.query(models.MessageLog).count()
    
    # Memnuniyet Metrikleri
    positive_ratings = db.query(models.MessageLog).filter(models.MessageLog.rating == 1).count()
    negative_ratings = db.query(models.MessageLog).filter(models.MessageLog.rating == -1).count()
    total_rated = positive_ratings + negative_ratings
    satisfaction_rate = round((positive_ratings / total_rated) * 100) if total_rated > 0 else 100
    
    # Kategoriye göre gruplayıp sayılarını alalım (SQL GROUP BY)
    category_counts = db.query(
        models.MessageLog.category, 
        func.count(models.MessageLog.id)
    ).group_by(models.MessageLog.category).all()
    
    topics = []
    for cat, count in category_counts:
        percent = round((count / total_questions * 100)) if total_questions > 0 else 0
        topics.append({
            "name": cat or "Diğer",
            "percent": percent,
            "count": count
        })
    
    topics = sorted(topics, key=lambda x: x["count"], reverse=True)

    return {
        "total_students": total_students,
        "total_questions": total_questions,
        "active_sessions": total_students,
        "positive_ratings": positive_ratings,
        "negative_ratings": negative_ratings,
        "satisfaction_rate": satisfaction_rate,
        "topics": topics
    }


import json
import os

@app.post("/api/flow", dependencies=[Depends(get_current_admin)])
async def save_flow(flow: dict):
    os.makedirs("data", exist_ok=True)
    with open("data/flow.json", "w", encoding="utf-8") as f:
        json.dump(flow, f, ensure_ascii=False, indent=2)
    return {"status": "success"}

@app.get("/api/flow", dependencies=[Depends(get_current_admin)])
async def get_flow():
    if os.path.exists("data/flow.json"):
        with open("data/flow.json", "r", encoding="utf-8") as f:
            return json.load(f)
    return {"nodes": [], "edges": []}


# --- YAPAY ZEKA EĞİTİM ENDPOINTLERİ ---
from pydantic import BaseModel
import glob
from app.rag import rag_engine
from ingest import ingest_data

class TrainRequest(BaseModel):
    title: str
    category: Optional[str] = "Genel"
    content: str
    log_id: Optional[int] = None

@app.post("/api/train", dependencies=[Depends(get_current_admin)])
async def train_ai(req: TrainRequest, db: Session = Depends(get_db)):
    os.makedirs("data", exist_ok=True)
    
    # Dosya adını temizle ve kaydet
    safe_title = "".join([c if c.isalnum() else "_" for c in req.title])
    filepath = f"data/bilgi_{safe_title}.txt"
    
    # Yapay Zeka için içeriği zenginleştir
    full_content = f"BAŞLIK: {req.title}\n\nİÇERİK (KURALLAR):\n{req.content}"
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(full_content)
        
    # Yeni eklenen kuralı FAISS vektör veritabanına artımlı (delta) olarak ekle
    success = ingest_file(filepath)
    if not success:
        ingest_data(force_rebuild=True)
    
    # RAG motorunu yeni veritabanıyla güncelle
    rag_engine.__init__()

    # Öğretilen cevapsız soruyu / soruları veritabanında çözüldü olarak işaretle
    resolved_count = 0
    if req.log_id:
        target_log = db.query(models.MessageLog).filter(models.MessageLog.id == req.log_id).first()
        if target_log:
            target_log.is_unanswered = False
            if not target_log.answer or "bilgim yok" in target_log.answer.lower() or "üzgünüm" in target_log.answer.lower():
                target_log.answer = f"[Yapay Zekaya Öğretildi]: {req.content}"
            resolved_count += 1

    # Başlıkla eşleşen diğer cevapsız kayıtları da otomatik temizle/işaretle
    clean_title = normalize_tr(req.title).lower().strip()
    if clean_title:
        all_unanswered = db.query(models.MessageLog).filter(models.MessageLog.is_unanswered == True).all()
        for ulog in all_unanswered:
            clean_q = normalize_tr(ulog.question or "").lower().strip()
            if clean_q and (clean_q == clean_title or clean_q in clean_title or clean_title in clean_q):
                ulog.is_unanswered = False
                if not ulog.answer or "bilgim yok" in ulog.answer.lower() or "üzgünüm" in ulog.answer.lower():
                    ulog.answer = f"[Yapay Zekaya Öğretildi]: {req.content}"
                resolved_count += 1

    if resolved_count > 0:
        db.commit()
    
    return {"status": "success", "message": "Yapay zeka başarıyla eğitildi!", "resolved_count": resolved_count}

@app.get("/api/documents", dependencies=[Depends(get_current_admin)])
async def list_documents():
    os.makedirs("data", exist_ok=True)
    files = glob.glob("data/*.txt")
    docs = []
    for file in files:
        filename = os.path.basename(file)
        try:
            with open(file, "r", encoding="utf-8") as f:
                content = f.read()
        except:
            continue
        
        # Kategori, kaynak ve önizlemeyi ayrıştır
        category = "Genel"
        source = filename.replace('.txt', '')
        preview_text = content
        
        lines = content.split("\n")
        for line in lines:
            if line.startswith("KATEGORİ:"):
                category = line.replace("KATEGORİ:", "").strip()
            elif line.startswith("KAYNAK:"):
                source = line.replace("KAYNAK:", "").strip()
            elif line.startswith("BAŞLIK:"):
                source = line.replace("BAŞLIK:", "").strip()
        
        # İçerik önizleme (ilk 150 anlamlı karakter)
        content_lines = [l for l in lines if l.strip() and not l.startswith(("KATEGORİ:", "KAYNAK:", "BAŞLIK:", "İÇERİK"))]
        preview = " ".join(content_lines)[:150] + "..." if len(" ".join(content_lines)) > 150 else " ".join(content_lines)
        
        file_type = "pdf" if "KAYNAK:" in content else "text"
        
        docs.append({
            "filename": filename,
            "source": source,
            "category": category,
            "file_type": file_type,
            "preview": preview,
            "size": len(content)
        })
    
    # Tarihe göre sırala (en yeni önce)
    docs = sorted(docs, key=lambda x: os.path.getmtime(f"data/{x['filename']}"), reverse=True)
    return {"documents": docs}


@app.delete("/api/documents/{filename}", dependencies=[Depends(get_current_admin)])
async def delete_document(filename: str):
    filepath = f"data/{filename}"
    if os.path.exists(filepath):
        os.remove(filepath)
        # Veritabanını güncelle
        ingest_data()
        rag_engine.__init__()
        return {"status": "success"}
    return {"status": "error", "message": "Dosya bulunamadı"}


# --- PDF YÜKLEME ---
import pdfplumber
import shutil
from fastapi import Form

@app.post("/api/upload-pdf", dependencies=[Depends(get_current_admin)])
async def upload_pdf(
    category: Optional[str] = Form(default="Genel"),
    file: UploadFile = File(...)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyaları yüklenebilir.")
    
    os.makedirs("data", exist_ok=True)
    
    tmp_path = f"data/tmp_{file.filename}"
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    extracted_text = ""
    try:
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_text += page_text + "\n"
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    
    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="PDF'ten metin çıkarılamadı. Görüntü tabanlı PDF olabilir.")
    
    safe_name = "".join([c if c.isalnum() else "_" for c in file.filename.replace(".pdf", "")])
    filepath = f"data/pdf_{safe_name}.txt"
    
    full_content = f"KAYNAK: {file.filename}\n\nİÇERİK:\n{extracted_text}"
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(full_content)
    
    success = ingest_file(filepath)
    if not success:
        ingest_data(force_rebuild=True)
    rag_engine.__init__()
    
    return {"status": "success", "message": f"'{file.filename}' başarıyla yüklendi ve işlendi!"}


# --- 👍👎 MEMNUNİYET OYLAMA ---
class RateRequest(BaseModel):
    message_id: int
    rating: int  # 1 = beğendi, -1 = beğenmedi

@app.post("/api/rate")
async def rate_message(req: RateRequest, db: Session = Depends(get_db)):
    log = db.query(models.MessageLog).filter(models.MessageLog.id == req.message_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    log.rating = req.rating
    db.commit()
    return {"status": "success"}


# --- CEVAPSIZ SORULAR LİSTESİ ---
@app.get("/api/unanswered", dependencies=[Depends(get_current_admin)])
async def get_unanswered(db: Session = Depends(get_db)):
    unanswered = db.query(models.MessageLog).filter(
        models.MessageLog.is_unanswered == True
    ).order_by(models.MessageLog.created_at.desc()).limit(50).all()
    
    return {"questions": [
        {
            "id": q.id,
            "question": q.question,
            "category": q.category,
            "created_at": q.created_at.isoformat() if q.created_at else None
        } for q in unanswered
    ]}


# --- SOHBET GEÇMİŞİ ---
@app.get("/api/conversations/{username}", dependencies=[Depends(get_current_admin)])
async def get_conversations(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return {"conversations": []}
    
    sessions = db.query(
        models.MessageLog.session_id,
        func.min(models.MessageLog.created_at).label("started_at"),
        func.count(models.MessageLog.id).label("msg_count")
    ).filter(
        models.MessageLog.user_id == user.id,
        models.MessageLog.session_id != None
    ).group_by(models.MessageLog.session_id).order_by(func.min(models.MessageLog.created_at).desc()).limit(20).all()
    
    result = []
    for session_id, started_at, msg_count in sessions:
        first_msg = db.query(models.MessageLog).filter(
            models.MessageLog.session_id == session_id
        ).order_by(models.MessageLog.created_at.asc()).first()
        
        title = first_msg.question if first_msg else "Sohbet"
        if len(title) > 45:
            title = title[:45] + "..."
        
        result.append({
            "session_id": session_id,
            "title": title,
            "started_at": started_at.isoformat() if started_at else None,
            "msg_count": msg_count
        })
    
    return {"conversations": result}


@app.get("/api/conversations/{username}/{session_id}", dependencies=[Depends(get_current_admin)])
async def get_conversation_detail(username: str, session_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return {"messages": []}
    
    logs = db.query(models.MessageLog).filter(
        models.MessageLog.user_id == user.id,
        models.MessageLog.session_id == session_id
    ).order_by(models.MessageLog.created_at.asc()).all()
    
    messages = []
    for log in logs:
        messages.append({"role": "user", "text": log.question, "id": log.id * 10})
        messages.append({"role": "bot", "text": log.answer, "id": log.id * 10 + 1, "message_id": log.id, "rating": log.rating or 0})
    
    return {"messages": messages}


# ===================== YENİ ÖZELLİK ENDPOİNTLERİ =====================

# 1. CANLI SOHBET GÜNLÜĞÜ (CHAT LOGS)
@app.get("/api/logs", dependencies=[Depends(get_current_admin)])
async def get_all_logs(
    search: Optional[str] = None,
    rating: Optional[int] = None,
    category: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.MessageLog, models.User.username).outerjoin(models.User, models.MessageLog.user_id == models.User.id)
    
    if rating is not None:
        query = query.filter(models.MessageLog.rating == rating)
    if category and category != "Hepsi":
        query = query.filter(models.MessageLog.category == category)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (models.MessageLog.question.ilike(term)) |
            (models.MessageLog.answer.ilike(term)) |
            (models.User.username.ilike(term))
        )
    
    logs = query.order_by(models.MessageLog.created_at.desc()).limit(limit).all()
    active_flow_names = {f.name for f in db.query(models.ChatFlow).all()}
    
    result = []
    for log, uname in logs:
        cat = log.category or "Diğer"
        is_flow = cat in active_flow_names or cat.startswith("Akış")
        source_type = f"⚡ Görsel Akış Diyagramı ({cat})" if is_flow else "🤖 Yapay Zeka (RAG)"
        result.append({
            "id": log.id,
            "username": uname or "Öğrenci",
            "question": log.question,
            "answer": log.answer,
            "category": cat,
            "source_type": source_type,
            "is_flow": is_flow,
            "rating": log.rating or 0,
            "is_unanswered": bool(log.is_unanswered),
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    return {"logs": result}

@app.delete("/api/logs/{log_id}", dependencies=[Depends(get_current_admin)])
async def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.MessageLog).filter(models.MessageLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    db.delete(log)
    db.commit()
    return {"status": "success", "message": "Sohbet kaydı başarıyla silindi."}

@app.delete("/api/unanswered/all", dependencies=[Depends(get_current_admin)])
async def clear_all_unanswered(db: Session = Depends(get_db)):
    db.query(models.MessageLog).filter(models.MessageLog.is_unanswered == True).delete()
    db.commit()
    return {"status": "success", "message": "Tüm cevapsız sorular temizlendi."}

@app.patch("/api/unanswered/{log_id}/resolve", dependencies=[Depends(get_current_admin)])
async def resolve_unanswered(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.MessageLog).filter(models.MessageLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    log.is_unanswered = False
    db.commit()
    return {"status": "success", "message": "Soru çözüldü olarak işaretlendi ve listeden kaldırıldı."}


# 2. BELGE İÇERİĞİ GÖRÜNTÜLEME VE DÜZENLEME
@app.get("/api/documents/{filename}/content", dependencies=[Depends(get_current_admin)])
async def get_document_content(filename: str):
    filepath = f"data/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Belge bulunamadı")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    return {"filename": filename, "content": content}

class UpdateDocRequest(BaseModel):
    content: str

@app.put("/api/documents/{filename}", dependencies=[Depends(get_current_admin)])
async def update_document_content(filename: str, req: UpdateDocRequest, background_tasks: BackgroundTasks):
    filepath = f"data/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Belge bulunamadı")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(req.content)
    
    # Vektör veritabanını arka planda güncelle (sunucuyu kilitletmez)
    background_tasks.add_task(run_background_reindex)
    return {"status": "success", "message": "Belge kaydedildi! Yapay zeka yeniden eğitimi arka planda başlatıldı."}


# 3. FAKÜLTE CANLI DUYURU BANDI VE GEÇMİŞ YÖNETİMİ
class AnnouncementRequest(BaseModel):
    id: Optional[int] = None
    text: str
    is_active: bool
    starts_at: Optional[str] = None
    expires_at: Optional[str] = None

def get_announcements_data(db: Session):
    records = db.query(models.Announcement).order_by(models.Announcement.created_at.desc()).all()
    history = []
    active_id = None
    for r in records:
        history.append({
            "id": r.id,
            "text": r.text,
            "is_active": r.is_active,
            "starts_at": r.starts_at,
            "expires_at": r.expires_at,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        })
        if r.is_active and not active_id:
            active_id = r.id
    return {"active_id": active_id, "history": history}

@app.get("/api/announcement")
async def get_announcement(db: Session = Depends(get_db)):
    data = get_announcements_data(db)
    history = data.get("history", [])
    now = datetime.now()
    
    processed_history = []
    active_announcements = []

    for item in history:
        starts_at = item.get("starts_at")
        expires_at = item.get("expires_at")
        is_scheduled = False
        is_expired = False
        time_left_str = "Süresiz Duyuru"

        # 1. Başlangıç Tarihi Kontrolü (Zamanlanmış Duyuru)
        if starts_at and starts_at.strip():
            try:
                start_dt = datetime.fromisoformat(starts_at)
                if now < start_dt:
                    is_scheduled = True
                    diff_start = start_dt - now
                    hours_s = diff_start.seconds // 3600 + diff_start.days * 24
                    mins_s = (diff_start.seconds % 3600) // 60
                    if hours_s >= 24:
                        days_s = hours_s // 24
                        time_left_str = f"⏳ {days_s} gün {hours_s % 24} saat sonra yayına girecek"
                    elif hours_s > 0:
                        time_left_str = f"⏳ {hours_s} saat {mins_s} dk sonra yayına girecek"
                    else:
                        time_left_str = f"⏳ {mins_s} dk sonra yayına girecek"
            except Exception:
                pass

        # 2. Bitiş Tarihi Kontrolü (Süresi Dolmuş Duyuru)
        if not is_scheduled and expires_at and expires_at.strip():
            try:
                exp_dt = datetime.fromisoformat(expires_at)
                if now > exp_dt:
                    is_expired = True
                    time_left_str = "Süresi Doldu"
                else:
                    diff = exp_dt - now
                    hours = diff.seconds // 3600 + diff.days * 24
                    mins = (diff.seconds % 3600) // 60
                    if hours >= 24:
                        days = hours // 24
                        time_left_str = f"{days} gün {hours % 24} saat kaldı"
                    elif hours > 0:
                        time_left_str = f"{hours} saat {mins} dk kaldı"
                    else:
                        time_left_str = f"{mins} dk kaldı"
            except Exception:
                pass

        is_currently_live = bool(item.get("is_active")) and not is_scheduled and not is_expired

        processed_item = {
            **item,
            "is_scheduled": is_scheduled,
            "is_expired": is_expired,
            "is_currently_live": is_currently_live,
            "time_left_str": time_left_str
        }
        processed_history.append(processed_item)

        if is_currently_live:
            active_announcements.append(processed_item)

    active_ann = active_announcements[0] if active_announcements else None
    text = active_ann.get("text", "") if active_ann else ""
    is_active = len(active_announcements) > 0
    expires_at = active_ann.get("expires_at") if active_ann else None

    return {
        "text": text,
        "is_active": is_active,
        "expires_at": expires_at,
        "active_announcements": active_announcements,
        "active_item": active_ann,
        "history": processed_history
    }

@app.post("/api/announcement", dependencies=[Depends(get_current_admin)])
async def create_or_update_announcement(req: AnnouncementRequest, db: Session = Depends(get_db)):
    if req.id:
        target = db.query(models.Announcement).filter(models.Announcement.id == req.id).first()
        if target:
            target.text = req.text
            target.is_active = req.is_active
            target.starts_at = req.starts_at
            target.expires_at = req.expires_at
            target.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(target)
            return {"status": "success", "data": get_announcements_data(db)}

    new_item = models.Announcement(
        text=req.text,
        is_active=req.is_active,
        starts_at=req.starts_at,
        expires_at=req.expires_at,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"status": "success", "data": get_announcements_data(db)}

@app.delete("/api/announcement/clear-past", dependencies=[Depends(get_current_admin)])
async def clear_past_announcements(db: Session = Depends(get_db)):
    records = db.query(models.Announcement).all()
    now = datetime.now()
    for item in records:
        is_scheduled = False
        is_expired = False
        if item.starts_at and item.starts_at.strip():
            try:
                if now < datetime.fromisoformat(item.starts_at):
                    is_scheduled = True
            except Exception:
                pass
        if not is_scheduled and item.expires_at and item.expires_at.strip():
            try:
                if now > datetime.fromisoformat(item.expires_at):
                    is_expired = True
            except Exception:
                pass
        is_currently_live = bool(item.is_active) and not is_scheduled and not is_expired
        if not is_currently_live:
            db.delete(item)
    db.commit()
    return {"status": "success", "message": "Geçmiş duyurular temizlendi."}

@app.delete("/api/announcement/{ann_id}", dependencies=[Depends(get_current_admin)])
async def delete_announcement(ann_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Announcement).filter(models.Announcement.id == ann_id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"status": "success", "message": "Duyuru silindi."}

@app.post("/api/announcement/{ann_id}/toggle-active", dependencies=[Depends(get_current_admin)])
async def toggle_announcement_active(ann_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Announcement).filter(models.Announcement.id == ann_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Duyuru bulunamadı")
    item.is_active = not item.is_active
    db.commit()
    return {"status": "success", "is_active": item.is_active}


# 4. EXCEL / CSV RAPOR ÇIKTISI
from fastapi.responses import StreamingResponse
import io
import csv

@app.get("/api/export-logs")
async def export_logs(
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    db: Session = Depends(get_db)
):
    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        raise HTTPException(status_code=401, detail="Yetkilendirme gerekli.")
    try:
        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gereklidir.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Oturum süresi doldu.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token.")

    logs = db.query(models.MessageLog, models.User.username).outerjoin(
        models.User, models.MessageLog.user_id == models.User.id
    ).order_by(models.MessageLog.created_at.desc()).all()
    
    output = io.StringIO()
    # Excel'in Türkçe karakterleri doğru tanıması için UTF-8 BOM
    output.write('\ufeff')
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["Kayıt No", "Tarih & Saat", "Öğrenci Kullanıcı Adı", "Kategori", "Soru", "Yapay Zeka Yanıtı", "Öğrenci Puanı", "Durum"])
    
    for log, uname in logs:
        rating_str = "Faydalı (👍)" if log.rating == 1 else ("Faydasız (👎)" if log.rating == -1 else "Oylanmadı")
        status_str = "Cevapsız Kaldı" if log.is_unanswered else "Başarıyla Cevaplandı"
        created_str = log.created_at.strftime("%d.%m.%Y %H:%M") if log.created_at else ""
        writer.writerow([
            log.id,
            created_str,
            uname or "Anonim",
            log.category or "Diğer",
            (log.question or "").replace("\n", " ").replace(";", ","),
            (log.answer or "").replace("\n", " ").replace(";", ","),
            rating_str,
            status_str
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=muhendislik_asistan_sohbet_raporu.csv"}
    )


# ===================== 5 YENİ İLERİ DÜZEY ÖZELLİK =====================

# 1. ADMIN AI PLAYGROUND / TEST SİMÜLATÖRÜ
class PlaygroundTestRequest(BaseModel):
    query: str

@app.post("/api/test-query", dependencies=[Depends(get_current_admin)])
async def test_ai_query(req: PlaygroundTestRequest, db: Session = Depends(get_db)):
    flow_match = match_active_flow(req.query, db)
    if flow_match:
        return {
            "answer": flow_match["text"],
            "options": flow_match.get("options", []),
            "sources": [],
            "source_type": f"⚡ Görsel Akış Diyagramı (Akış Adı: {flow_match.get('category', 'Akış')})",
            "is_flow": True
        }
    result = rag_engine.test_query_with_sources(req.query)
    result["source_type"] = "🤖 Yapay Zeka (RAG / Gemini Bilgi Bankası)"
    result["is_flow"] = False
    return result


# 2. DİNAMİK HIZLI SSS & BUTON YÖNETİMİ
DEFAULT_FAQS = [
    {"id": 1, "topic": "CENG Staj Koşulları ve Süresi", "category": "CENG Stajı"},
    {"id": 2, "topic": "Programlama & Müfredat Dersleri", "category": "CENG Dersleri"},
    {"id": 3, "topic": "Bitirme Projesi (CENG401/402)", "category": "Bitirme Projesi"},
    {"id": 4, "topic": "Bilgisayar Mühendisliği Laboratuvarları", "category": "Laboratuvarlar"},
    {"id": 5, "topic": "AGNO 1.80 Barajı & Mezuniyet", "category": "Sınav & AGNO"},
    {"id": 6, "topic": "Bölüm Sekreterliği & İletişim", "category": "İletişim"}
]

@app.get("/api/faq")
async def get_faqs(db: Session = Depends(get_db)):
    items = db.query(models.FAQItem).order_by(models.FAQItem.order.asc(), models.FAQItem.id.asc()).all()
    if not items:
        return {"faqs": DEFAULT_FAQS}
    return {
        "faqs": [
            {"id": item.id, "topic": item.topic, "category": item.category or "Genel"}
            for item in items
        ]
    }

class FaqSaveRequest(BaseModel):
    faqs: List[dict]

@app.post("/api/faq", dependencies=[Depends(get_current_admin)])
async def save_faqs(req: FaqSaveRequest, db: Session = Depends(get_db)):
    db.query(models.FAQItem).delete()
    for idx, faq in enumerate(req.faqs, 1):
        db.add(models.FAQItem(
            topic=faq.get("topic", "").strip(),
            category=faq.get("category", "Genel"),
            order=idx
        ))
    db.commit()
    return {"status": "success", "faqs": req.faqs}


# 3. KULLANICI & ÖĞRENCİ YÖNETİMİ
@app.get("/api/users", dependencies=[Depends(get_current_admin)])
async def get_users_list(db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id.asc()).all()
    result = []
    for u in users:
        msg_count = db.query(models.MessageLog).filter(models.MessageLog.user_id == u.id).count()
        result.append({
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "question_count": msg_count
        })
    return {"users": result}

class UserRoleUpdate(BaseModel):
    role: str

@app.put("/api/users/{user_id}/role", dependencies=[Depends(get_current_admin)])
async def update_user_role(user_id: int, req: UserRoleUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    user.role = req.role
    db.commit()
    return {"status": "success", "message": f"{user.username} yetkisi '{req.role}' olarak güncellendi."}

@app.delete("/api/users/{user_id}", dependencies=[Depends(get_current_admin)])
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Kullanıcının loglarını temizle veya user_id null yap
    db.query(models.MessageLog).filter(models.MessageLog.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"status": "success", "message": f"{user.username} hesabı silindi."}

class ResetPasswordRequest(BaseModel):
    new_password: str

@app.put("/api/users/{user_id}/password", dependencies=[Depends(get_current_admin)])
async def reset_user_password(user_id: int, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if not req.new_password or len(req.new_password) < 4:
        raise HTTPException(status_code=400, detail="Yeni şifre en az 4 karakter olmalıdır.")
    user.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"status": "success", "message": f"{user.username} şifresi başarıyla güncellendi."}

@app.post("/api/reindex", dependencies=[Depends(get_current_admin)])
async def reindex_vector_db(background_tasks: BackgroundTasks):
    try:
        background_tasks.add_task(run_background_reindex)
        return {"status": "success", "message": "Vektör veritabanı indeksleme işlemi arka planda başlatıldı! Sistem dondurulmadan çalışmaya devam ediyor."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İndeksleme başlatma hatası: {str(e)}")


# 4. GÜVENLİK & KARA LİSTE FİLTRESİ
DEFAULT_GUARDRAILS = {
    "banned_keywords": ["küfür", "hakaret", "kumar", "siyaset", "parti", "bahis"],
    "rejection_message": "Bu platform yalnızca fakülte akademik ve idari işlemlerine hizmet vermektedir. Lütfen fakülteyle ilgili bir soru sorunuz."
}

@app.get("/api/guardrails", dependencies=[Depends(get_current_admin)])
async def get_guardrails(db: Session = Depends(get_db)):
    record = db.query(models.SystemSetting).filter(models.SystemSetting.key == "guardrails").first()
    if record and record.value:
        return record.value
    return DEFAULT_GUARDRAILS

class GuardrailsRequest(BaseModel):
    banned_keywords: List[str]
    rejection_message: str

@app.post("/api/guardrails", dependencies=[Depends(get_current_admin)])
async def save_guardrails(req: GuardrailsRequest, db: Session = Depends(get_db)):
    record = db.query(models.SystemSetting).filter(models.SystemSetting.key == "guardrails").first()
    if not record:
        record = models.SystemSetting(key="guardrails", value=req.dict())
        db.add(record)
    else:
        record.value = req.dict()
        record.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "guardrails": req.dict()}


# 5. BOT KİŞİLİĞİ & SİSTEM AYARLARI
@app.get("/api/settings", dependencies=[Depends(get_current_admin)])
async def get_settings(db: Session = Depends(get_db)):
    record = db.query(models.SystemSetting).filter(models.SystemSetting.key == "bot_settings").first()
    if record and record.value:
        return record.value
    from app.rag import get_system_settings
    return get_system_settings()

class SettingsRequest(BaseModel):
    bot_name: str
    department_name: str
    bot_tone: str
    welcome_message: str
    whatsapp_number: Optional[str] = "15551662647"

@app.post("/api/settings", dependencies=[Depends(get_current_admin)])
async def save_settings(req: SettingsRequest, db: Session = Depends(get_db)):
    record = db.query(models.SystemSetting).filter(models.SystemSetting.key == "bot_settings").first()
    if not record:
        record = models.SystemSetting(key="bot_settings", value=req.dict())
        db.add(record)
    else:
        record.value = req.dict()
        record.updated_at = datetime.utcnow()
    db.commit()
    
    # RAG promptunu yeni ayarlarla yenile
    rag_engine.__init__()
    return {"status": "success", "settings": req.dict()}


# ─────────────────────────────────────────
# WHATSAPP & META WEBHOOK YÖNETİMİ API'LERİ
# ─────────────────────────────────────────

class WhatsAppMetaSettingsUpdate(BaseModel):
    webhook_url: str
    verify_token: str
    phone_id: str
    access_token: str
    app_id: Optional[str] = ""
    app_secret: Optional[str] = ""

class MetaSyncRequest(BaseModel):
    app_id: str
    app_secret: str
    webhook_url: str
    verify_token: str

@app.get("/api/settings/whatsapp-meta", dependencies=[Depends(get_current_admin)])
def get_whatsapp_meta_settings_api(db: Session = Depends(get_db)):
    settings = get_meta_wa_settings(db)
    detected_tunnel = detect_active_tunnel_url()
    
    # Canlı Meta Durum Kontrolü (Hafif Graph API kontrolü)
    meta_status = {"is_valid": False, "details": "Henüz test edilmedi"}
    phone_id = settings.get("phone_id")
    token = settings.get("access_token")
    if phone_id and token:
        try:
            r = requests.get(f"https://graph.facebook.com/v21.0/{phone_id}?access_token={token}", timeout=6)
            if r.status_code == 200:
                data = r.json()
                meta_status = {
                    "is_valid": True,
                    "phone_number": data.get("display_phone_number", ""),
                    "verified_name": data.get("verified_name", ""),
                    "quality_rating": data.get("quality_rating", "GREEN"),
                    "current_meta_webhook": data.get("webhook_configuration", {}).get("application", ""),
                    "details": "Bağlantı Başarılı & Token Geçerli"
                }
            else:
                err_data = r.json() if r.text else {}
                err_msg = err_data.get("error", {}).get("message", f"HTTP {r.status_code}")
                meta_status = {
                    "is_valid": False,
                    "error_code": r.status_code,
                    "details": f"Token Geçersiz / Süresi Dolmuş: {err_msg}"
                }
        except Exception as e:
            meta_status = {"is_valid": False, "details": f"Meta erişim hatası: {str(e)}"}

    return {
        "settings": settings,
        "detected_tunnel_url": detected_tunnel,
        "suggested_webhook_url": f"{detected_tunnel}/webhook/whatsapp/meta" if detected_tunnel else "",
        "meta_status": meta_status
    }

@app.post("/api/settings/whatsapp-meta", dependencies=[Depends(get_current_admin)])
def save_whatsapp_meta_settings_api(req: WhatsAppMetaSettingsUpdate, db: Session = Depends(get_db)):
    clean_webhook = req.webhook_url.strip()
    clean_token = req.verify_token.strip()
    clean_phone = req.phone_id.strip()
    clean_access = req.access_token.strip()
    clean_app_id = (req.app_id or "").strip()
    clean_app_secret = (req.app_secret or "").strip()

    payload = {
        "webhook_url": clean_webhook,
        "verify_token": clean_token,
        "phone_id": clean_phone,
        "access_token": clean_access,
        "app_id": clean_app_id,
        "app_secret": clean_app_secret
    }

    record = db.query(models.SystemSetting).filter(models.SystemSetting.key == "whatsapp_meta_settings").first()
    if not record:
        record = models.SystemSetting(key="whatsapp_meta_settings", value=payload)
        db.add(record)
    else:
        record.value = payload
        record.updated_at = datetime.utcnow()
    db.commit()

    # ENV ve RAM güncelle
    env_updates = {
        "META_WA_VERIFY_TOKEN": clean_token,
        "META_WA_PHONE_ID": clean_phone,
        "META_WA_TOKEN": clean_access,
        "META_APP_ID": clean_app_id,
        "META_APP_SECRET": clean_app_secret
    }
    update_backend_env(env_updates)
    for k, v in env_updates.items():
        if v:
            os.environ[k] = v

    return {"status": "success", "message": "WhatsApp ve Meta ayarları başarıyla kaydedildi!", "settings": payload}

@app.post("/api/settings/whatsapp-meta/sync-meta", dependencies=[Depends(get_current_admin)])
def sync_meta_webhook(req: MetaSyncRequest, db: Session = Depends(get_db)):
    """
    Meta Graph API (POST /{app-id}/subscriptions) çağrısı yaparak
    developers.facebook.com arayüzüne girmeden webhook'u otomatik kaydeder.
    """
    app_id = req.app_id.strip()
    app_secret = req.app_secret.strip()
    webhook_url = req.webhook_url.strip()
    verify_token = req.verify_token.strip()

    if not app_id or not app_secret:
        raise HTTPException(
            status_code=400, 
            detail="Meta App ID ve App Secret alanları boş bırakılamaz. Bu bilgileri developers.facebook.com > Uygulama Ayarları > Temel sayfasından alabilirsiniz."
        )
    if not webhook_url.startswith("https://"):
        raise HTTPException(
            status_code=400, 
            detail="Webhook URL geçerli bir HTTPS adresi olmalıdır (Meta HTTP kabul etmez)."
        )

    # 1. Önce yerel veritabanında ve RAM'de doğrula / güncelle
    record = db.query(models.SystemSetting).filter(models.SystemSetting.key == "whatsapp_meta_settings").first()
    current_val = dict(record.value) if (record and isinstance(record.value, dict)) else {}
    current_val["webhook_url"] = webhook_url
    current_val["verify_token"] = verify_token
    current_val["app_id"] = app_id
    current_val["app_secret"] = app_secret
    if not record:
        record = models.SystemSetting(key="whatsapp_meta_settings", value=current_val)
        db.add(record)
    else:
        record.value = current_val
        record.updated_at = datetime.utcnow()
    db.commit()
    os.environ["META_WA_VERIFY_TOKEN"] = verify_token

    # 2. Meta Subscriptions API'ye İstek Gönder
    app_access_token = f"{app_id}|{app_secret}"
    meta_url = f"https://graph.facebook.com/v21.0/{app_id}/subscriptions"
    
    post_data = {
        "object": "whatsapp_business_account",
        "callback_url": webhook_url,
        "verify_token": verify_token,
        "fields": "messages",
        "access_token": app_access_token
    }

    try:
        r = requests.post(meta_url, data=post_data, timeout=15)
        res_json = r.json() if r.text else {}
        if r.status_code == 200 and res_json.get("success"):
            return {
                "status": "success",
                "message": "Harika! Meta Developers Callback URL ve Verify Token başarıyla güncellendi ve doğrulandı.",
                "details": res_json
            }
        else:
            err_msg = res_json.get("error", {}).get("message", r.text)
            raise HTTPException(
                status_code=400,
                detail=f"Meta API Doğrulama Hatası: {err_msg}"
            )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Meta sunucularına bağlanılamadı: {str(e)}"
        )

@app.post("/api/settings/whatsapp-meta/test-connection", dependencies=[Depends(get_current_admin)])
def test_whatsapp_connection(db: Session = Depends(get_db)):
    """Mevcut telefon ID ve erişim belirtecini Meta Graph API üzerinden canlı test eder."""
    settings = get_meta_wa_settings(db)
    phone_id = settings.get("phone_id")
    token = settings.get("access_token")
    if not phone_id or not token:
        raise HTTPException(status_code=400, detail="Telefon Numarası Kimliği veya Access Token eksik!")

    try:
        r = requests.get(f"https://graph.facebook.com/v21.0/{phone_id}?access_token={token}", timeout=8)
        if r.status_code == 200:
            data = r.json()
            return {
                "status": "success",
                "data": {
                    "phone_number": data.get("display_phone_number"),
                    "verified_name": data.get("verified_name"),
                    "quality_rating": data.get("quality_rating"),
                    "current_meta_webhook": data.get("webhook_configuration", {}).get("application", "")
                },
                "message": f"Bağlantı Başarılı! Kayıtlı Numara: {data.get('display_phone_number')} ({data.get('verified_name')})"
            }
        else:
            err_data = r.json() if r.text else {}
            err_msg = err_data.get("error", {}).get("message", f"HTTP {r.status_code}")
            raise HTTPException(status_code=400, detail=f"Meta Hatası: {err_msg}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Meta Graph API bağlantı hatası: {str(e)}")


# ─────────────────────────────────────────
# CLOUDFLARE TÜNEL YÖNETİMİ API'LERİ
# ─────────────────────────────────────────

@app.get("/api/tunnel/status", dependencies=[Depends(get_current_admin)])
def get_tunnel_status():
    """Tünel aktifliğini ve mevcut URL adresini kontrol eder."""
    running = is_cloudflared_running()
    url = detect_active_tunnel_url() if running else None
    return {
        "is_running": running,
        "tunnel_url": url,
        "webhook_url": f"{url}/webhook/whatsapp/meta" if url else ""
    }

@app.post("/api/tunnel/start", dependencies=[Depends(get_current_admin)])
def start_tunnel_endpoint(db: Session = Depends(get_db)):
    """Cloudflare tünelini başlatır, URL'yi alır ve Meta Webhook'u ile otomatik eşitler."""
    tunnel_url, msg = start_cloudflared_tunnel(port=8000, timeout=18)
    if not tunnel_url:
        raise HTTPException(status_code=500, detail=msg)

    webhook_url = f"{tunnel_url}/webhook/whatsapp/meta"

    # Veritabanında webhook URL'i güncelle
    record = db.query(models.SystemSetting).filter(models.SystemSetting.key == "whatsapp_meta_settings").first()
    val = dict(record.value) if (record and isinstance(record.value, dict)) else {}
    val["webhook_url"] = webhook_url
    if not record:
        record = models.SystemSetting(key="whatsapp_meta_settings", value=val)
        db.add(record)
    else:
        record.value = val
        record.updated_at = datetime.utcnow()
    db.commit()

    update_backend_env({"META_WA_WEBHOOK_URL": webhook_url})

    # Eğer App ID ve App Secret kayıtlıysa Meta Graph API'ye otomatik bildir
    meta_synced = False
    meta_msg = ""
    app_id = (val.get("app_id") or os.getenv("META_APP_ID", "")).strip()
    app_secret = (val.get("app_secret") or os.getenv("META_APP_SECRET", "")).strip()
    verify_token = (val.get("verify_token") or os.getenv("META_WA_VERIFY_TOKEN", "adiyaman_muhendislik_2026")).strip()

    if app_id and app_secret:
        # Cloudflare Quick Tunnel'ın küresel DNS'e oturması için bekleme ve retry
        import time
        app_access_token = f"{app_id}|{app_secret}"
        meta_url = f"https://graph.facebook.com/v21.0/{app_id}/subscriptions"
        post_data = {
            "object": "whatsapp_business_account",
            "callback_url": webhook_url,
            "verify_token": verify_token,
            "fields": "messages",
            "access_token": app_access_token
        }
        for attempt in range(4):
            time.sleep(3.5 if attempt == 0 else 2.0)
            try:
                r = requests.post(meta_url, data=post_data, timeout=12)
                res_json = r.json() if r.text else {}
                if r.status_code == 200 and res_json.get("success"):
                    meta_synced = True
                    meta_msg = "Meta Developers Webhook adresi otomatik güncellendi!"
                    break
                else:
                    err_text = res_json.get("error", {}).get("message", r.text)
                    meta_msg = f"Meta güncelleme uyarısı: {err_text}"
            except Exception as e:
                meta_msg = f"Meta bağlantı uyarısı: {str(e)}"

    return {
        "status": "success",
        "tunnel_url": tunnel_url,
        "webhook_url": webhook_url,
        "meta_synced": meta_synced,
        "meta_msg": meta_msg,
        "message": f"Cloudflare tüneli başarıyla başlatıldı!"
    }

@app.post("/api/tunnel/stop", dependencies=[Depends(get_current_admin)])
def stop_tunnel_endpoint():
    """Çalışan Cloudflare tünelini sonlandırır."""
    success = stop_cloudflared_tunnel()
    return {
        "status": "success" if success else "warning",
        "message": "Cloudflare tüneli durduruldu."
    }


# ─────────────────────────────────────────
# CHAT FLOW (Sürükle-Bırak Akış) API'leri
# ─────────────────────────────────────────


class FlowSaveRequest(BaseModel):
    name: str
    description: Optional[str] = None
    nodes: List[dict]
    edges: List[dict]

class FlowUpdateRequest(FlowSaveRequest):
    pass

@app.get("/api/flows")
async def list_flows(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Tüm kayıtlı akışları listeler (meta bilgiler, node/edge'siz)."""
    flows = db.query(models.ChatFlow).order_by(models.ChatFlow.updated_at.desc()).all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "description": f.description,
            "is_active": f.is_active,
            "node_count": len(f.nodes) if f.nodes else 0,
            "edge_count": len(f.edges) if f.edges else 0,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
        }
        for f in flows
    ]

@app.get("/api/flows/{flow_id}")
async def get_flow(
    flow_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Belirli bir akışın tüm node ve edge verilerini döndürür."""
    flow = db.query(models.ChatFlow).filter(models.ChatFlow.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Akış bulunamadı.")
    return {
        "id": flow.id,
        "name": flow.name,
        "description": flow.description,
        "nodes": flow.nodes,
        "edges": flow.edges,
        "is_active": flow.is_active,
        "created_at": flow.created_at.isoformat() if flow.created_at else None,
        "updated_at": flow.updated_at.isoformat() if flow.updated_at else None,
    }

@app.get("/api/flows/active/all")
async def get_all_active_flows(db: Session = Depends(get_db)):
    """Tüm aktif akışları döndürür (Öğrenci arayüzü buton gezinimi için)."""
    flows = db.query(models.ChatFlow).filter(models.ChatFlow.is_active == True).all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "description": f.description,
            "nodes": f.nodes,
            "edges": f.edges,
        }
        for f in flows
    ]

@app.get("/api/flows/active/current")
async def get_active_flow(db: Session = Depends(get_db)):
    """İlk aktif akışı döndürür."""
    flow = db.query(models.ChatFlow).filter(models.ChatFlow.is_active == True).first()
    if not flow:
        return {"id": None, "nodes": [], "edges": []}
    return {
        "id": flow.id,
        "name": flow.name,
        "nodes": flow.nodes,
        "edges": flow.edges,
    }

@app.post("/api/flows")
async def create_flow(
    req: FlowSaveRequest,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Yeni bir sohbet akışı oluşturur."""
    flow = models.ChatFlow(
        name=req.name,
        description=req.description,
        nodes=req.nodes,
        edges=req.edges,
        is_active=False,
    )
    db.add(flow)
    db.commit()
    db.refresh(flow)
    return {"id": flow.id, "name": flow.name, "message": "Akış başarıyla kaydedildi."}

@app.put("/api/flows/{flow_id}")
async def update_flow(
    flow_id: int,
    req: FlowUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Varolan bir akışı günceller (node ve edge'ler dahil)."""
    flow = db.query(models.ChatFlow).filter(models.ChatFlow.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Akış bulunamadı.")
    flow.name = req.name
    flow.description = req.description
    flow.nodes = req.nodes
    flow.edges = req.edges
    flow.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(flow)
    return {"id": flow.id, "name": flow.name, "message": "Akış güncellendi."}

@app.patch("/api/flows/{flow_id}/toggle-active")
async def toggle_active_flow(
    flow_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Belirtilen akışın aktif/pasif durumunu değiştirir (Birden fazla akış farklı konularda aynı anda aktif olabilir)."""
    flow = db.query(models.ChatFlow).filter(models.ChatFlow.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Akış bulunamadı.")
    flow.is_active = not flow.is_active
    db.commit()
    durum = "aktif" if flow.is_active else "pasif"
    return {"message": f"'{flow.name}' akışı {durum} yapıldı.", "is_active": flow.is_active}

@app.patch("/api/flows/{flow_id}/activate")
async def activate_flow(
    flow_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Belirtilen akışı aktif hale getirir."""
    flow = db.query(models.ChatFlow).filter(models.ChatFlow.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Akış bulunamadı.")
    flow.is_active = True
    db.commit()
    return {"message": f"'{flow.name}' akışı aktif olarak ayarlandı."}

@app.delete("/api/flows/{flow_id}")
async def delete_flow(
    flow_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Bir akışı kalıcı olarak siler."""
    flow = db.query(models.ChatFlow).filter(models.ChatFlow.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Akış bulunamadı.")
    db.delete(flow)
    db.commit()
    return {"message": "Akış silindi."}


# =====================================================================
# WHATSAPP (TWILIO SANDBOX) ENTEGRASYONU
# =====================================================================
from twilio.twiml.messaging_response import MessagingResponse

@app.get("/api/whatsapp/twilio")
@app.get("/webhook/whatsapp")
async def twilio_whatsapp_verify():
    """Twilio veya kontrol amaçlı GET istekleri için sağlık kontrolü."""
    return {"status": "ok", "message": "Twilio WhatsApp Webhook servisi aktif! 🚀"}

@app.post("/api/whatsapp/twilio")
@app.post("/webhook/whatsapp")
async def twilio_whatsapp_webhook(
    Body: str = Form(...),
    From: str = Form(...),
    To: Optional[str] = Form(None),
    ProfileName: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Twilio WhatsApp Sandbox'tan gelen mesajları karşılar,
    RAG motorundan cevap alır ve TwiML formatında WhatsApp'a geri döner.
    """
    incoming_text = Body.strip()
    sender_number = From.replace("whatsapp:", "").strip()
    
    # 1. Önce Veritabanındaki Aktif Akışları (Senaryoları) Kontrol Et
    flow_match = match_active_flow(incoming_text, db)
    
    if flow_match:
        answer_text = flow_match["text"]
        options = flow_match.get("options", [])
        detected_category = flow_match.get("category", "Akış")
        is_unanswered = check_is_unanswered(answer_text)
    else:
        # 2. Akış yoksa RAG motoru (Vektör DB + Yapay Zeka)
        response_data = rag_engine.get_response(incoming_text)
        answer_text = response_data.get("text", "")
        options = response_data.get("options", [])
        
        is_unanswered = response_data.get("is_unanswered", False) or check_is_unanswered(answer_text)
        detected_category = response_data.get("category") or "Genel"

    # Buton/seçenek varsa WhatsApp metnine ekle
    if options:
        answer_text += "\n\n📌 *Önerilen Konular:*\n" + "\n".join([f"• {opt}" for opt in options])

    # WhatsApp kullanıcısını kaydet veya bul
    wa_username = f"wa_{sender_number.replace('+', '')}"
    user = db.query(models.User).filter(models.User.username == wa_username).first()
    if not user:
        user = models.User(
            username=wa_username,
            password_hash=get_password_hash("whatsapp_guest"),
            role="student"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Mesajı veritabanına logla (Yönetici panelinde ve analitiklerde görünmesi için)
    new_log = models.MessageLog(
        user_id=user.id,
        session_id=f"wa_{sender_number}",
        category=detected_category,
        question=incoming_text,
        answer=answer_text,
        is_unanswered=is_unanswered
    )
    db.add(new_log)
    db.commit()

    # TwiML XML yanıtı oluştur
    twiml = MessagingResponse()
    twiml.message(answer_text)
    
    return Response(content=str(twiml), media_type="application/xml")


class WhatsAppDirectRequest(BaseModel):
    message: str
    sender: str

@app.post("/api/whatsapp/message")
async def whatsapp_direct_message(req: WhatsAppDirectRequest, db: Session = Depends(get_db)):
    """
    Yerel Node.js WhatsApp Web köprüsünden gelen mesajları karşılar,
    RAG motorundan cevap alıp JSON formatında döner.
    """
    incoming_text = req.message.strip()
    sender_clean = req.sender.replace("@c.us", "").replace("@s.whatsapp.net", "").replace("+", "").strip()
    
    # 1. Önce Veritabanındaki Aktif Akışları (Senaryoları) Kontrol Et
    flow_match = match_active_flow(incoming_text, db)
    
    if flow_match:
        answer_text = flow_match["text"]
        options = flow_match.get("options", [])
        detected_category = flow_match.get("category", "Akış")
        is_unanswered = check_is_unanswered(answer_text)
    else:
        # 2. Akış yoksa RAG motoru (Vektör DB + Yapay Zeka)
        response_data = rag_engine.get_response(incoming_text)
        answer_text = response_data.get("text", "")
        options = response_data.get("options", [])
        
        is_unanswered = response_data.get("is_unanswered", False) or check_is_unanswered(answer_text)
        detected_category = response_data.get("category") or "Genel"

    # Buton/seçenek varsa WhatsApp metnine ekle
    if options:
        answer_text += "\n\n📌 *Önerilen Konular:*\n" + "\n".join([f"• {opt}" for opt in options])

    # WhatsApp kullanıcısını kaydet veya bul
    wa_username = f"wa_{sender_clean}"
    user = db.query(models.User).filter(models.User.username == wa_username).first()
    if not user:
        user = models.User(
            username=wa_username,
            password_hash=get_password_hash("wa_direct_guest"),
            role="student"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Mesajı veritabanına logla
    new_log = models.MessageLog(
        user_id=user.id,
        session_id=f"wa_{sender_clean}",
        category=detected_category,
        question=incoming_text,
        answer=answer_text,
        is_unanswered=is_unanswered
    )
    db.add(new_log)
    db.commit()

    return {"reply": answer_text}


# =====================================================================
# META WHATSAPP CLOUD API ENTEGRASYONU (RESMİ & ÜCRETSİZ TEST NUMARASI)
# =====================================================================
import requests

META_WA_VERIFY_TOKEN = os.getenv("META_WA_VERIFY_TOKEN", "adiyaman_muhendislik_2026")
META_WA_TOKEN = os.getenv("META_WA_TOKEN", "")
META_WA_PHONE_ID = os.getenv("META_WA_PHONE_ID", "1278607355343552")

def get_smart_icon(text: str) -> str:
    """Metin içeriğine göre kurumsal emoji belirler."""
    t = text.lower()
    if any(k in t for k in ["sekreter", "iletisim", "dahili", "telefon", "ilet"]):
        return "📞"
    if any(k in t for k in ["oda", "kat", "bina", "nerede", "konum", "harita", "adres"]):
        return "📍"
    if any(k in t for k in ["ders", "mufredat", "program", "icerik", "akts", "kredi"]):
        return "📚"
    if any(k in t for k in ["staj", "defter", "rapor", "basvuru"]):
        return "📑"
    if any(k in t for k in ["ume", "mesleki", "intorn"]):
        return "🎓"
    if any(k in t for k in ["web", "site", "online", "link", "sayfa"]):
        return "🌐"
    if any(k in t for k in ["proje", "bitirme", "tez", "ceng40"]):
        return "💻"
    if any(k in t for k in ["cap", "cift", "yandal"]):
        return "🔄"
    if any(k in t for k in ["sinav", "vize", "final", "butunleme", "not", "harf"]):
        return "📝"
    if any(k in t for k in ["hoca", "akademik", "prof", "doc", "ogretim"]):
        return "👨‍🏫"
    return "🔹"

def format_button_title(opt: str) -> str:
    """WhatsApp Quick Reply butonu için metni max 20 karaktere ve estetik ikona sığdırır."""
    s = str(opt).strip()
    if "(" in s and ")" in s:
        s = s.split("(", 1)[0].strip()
        
    icon = ""
    # Başında emoji yoksa akıllı ikon ekle
    if not (len(s) > 0 and ord(s[0]) > 127):
        icon = get_smart_icon(s)
        
    prefix = f"{icon} " if icon else ""
    max_text_len = 20 - len(prefix)
    
    if len(s) > max_text_len:
        words = s.split()
        short_s = ""
        for w in words:
            candidate = (short_s + " " + w).strip() if short_s else w
            if len(candidate) <= max_text_len:
                short_s = candidate
            else:
                break
        s = short_s if short_s else s[:max_text_len]
        
    s = s.rstrip(" &-/,").strip()
    final_title = f"{prefix}{s}".strip()
    return final_title[:20] if final_title else "Seçenek"

def format_wa_row(opt: str, idx: int) -> dict:
    """WhatsApp Açılır Liste Menüsü (List) için ikonlu başlık (max 24) ve açıklama (max 72) üretir."""
    opt_str = str(opt).strip()
    main_title = ""
    sub_desc = ""
    
    if "(" in opt_str and ")" in opt_str:
        parts = opt_str.split("(", 1)
        main_title = parts[0].strip()
        sub_desc = parts[1].replace(")", "").strip()
    elif " & " in opt_str and len(opt_str) > 24:
        parts = opt_str.split(" & ", 1)
        main_title = parts[0].strip()
        sub_desc = parts[1].strip()
    elif " - " in opt_str and len(opt_str) > 24:
        parts = opt_str.split(" - ", 1)
        main_title = parts[0].strip()
        sub_desc = parts[1].strip()
    elif len(opt_str) > 24:
        words = opt_str.split()
        for w in words:
            candidate = (main_title + " " + w).strip() if main_title else w
            if len(candidate) <= 24:
                main_title = candidate
            else:
                sub_desc = (sub_desc + " " + w).strip() if sub_desc else w
    else:
        main_title = opt_str

    icon = ""
    if not (len(main_title) > 0 and ord(main_title[0]) > 127):
        icon = get_smart_icon(main_title)

    prefix = f"{icon} " if icon else ""
    max_text_len = 24 - len(prefix)
    clean_title = (main_title[:max_text_len].strip() if main_title else opt_str[:max_text_len].strip())
    clean_title = f"{prefix}{clean_title}".rstrip(" &-/,").strip()
    
    row = {
        "id": f"opt_{idx}",
        "title": clean_title[:24] if clean_title else f"Seçenek {idx+1}"
    }
    if sub_desc:
        row["description"] = sub_desc[:72].strip()
    return row

def format_corporate_text(raw_text: str) -> str:
    """Tekil düz metin yanıtlarını resmi üniversite kart tasarımına büründürür."""
    clean = raw_text.strip()
    if "ADIYAMAN ÜNİVERSİTESİ" in clean:
        return clean
    divider = "━━━━━━━━━━━━━━━━━━━━"
    return f"🎓 *ADIYAMAN ÜNİVERSİTESİ*\n🏛️ *Bilgisayar Mühendisliği Bölümü*\n{divider}\n\n{clean}\n\n{divider}\n⚡ _Mühendislik Fakültesi Danışman Asistanı_"

def send_meta_whatsapp_message(sender_phone: str, answer_text: str, options: list = None, detected_category: str = "Genel", media_url: str = None):
    """
    Kullanıcıya WhatsApp üzerinden şık tasarımlı mesaj gönderir:
    - 0 seçenek: Resmi çerçeveli kurumsal metin kartı
    - 1-3 seçenek: Meta Quick Reply butonları (type: button)
    - 4-10 seçenek: Meta Açılır Liste Menüsü (type: list)
    - Hata durumunda: Düz metin fallback ile kesintisiz teslimat
    """
    wa_conf = get_meta_wa_settings()
    phone_id = wa_conf.get("phone_id") or os.getenv("META_WA_PHONE_ID", META_WA_PHONE_ID)
    access_token = wa_conf.get("access_token") or os.getenv("META_WA_TOKEN", META_WA_TOKEN)
    if not phone_id or not access_token:
        safe_print("[Meta WA Uyarisi] phone_id veya access_token ayarlanmamis!")
        return

    url = f"https://graph.facebook.com/v21.0/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    clean_options = [str(o).strip() for o in (options or []) if str(o).strip()]

    # 1. Seçenek yoksa -> Şık Kurumsal Kart Metni
    if not clean_options:
        corporate_body = format_corporate_text(answer_text)
        payload = {
            "messaging_product": "whatsapp",
            "to": sender_phone,
            "type": "text",
            "text": {"body": corporate_body}
        }
        res = requests.post(url, json=payload, headers=headers, timeout=12)
        safe_print(f"[Meta WA Yanıtı - Text] Status: {res.status_code}")
        return

    # 2. Seçenek varsa -> Şık Buton (1-3) veya Liste Menüsü (4-10)
    try:
        header_text = "🎓 ADIYAMAN ÜNİVERSİTESİ"
        footer_text = "⚡ Mühendislik Fakültesi • Bilgisayar Müh."

        # Eğer ana metin WhatsApp interaktif sınırını (1024 kr) aşıyorsa metni önce ayrı gönder
        if len(answer_text) > 1000:
            requests.post(url, json={
                "messaging_product": "whatsapp",
                "to": sender_phone,
                "type": "text",
                "text": {"body": answer_text}
            }, headers=headers, timeout=12)
            interactive_body = "İlgili diğer konular veya işlemler için bir seçenek belirleyin:"
        else:
            interactive_body = answer_text

        if 1 <= len(clean_options) <= 3:
            # Quick Reply Butonları (1 - 3 adet)
            buttons = []
            for idx, opt in enumerate(clean_options[:3]):
                btn_title = format_button_title(opt)
                btn_id = f"opt_{idx}|||{opt}"[:200]
                buttons.append({
                    "type": "reply",
                    "reply": {
                        "id": btn_id,
                        "title": btn_title
                    }
                })

            # Medya/Görsel başlığı varsa ekle (kullanıcı ekran görüntüsündeki gibi görsel + buton)
            header_obj = {"type": "text", "text": header_text}
            if media_url and any(ext in media_url.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                header_obj = {"type": "image", "image": {"link": media_url}}
            elif media_url and ".pdf" in media_url.lower():
                header_obj = {"type": "document", "document": {"link": media_url, "filename": "Bilgilendirme.pdf"}}

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": sender_phone,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "header": header_obj,
                    "body": {"text": interactive_body},
                    "footer": {"text": footer_text},
                    "action": {
                        "buttons": buttons
                    }
                }
            }
        else:
            # Açılır Liste Menüsü (4 - 10 adet)
            rows = []
            for idx, opt in enumerate(clean_options[:10]):
                row_data = format_wa_row(opt, idx)
                row_data["id"] = f"opt_{idx}|||{opt}"[:200]
                rows.append(row_data)

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": sender_phone,
                "type": "interactive",
                "interactive": {
                    "type": "list",
                    "header": {"type": "text", "text": header_text},
                    "body": {"text": interactive_body},
                    "footer": {"text": footer_text},
                    "action": {
                        "button": "📋 Menüyü Aç"[:20],
                        "sections": [
                            {
                                "title": "Önerilen Konular"[:24],
                                "rows": rows
                            }
                        ]
                    }
                }
            }

        res = requests.post(url, json=payload, headers=headers, timeout=12)
        safe_print(f"[Meta WA Yanıtı - Interactive] Status: {res.status_code} | Body: {res.text}")

        # Meta API hata verirse (örneğin kural ihlali 400), anında şık metin yedeğine dön
        if res.status_code >= 400:
            safe_print("[Meta WA Fallback] İnteraktif mesaj reddedildi, şık metin formatına dönülüyor...")
            fallback_text = answer_text + "\n\n📌 *Önerilen Konular:*\n" + "\n".join([f"• {opt}" for opt in clean_options])
            fb_payload = {
                "messaging_product": "whatsapp",
                "to": sender_phone,
                "type": "text",
                "text": {"body": fallback_text}
            }
            res_fb = requests.post(url, json=fb_payload, headers=headers, timeout=12)
            safe_print(f"[Meta WA Fallback Yanıtı] Status: {res_fb.status_code}")
    except Exception as e:
        safe_print(f"[Meta WA Gönderme Hatası]: {e}")


# ─────────────────────────────────────────
# WHATSAPP GELİŞMİŞ YÖNETİM & TEST API'LERİ
# ─────────────────────────────────────────

class WhatsAppTestMessageRequest(BaseModel):
    recipient_phone: str

@app.post("/api/settings/whatsapp-meta/send-test-message", dependencies=[Depends(get_current_admin)])
def send_test_whatsapp_message_api(req: WhatsAppTestMessageRequest):
    """Admin'in belirttiği telefon numarasına Meta üzerinden interaktif test mesajı gönderir."""
    raw_phone = req.recipient_phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "").replace("+", "")
    if not raw_phone:
        raise HTTPException(status_code=400, detail="Lütfen geçerli bir telefon numarası giriniz.")
    
    # Türkiye numarası için 05xx -> 905xx düzeltmesi
    if raw_phone.startswith("05") and len(raw_phone) == 11:
        raw_phone = "9" + raw_phone
    elif len(raw_phone) == 10 and raw_phone.startswith("5"):
        raw_phone = "90" + raw_phone

    wa_conf = get_meta_wa_settings()
    phone_id = wa_conf.get("phone_id")
    access_token = wa_conf.get("access_token")
    if not phone_id or not access_token:
        raise HTTPException(status_code=400, detail="Meta Phone ID veya Access Token tanımlı değil.")

    test_text = (
        "Merhaba! 🎓 Bu Adıyaman Üniversitesi Bilgisayar Mühendisliği Asistanı canlı test mesajıdır.\n\n"
        "WhatsApp Cloud API entegrasyonunuz ve sistem bağlantınız başarıyla çalışıyor! 🚀\n\n"
        "Öğrenciler bölüm hakkında soru sorduğunda bu kurumsal tasarımda butonlu ve interaktif yanıt alacaktır."
    )
    test_options = ["CENG Stajı", "Ders Müfredatı", "Bölüm İletişim"]

    try:
        url = f"https://graph.facebook.com/v21.0/{phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        buttons = []
        for idx, opt in enumerate(test_options[:3]):
            btn_title = format_button_title(opt)
            buttons.append({
                "type": "reply",
                "reply": {
                    "id": f"test_opt_{idx}|||{opt}",
                    "title": btn_title
                }
            })
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": raw_phone,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "header": {"type": "text", "text": "🎓 ADIYAMAN ÜNİVERSİTESİ"},
                "body": {"text": test_text},
                "footer": {"text": "⚡ Mühendislik Fakültesi • Canlı Test"},
                "action": {"buttons": buttons}
            }
        }
        r = requests.post(url, json=payload, headers=headers, timeout=12)
        if r.status_code in [200, 201]:
            return {
                "status": "success",
                "message": f"+{raw_phone} numarasına interaktif test mesajı başarıyla gönderildi! Lütfen WhatsApp uygulamanızı kontrol edin.",
                "details": r.json()
            }
        else:
            err_data = r.json() if r.text else {}
            err_msg = err_data.get("error", {}).get("message", r.text)
            raise HTTPException(status_code=400, detail=f"Meta Mesaj Gönderim Hatası: {err_msg}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mesaj gönderilirken hata oluştu: {str(e)}")

@app.get("/api/whatsapp/recent-messages", dependencies=[Depends(get_current_admin)])
def get_recent_whatsapp_messages(db: Session = Depends(get_db)):
    """Son gelen WhatsApp mesajlarını (öğrenci soruları ve bot yanıtları) listeler."""
    logs = db.query(models.MessageLog).filter(
        (models.MessageLog.session_id.like("wa_%")) | (models.MessageLog.session_id.like("wa_meta_%"))
    ).order_by(models.MessageLog.created_at.desc()).limit(10).all()

    results = []
    for l in logs:
        clean_phone = l.session_id.replace("wa_meta_", "").replace("wa_", "")
        results.append({
            "id": l.id,
            "sender": clean_phone,
            "question": l.question,
            "answer": l.answer,
            "category": l.category or "Genel",
            "rating": l.rating,
            "is_unanswered": l.is_unanswered,
            "created_at": l.created_at.strftime("%d.%m.%Y %H:%M") if l.created_at else None
        })
    return {"messages": results}

class WhatsAppSimulateRequest(BaseModel):
    query: str

@app.post("/api/whatsapp/simulate", dependencies=[Depends(get_current_admin)])
def simulate_whatsapp_response(req: WhatsAppSimulateRequest, db: Session = Depends(get_db)):
    """Admin panelindeki WhatsApp simülatörü için yanıt ve butonları hesaplar."""
    incoming_text = req.query.strip()
    if not incoming_text:
        raise HTTPException(status_code=400, detail="Mesaj boş olamaz.")

    # 1. Akış Kontrolü
    flow_match = match_active_flow(incoming_text, db)
    if flow_match:
        answer_text = flow_match["text"]
        options = flow_match.get("options", [])
        detected_category = flow_match.get("category", "Akış")
        is_unanswered = check_is_unanswered(answer_text)
    else:
        # 2. RAG Motoru
        response_data = rag_engine.get_response(incoming_text)
        answer_text = response_data.get("text", "")
        options = response_data.get("options", [])
        is_unanswered = response_data.get("is_unanswered", False) or check_is_unanswered(answer_text)
        detected_category = response_data.get("category") or "Genel"

    clean_options = [str(o).strip() for o in (options or []) if str(o).strip()]
    interactive_type = "button" if (1 <= len(clean_options) <= 3) else ("list" if len(clean_options) > 3 else "text")

    return {
        "text": answer_text,
        "formatted_corporate_body": format_corporate_text(answer_text) if not clean_options else answer_text,
        "options": clean_options,
        "interactive_type": interactive_type,
        "category": detected_category,
        "is_unanswered": is_unanswered
    }


def safe_print(*args):
    msg = " ".join(str(a) for a in args)
    try:
        print(msg, flush=True)
    except Exception:
        try:
            print(msg.encode('ascii', 'ignore').decode('ascii'), flush=True)
        except Exception:
            pass

def process_meta_whatsapp_message(sender_phone: str, incoming_text: str):
    """
    WhatsApp Cloud API gelen mesajını arka planda asenkron işler.
    Webhook anında 200 OK yanıtı vererek Meta'nın 5 saniyelik zaman aşımını ve
    tekrar eden mükerrer (duplicate) mesaj göndermesini önler.
    """
    db = SessionLocal()
    try:
        safe_print(f"[Meta WA Worker] İşleniyor: {sender_phone} -> '{incoming_text}'")

        # 1. Akış Kontrolü
        flow_match = match_active_flow(incoming_text, db)
        flow_media_url = None
        if flow_match:
            answer_text = flow_match["text"]
            options = flow_match.get("options", [])
            detected_category = flow_match.get("category", "Akış")
            flow_media_url = flow_match.get("media_url")
            is_unanswered = check_is_unanswered(answer_text)
        else:
            # 2. RAG Motoru (Öğrencinin son konuşma geçmişini oturum hafızasına ekle)
            recent_logs = db.query(models.MessageLog).filter(
                models.MessageLog.session_id == f"wa_meta_{sender_phone}"
            ).order_by(models.MessageLog.created_at.desc()).limit(3).all()

            history = []
            for l in reversed(recent_logs):
                history.append({"role": "user", "content": l.question})
                history.append({"role": "assistant", "content": l.answer})

            response_data = rag_engine.get_response(incoming_text, history=history)
            answer_text = response_data.get("text", "")
            options = response_data.get("options", [])
            is_unanswered = response_data.get("is_unanswered", False) or check_is_unanswered(answer_text)
            detected_category = response_data.get("category") or "Genel"

        # Veritabanına kaydet
        wa_username = f"wa_meta_{sender_phone}"
        user = db.query(models.User).filter(models.User.username == wa_username).first()
        if not user:
            user = models.User(
                username=wa_username,
                password_hash=get_password_hash("meta_wa_guest"),
                role="student"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        log_answer_text = answer_text
        if options:
            log_answer_text += "\n\n📌 Önerilen Konular:\n" + "\n".join([f"• {opt}" for opt in options])

        new_log = models.MessageLog(
            user_id=user.id,
            session_id=f"wa_meta_{sender_phone}",
            category=detected_category,
            question=incoming_text,
            answer=log_answer_text,
            is_unanswered=is_unanswered
        )
        db.add(new_log)
        db.commit()

        # Meta Graph API üzerinden kullanıcıya butonlu / menülü şık mesaj gönder
        send_meta_whatsapp_message(sender_phone, answer_text, options, detected_category, media_url=flow_media_url)
    except Exception as e:
        safe_print(f"[Meta WA Arka Plan Hatası]: {e}")
    finally:
        db.close()

@app.get("/api/whatsapp/meta")
@app.get("/api/meta-whatsapp")
@app.get("/webhook/whatsapp/meta")
async def meta_whatsapp_verify(request: Request):
    """Meta WhatsApp Cloud API Webhook doğrulama endpoint'i."""
    params = request.query_params
    mode = params.get("hub.mode") or params.get("hub_mode")
    verify_token = params.get("hub.verify_token") or params.get("hub_verify_token")
    challenge = params.get("hub.challenge") or params.get("hub_challenge")

    wa_conf = get_meta_wa_settings()
    valid_tokens = {
        wa_conf.get("verify_token", "").strip(),
        os.getenv("META_WA_VERIFY_TOKEN", "").strip(),
        "adiyaman_muhendislik_2026",
        "adiyaman_ceng_bot_verify_token_2026"
    }
    valid_tokens.discard("")

    safe_print(f"[META VERIFY] Mode: {mode} | Token: {verify_token} | Challenge: {challenge}")

    if mode == "subscribe" and (verify_token in valid_tokens or not verify_token):
        return Response(content=str(challenge if challenge else "OK"), media_type="text/plain")
    
    # Esnek kabul: Token doluysa ve mod subscribe ise onay ver
    if mode == "subscribe":
        return Response(content=str(challenge if challenge else "OK"), media_type="text/plain")

    raise HTTPException(status_code=403, detail="Verification token mismatch")

@app.post("/api/whatsapp/meta")
@app.post("/api/meta-whatsapp")
@app.post("/webhook/whatsapp/meta")
async def meta_whatsapp_handler(req_body: dict, background_tasks: BackgroundTasks):
    """
    Meta WhatsApp Cloud API'den gelen mesajları yakalar,
    Hemen 200 OK döner ve arka planda yanıt üretip gönderir.
    """
    try:
        entry = req_body.get("entry", [])
        if not entry:
            return {"status": "no_entry"}
        changes = entry[0].get("changes", [])
        if not changes:
            return {"status": "no_changes"}
        value = changes[0].get("value", {})
        messages = value.get("messages", [])
        if not messages:
            return {"status": "no_messages"} # Okundu veya teslimat bildirimi

        message_item = messages[0]
        msg_type = message_item.get("type")
        sender_phone = message_item.get("from")
        
        incoming_text = ""
        if msg_type == "text":
            incoming_text = message_item.get("text", {}).get("body", "").strip()
        elif msg_type == "interactive":
            interactive_obj = message_item.get("interactive", {})
            reply_obj = interactive_obj.get("button_reply") or interactive_obj.get("list_reply") or {}
            reply_id = reply_obj.get("id", "")
            reply_title = reply_obj.get("title", "")
            
            # Eğer id içinde tam seçenek metni saklandıysa (opt_idx|||Orijinal Metin), onu kullan
            if "|||" in reply_id:
                incoming_text = reply_id.split("|||", 1)[1].strip()
            else:
                incoming_text = reply_title.strip()

        if not incoming_text:
            return {"status": "empty_or_unsupported_message"}

        safe_print(f"[Meta WhatsApp Alındı -> Arka Plana Devredildi] Gönderen: {sender_phone} | Mesaj: {incoming_text}")

        # WhatsApp 5 saniye zaman aşımını engellemek için arka plana devret
        background_tasks.add_task(process_meta_whatsapp_message, sender_phone, incoming_text)

        return {"status": "queued"}
    except Exception as e:
        safe_print("Meta webhook hatası:", str(e))
        return {"status": "error", "message": str(e)}








