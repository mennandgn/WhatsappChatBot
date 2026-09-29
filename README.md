# 🤖 WhatsappChatBot - Yapay Zeka Destekli Üniversite & Bölüm Danışmanı

<p align="center">
  <img src="frontend/src/assets/hero.png" alt="WhatsappChatBot Logo" width="180" style="border-radius: 20px;" />
</p>

<p align="center">
  <b>RAG (Retrieval-Augmented Generation), Google Gemini, Meta WhatsApp Cloud API ve Görsel Akış Tasarımcısı (React Flow) ile güçlendirilmiş kurumsal akademik asistan ve sohbet platformu.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Google_Gemini-8E75C2?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/WhatsApp_Cloud_API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp Cloud API" />
  <img src="https://img.shields.io/badge/FAISS_Vector_DB-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" alt="FAISS" />
</p>

---

## 📌 Proje Hakkında

**WhatsappChatBot**, üniversiteler, mühendislik fakülteleri ve kurumlar için geliştirilmiş uçtan uca bir yapay zeka danışmanlık çözümüdür. 

Öğrenciler ve kullanıcılar hem **Web Sohbet Arayüzü** üzerinden hem de doğrudan **WhatsApp** üzerinden staj süreçleri, ders müfredatları, yönetmelikler, sınav takvimleri ve idari süreçler hakkında 7/24 anında doğru, resmi ve doğrulanmış bilgi alabilirler.

### 🌟 Temel Avantajlar
- **Sıfır Halüsinasyon (Zero Hallucination RAG):** Yapay zeka kafasına göre bilgi uydurmaz; yalnızca kurumsal veri tabanındaki ve PDF mevzuatlardaki doğrulanmış verileri kaynak göstererek yanıtlar.
- **Resmi Meta WhatsApp Cloud API Entegrasyonu:** Herhangi bir 3. parti güvensiz QR kod kütüphanesi olmadan, doğrudan resmi Meta WhatsApp Business altyapısıyla çalışır.
- **Dahili 1-Tıkla Cloudflare Tunnel:** Statik IP veya port açmaya gerek duymadan, Admin panelinden tek tıkla yerel sunucunuzu Meta'nın erişebileceği güvenli bir HTTPS tüneline bağlar.
- **Görsel Akış Tasarımcısı (Visual Flow Builder):** Kod yazmadan, sürükle-bırak yöntemiyle interaktif butonlu sohbet senaryoları ve ağaçları oluşturmanıza imkan tanır.
- **Kapsamlı Yönetim (Admin) Paneli:** Memnuniyet analizleri, canlı sohbet günlükleri, cevapsız kalan soruların tespiti, canlı duyuru bandı ve güvenlik filtreleri (Guardrails) tek çatı altındadır.

---

## ✨ Öne Çıkan Özellikler

| Modül | Özellikler & Yetenekler |
| :--- | :--- |
| 🎓 **Öğrenci Web Sohbeti** | Modern arayüz, hızlı SSS butonları, geri bildirim oylaması (👍 / 👎), duyuru bandı ve markdown destekli cevaplar. |
| 📱 **WhatsApp Entegrasyonu** | Resmi Meta Cloud API, etkileşimli butonlar, canlı mesaj akışı, doğrudan telefon test mesajı gönderici ve web simülatörü. |
| 🧠 **RAG & Vektör Bilgi Bankası** | PDF/Metin yükleme, FAISS vektör araması, Google Gemini LLM ve anlık yeniden indeksleme. |
| 🗺️ **Visual Flow Builder** | React Flow ile sürükle-bırak akış tasarımı, dinamik buton bağlama, anında dışa/içe aktarma. |
| 📊 **Admin Analitiği & Günlükler** | Soru-cevap geçmişi, arama ve filtreleme, Excel (CSV) dışa aktarma, kategori bazlı soru dağılımları. |
| ❓ **Cevapsız Sorular Havuzu** | Yapay zekanın yanıt veremediği soruları listeleme ve tek tıkla sisteme kural olarak öğreterek bilgi bankasına ekleme. |
| 📢 **Canlı Duyuru Sistemi** | Geri sayım sayaçlı, ileri tarihli zamanlanabilir veya süresiz fakülte duyuru bandı. |
| 🛡️ **Güvenlik & Guardrails** | Yasaklı kelime filtreleri, konu dışı engelleyiciler, JWT tabanlı kimlik doğrulama, bcrypt şifreleme. |

---

## 📁 Dizin ve Klasör Yapısı

```
WhatsappChatBot/
├── README.md                      # Proje ana tanıtım ve dokümantasyon dosyası
├── .gitignore                     # Git tarafından yok sayılacak dosyalar
├── setup.bat                      # Windows için tek tıkla otomatik kurulum sihirbazı
├── baslat.bat                     # Windows için tek tıkla sistemi başlatan script
├── docker-compose.yml             # Opsiyonel PostgreSQL container yapılandırması
│
├── backend/                       # Python & FastAPI Arka Uç Sunucusu
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI yönlendiricileri, WhatsApp Webhook, Admin & Öğrenci API'leri
│   │   ├── database.py            # SQLite ve PostgreSQL çift destekli veritabanı bağlantısı
│   │   ├── models.py              # SQLAlchemy veritabanı tabloları (User, MessageLog, Flow vb.)
│   │   ├── auth.py                # JWT Token üretimi ve Bcrypt şifreleme
│   │   ├── rag.py                 # RAG ve Google Gemini motoru
│   │   ├── tunnel.py              # Cloudflare Tünel yönetimi ve otomatik URL algılama
│   │   └── config.py              # Pydantic uygulama ayarları
│   ├── data/                      # Kurumsal bilgi rehberleri, ayarlar ve SSS şablonları
│   │   ├── ceng_bilgisayar_muhendisligi_rehberi.txt
│   │   ├── settings.json
│   │   ├── faqs.json
│   │   └── announcement.json
│   ├── ingest.py                  # Belgeleri FAISS vektör veritabanına indeksleme betiği
│   ├── seed.py                    # Tabloları oluşturan ve varsayılan kullanıcıları ekleyen betik
│   ├── seed_master_flow.py        # Örnek interaktif görsel akışı veritabanına ekleyen betik
│   ├── requirements.txt           # Python kütüphane bağımlılıkları
│   ├── .env.example               # Örnek ortam değişkenleri şablonu
│   └── .gitignore
│
└── frontend/                      # React, Vite, Tailwind CSS & TypeScript Arayüzü
    ├── public/                    # Statik simgeler ve favicon
    ├── src/
    │   ├── assets/                # Logo ve görseller
    │   ├── pages/                 # Sayfa bileşenleri (Admin.tsx, Chat.tsx, FlowBuilder.tsx, Login.tsx)
    │   ├── App.tsx                # Ana yönlendirme ve router yapısı
    │   ├── main.tsx               # React başlangıç noktası
    │   └── index.css              # Tailwind CSS stilleri
    ├── package.json               # Frontend bağımlılıkları (Lucide, React Flow, Framer Motion vb.)
    ├── vite.config.ts             # Vite yapılandırması ve API proxy ayarları
    ├── tailwind.config.js         # Tailwind yapılandırması
    ├── .env.example
    └── .gitignore
```

---

## 🗄️ Veritabanı Mimarisi

Proje hem **SQLite** (sıfır kurulum ile anında test için) hem de **PostgreSQL** (üretim ortamları için) destekler. `backend/.env` içindeki `DATABASE_URL` değerini değiştirmeniz yeterlidir.

### Tablo Şeması

```mermaid
erDiagram
    USERS ||--o{ MESSAGE_LOGS : "sordu"
    USERS {
        int id PK
        string username UK
        string password_hash
        string role "admin | student"
    }
    MESSAGE_LOGS {
        int id PK
        int user_id FK
        string session_id
        string category
        text question
        text answer
        int rating "1: Beğendi, -1: Beğenmedi, 0: Oylanmadı"
        boolean is_unanswered
        datetime created_at
    }
    CHAT_FLOWS {
        int id PK
        string name
        text description
        json nodes "React Flow düğümleri"
        json edges "React Flow bağlantıları"
        boolean is_active
        datetime created_at
    }
    SYSTEM_SETTINGS {
        int id PK
        string key UK
        json value
        datetime updated_at
    }
    FAQ_ITEMS {
        int id PK
        string topic
        string category
        int order
        datetime created_at
    }
    ANNOUNCEMENTS {
        int id PK
        text text
        boolean is_active
        string starts_at
        string expires_at
        datetime created_at
    }
```

---

## 🚀 Hızlı Başlangıç & Kurulum

### 1. Sistem Gereksinimleri
- **Python:** 3.10 veya üzeri ([İndir](https://www.python.org/))
- **Node.js & npm:** Node.js v18 veya üzeri ([İndir](https://nodejs.org/))
- **Google Gemini API Key:** [Google AI Studio](https://aistudio.google.com/) üzerinden ücretsiz oluşturulabilir.

---

### Yöntem A: Windows Tek Tıkla Otomatik Kurulum (En Kolayı)

1. Depoyu bilgisayarınıza indirin veya klonlayın:
   ```bash
   git clone https://github.com/kullanici_adi/WhatsappChatBot.git
   cd WhatsappChatBot
   ```
2. **`setup.bat`** dosyasını çift tıklayarak çalıştırın.
   - Bu script sanal ortamı kurar, Python paketlerini yükler, veritabanını oluşturur ve React bağımlılıklarını tamamlar.
3. Kurulum bittikten sonra `backend\.env` dosyasını açıp **`GOOGLE_API_KEY`** bilginizi yapıştırın.
4. **`baslat.bat`** dosyasını çift tıklayarak sistemi başlatın. Sistem otomatik olarak tarayıcınızda açılacaktır!

---

### Yöntem B: Manuel Kurulum (Linux, macOS, Windows)

#### 1. Backend Kurulumu
```bash
# Backend klasörüne geçin
cd backend

# Sanal ortam oluşturun ve aktif edin
python -m venv venv

# Windows için:
venv\Scripts\activate
# Linux/macOS için:
source venv/bin/activate

# Paketleri yükleyin
pip install -r requirements.txt

# .env dosyasını oluşturun
copy .env.example .env    # Windows
cp .env.example .env      # Linux/macOS

# .env dosyasını bir metin düzenleyiciyle açıp GOOGLE_API_KEY anahtarınızı ekleyin.

# Veritabanını ve başlangıç verilerini yükleyin
python seed.py
python seed_master_flow.py

# Belgeleri FAISS vektör veritabanına indeksleyin (Opsiyonel)
python ingest.py

# Backend sunucusunu başlatın
uvicorn app.main:app --reload --port 8000
```
Backend API dökümantasyonuna [http://localhost:8000/docs](http://localhost:8000/docs) adresinden erişebilirsiniz.

#### 2. Frontend Kurulumu
Yeni bir terminal penceresi açın:
```bash
# Frontend klasörüne geçin
cd frontend

# Paketleri yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
```
Arayüze [http://localhost:5173](http://localhost:5173) adresinden erişebilirsiniz.

---

## 🔑 Varsayılan Giriş Bilgileri

Sistem ilk kurulduğunda aşağıdaki hesaplar otomatik olarak oluşturulur:

| Rol | Kullanıcı Adı | Şifre | Giriş Sayfası |
| :--- | :--- | :--- | :--- |
| **Yönetici (Admin)** | `admin` | `12345` | `/login` -> Yönetici Seçimi |
| **Öğrenci (Student)**| `ogrenci` | `12345` | `/login` -> Öğrenci Seçimi |

> **Güvenlik Notu:** Canlı ortama almadan önce yönetici şifrenizi admin paneli üzerinden veya `backend/seed.py` dosyasından değiştiriniz.

---

## 📱 Meta WhatsApp Cloud API Entegrasyon Rehberi

Botu WhatsApp üzerinden çalıştırmak için şu adımları izleyin:

1. **Meta Developer Hesabı:** [developers.facebook.com](https://developers.facebook.com/) adresine gidin ve bir uygulama oluşturun (Uygulama türü: **Other** / **Business**).
2. Uygulama panelinden **WhatsApp** ürününü ekleyin.
3. **API Setup** sekmesinden:
   - **Phone Number ID** değerini kopyalayın.
   - Geçici veya sistem kullanıcısı **Access Token** değerini kopyalayın.
4. **Cloudflare Tunnel Başlatma (1-Tıkla):**
   - Projenin Admin Paneline gidin (`/admin` -> **WhatsApp Entegrasyonu** sekmesi).
   - `cloudflared.exe` ikilisini proje köküne yerleştirdiğinizde panelden tek tıkla **"Tüneli Başlat"** butonuna basabilirsiniz.
   - Sistem size `https://xxxx.trycloudflare.com/webhook/whatsapp/meta` şeklinde genel bir URL üretecektir.
5. **Meta Paneline Webhook Kaydı:**
   - Meta WhatsApp Yapılandırma sayfasında **Webhook** bölümüne gelin.
   - **Callback URL:** Paneldeki tünel URL'sini yapıştırın.
   - **Verify Token:** `backend/.env` içindeki `META_WA_VERIFY_TOKEN` (Örn: `whatsapp_bot_verify_token_2026`).
   - **Doğrula ve Kaydet** butonuna basın.
   - Webhook alanlarından **`messages`** seçeneğini `Subscribe` (Abone ol) olarak işaretleyin.
6. Artık WhatsApp test numaranıza mesaj attığınızda bot anında cevap verecektir!

---

## ⚙️ Ortam Değişkenleri Rehberi (`backend/.env`)

```ini
# Uygulama Ayarları
APP_ENV=development
APP_PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Güvenlik Anahtarı (JWT)
SECRET_KEY=super_secret_jwt_key_degistirin_2026

# Veritabanı (SQLite varsayılandır)
DATABASE_URL=sqlite:///./muhendislik_bot.db
# PostgreSQL için:
# DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/muhendislik_bot

# Google Gemini Yapay Zeka Anahtarı
GOOGLE_API_KEY=AIzaSy...

# Meta WhatsApp Cloud API
META_WA_VERIFY_TOKEN=whatsapp_bot_verify_token_2026
META_WA_TOKEN=EAAPv...
META_WA_PHONE_ID=123456789012345
```

---

## 🛠️ Kullanılan Teknolojiler

- **Backend:** Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Pydantic v2
- **Yapay Zeka & RAG:** Google Gemini 2.0 / 3.0 Flash, LangChain, FAISS Vector Store, Google Generative AI Embeddings
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion, React Flow
- **Mesajlaşma:** Meta WhatsApp Business Cloud API, Webhooks, Cloudflare Tunnel

---

## 🤝 Katkıda Bulunma (Contributing)

Katkı sağlamak isterseniz çok memnun oluruz!
1. Bu depoyu Fork'layın (`fork`).
2. Yeni bir özellik dalı açın (`git checkout -b feature/YeniOzellik`).
3. Değişikliklerinizi commit'leyin (`git commit -m 'Yeni özellik eklendi'`).
4. Dalınıza push yapın (`git push origin feature/YeniOzellik`).
5. Bir **Pull Request** açın.

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında açık kaynak olarak paylaşılmıştır. Dilediğiniz gibi geliştirebilir, ticari veya akademik projelerinizde kullanabilirsiniz.
