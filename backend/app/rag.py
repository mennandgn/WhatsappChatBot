import os
import json
from dotenv import load_dotenv
from typing import List, Optional
from pydantic import BaseModel, Field

# Google GenAI kütüphaneleri
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

load_dotenv()

FAISS_DIR = "faiss_index"
API_KEY = os.getenv("GOOGLE_API_KEY")

import json

def get_system_settings():
    default_settings = {
        "bot_name": "Bilgisayar Mühendisliği Asistanı",
        "department_name": "Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü",
        "bot_tone": "resmi", # resmi, samimi
        "welcome_message": "Merhaba! Adıyaman Üniversitesi Bilgisayar Mühendisliği Bölümü resmi asistanına hoş geldiniz. 💻 CENG dersleri, yazılım/donanım stajı, bitirme projeleri ve bölüm idari süreçleri hakkında size nasıl yardımcı olabilirim?",
        "whatsapp_number": "15551662647"
    }
    try:
        from app.database import SessionLocal
        from app.models import SystemSetting
        db = SessionLocal()
        try:
            record = db.query(SystemSetting).filter(SystemSetting.key == "bot_settings").first()
            if record and record.value:
                return {**default_settings, **record.value}
        finally:
            db.close()
    except Exception:
        pass

    path = "data/settings.json"
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return {**default_settings, **json.load(f)}
        except:
            pass
    return default_settings

def check_guardrails(query: str):
    try:
        from app.database import SessionLocal
        from app.models import SystemSetting
        db = SessionLocal()
        try:
            record = db.query(SystemSetting).filter(SystemSetting.key == "guardrails").first()
            if record and record.value:
                keywords = record.value.get("banned_keywords", [])
                q_lower = query.lower()
                for kw in keywords:
                    if kw.strip() and kw.strip().lower() in q_lower:
                        return True, record.value.get("rejection_message", "Bu platform yalnızca fakülte akademik ve idari işlemlerine hizmet vermektedir.")
        finally:
            db.close()
    except Exception:
        pass

    path = "data/guardrails.json"
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                keywords = data.get("banned_keywords", [])
                q_lower = query.lower()
                for kw in keywords:
                    if kw.strip() and kw.strip().lower() in q_lower:
                        return True, data.get("rejection_message", "Bu platform yalnızca fakülte akademik ve idari işlemlerine hizmet vermektedir.")
        except:
            pass
    return False, ""

class ChatOutput(BaseModel):
    text: str = Field(description="Kullanıcıya gösterilecek asıl cevap metni")
    options: List[str] = Field(description="Kullanıcının seçebileceği önerilen butonlar, yoksa boş liste")

class FacultyRAG:
    def __init__(self):
        self.is_simulation = not API_KEY or API_KEY.strip() == ""
        self.db = None
        self.llm = None
        self.parser = None
        
        if not self.is_simulation:
            # Google Gemini Embeddings (Ücretsiz)
            self.embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2")
            
            if os.path.exists(FAISS_DIR):
                self.db = FAISS.load_local(FAISS_DIR, self.embeddings, allow_dangerous_deserialization=True)
            
            # Google Gemini (Google'ın önerdiği en güncel model)
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-3.6-flash",
                timeout=10.0,
                max_retries=1
            )
            self.parser = JsonOutputParser(pydantic_object=ChatOutput)
            
            settings = get_system_settings()
            tone_rule = "Resmi, akademik ve nazik bir üslup kullan." if settings.get("bot_tone") == "resmi" else "Samimi, yardımsever ve genç bir rehber öğrenci gibi konuş."

            # Sistem Kimliği ve Kuralları (Kullanıcı Veri Setine Özel)
            self.prompt = ChatPromptTemplate.from_messages([
                ("system", f"""SENİN KİMLİĞİN VE ROLÜN:
Sen {settings.get('department_name', 'Adıyaman Üniversitesi Mühendislik Fakültesi')} resmi "Yapay Zeka Asistanı"sın. Görevin, öğrencilere ders kayıtları, sınav yönetmelikleri, staj işlemleri, mezuniyet şartları ve kampüs yaşamı hakkında hızlı, doğru ve empatik bilgiler vermektir. Bir bilgisayar mühendisi tarafından geliştirildin.

ÜSLUP VE TON:
- Bir WhatsApp sohbet botu gibi kısa, net ve anlaşılır konuş. Uzun ve sıkıcı paragraflardan kaçın.
- Öğrencilerle samimi, yardımsever ama profesyonel bir dille ("sen" diliyle) konuş.
- Gerekli yerlerde hafif ve samimi emojiler (🎓, 📝, ⚙️, 😊) kullan.
- Öğrenciler stresli veya yorgun olduğunda (örneğin vizelerden şikayet ettiklerinde) onlara moral ver.

ÇALIŞMA KURALLARI (ÇOK ÖNEMLİ):
1. RAG SİSTEMİ (BAĞLAM KULLANIMI): Öğrencinin sorusunu SADECE sana verilen BAĞLAM (CONTEXT) ve GEÇMİŞ KONUŞMALARDAKİ bilgilere dayanarak yanıtla.
2. BİLGİ UYDURMAMA (SIFIR HALÜSİNASYON): Eğer sorunun cevabı sana gönderilen bağlamda YOKSA, kesinlikle internetten bilgi çekmeye çalışma veya tahminde bulunma. Şuna benzer bir cevap ver: "Bu konuda sistemimde kesin bir bilgi bulunmuyor. Yanlış yönlendirmemek adına bu konuyu bölüm sekreterliğine veya danışman hocana sormanı tavsiye ederim."
3. KAPSAM DIŞI İŞLEMLER: Senin görevin idari ve akademik süreçlerdir. Öğrenciler senden kod yazmanı (Python, C++ vb.), matematik veya fizik ödevlerini çözmeni, makale yazmanı isterse bunu KESİNLİKLE reddet: "Ben bir akademik asistanım, kod yazma veya ödev çözme gibi işlemlere yardımcı olamam."
4. GÜNDELİK SOHBET: Öğrenciler "Nasılsın?", "Adın ne?", "Ne yapıyorsun?" gibi gündelik sohbet başlatırsa, karakterine uygun, esprili ve samimi cevaplar ver, ardından konuyu okul süreçlerine bağla."""),
                ("human", "BAĞLAM: {context}\n\nGEÇMİŞ KONUŞMALAR: {history}\n\nKULLANICI SORUSU: {question}\n\nÇıktını MUTLAKA aşağıdaki JSON formatında vermelisin.\nFormat: {format_instructions}")
            ])

    def get_response(self, query: str, history: Optional[list] = None) -> dict:
        if history is None:
            history = []

        # 0. Hızlı Selamlama Kontrolü (LLM ve Vektör aramasına hiç girmeden 1 milisaniyede yanıt ver)
        clean_q = query.strip().lower()
        greetings = ["merhaba", "selam", "selamlar", "merhabalar", "iyi günler", "günaydın", "iyi akşamlar", "hey", "sa", "as"]
        if clean_q in greetings:
            settings = get_system_settings()
            return {
                "text": settings.get("welcome_message", "Merhaba! Size nasıl yardımcı olabilirim?"),
                "options": ["Ders Programı", "Staj Takvimi", "Sınav Yönetmeliği"]
            }

        # 1. Guardrail / Yasaklı Kelime Kontrolü
        is_blocked, reject_msg = check_guardrails(query)
        if is_blocked:
            return {
                "text": reject_msg,
                "options": ["Ders Kayıtları", "Staj Takvimi", "Sınavlar"]
            }
            
        if self.is_simulation:
            return self._simulate_answer(query, history)
            
        if not self.db:
            return {
                "text": "Sistemde vektör DB yok. Lütfen ingest.py scriptini çalıştırın.",
                "options": ["Başa Dön"]
            }

        docs = self.db.similarity_search(query, k=3)
        context = "\n".join([doc.page_content for doc in docs])
        
        # Geçmişi okunabilir bir formata çevir (Son 5 mesajı alarak hafızayı koru)
        recent_history = history[-5:] if len(history) > 5 else history
        formatted_history = "\n".join([f"{msg['role']}: {msg['content']}" for msg in recent_history])
        
        chain = self.prompt | self.llm | self.parser
        
        try:
            return chain.invoke({
                "context": context,
                "history": formatted_history,
                "question": query,
                "format_instructions": self.parser.get_format_instructions()
            })
        except Exception as e:
            print("Yapay Zeka API Uyarısı / Kota Aşımı:", e)
            # Gemini kota dolduysa veya hata verdiyse anında yerel kural motoruna dön (Bekleme yapmaz)
            sim_res = self._simulate_answer(query, history)
            return sim_res

    def test_query_with_sources(self, query: str) -> dict:
        """Admin Playground için hem cevabı hem de kullanılan kaynak parçacıklarını döner."""
        is_blocked, reject_msg = check_guardrails(query)
        if is_blocked:
            return {
                "answer": reject_msg,
                "sources": []
            }
            
        if not self.db:
            return {
                "answer": "Vektör veritabanı boş.",
                "sources": []
            }

        docs = self.db.similarity_search(query, k=3)
        context = "\n".join([doc.page_content for doc in docs])
        chain = self.prompt | self.llm | self.parser
        
        try:
            res = chain.invoke({
                "context": context,
                "history": "",
                "question": query,
                "format_instructions": self.parser.get_format_instructions()
            })
            sources = [{"content": doc.page_content[:300] + "...", "source": doc.metadata.get("source", "Belge")} for doc in docs]
            return {
                "answer": res.get("text", ""),
                "sources": sources
            }
        except Exception as e:
            return {
                "answer": f"Hata: {str(e)}",
                "sources": []
            }

    def _simulate_answer(self, query: str, history: list) -> dict:
        q = query.lower()
        
        # Hafıza simülasyonu: Eğer soru sadece "kim?" veya "detay ver" gibi eksikse geçmişe bak
        is_followup = len(q.split()) < 3
        if is_followup and len(history) > 0:
            last_msg = history[-1]['content'].lower()
            if "staj" in last_msg:
                return {"text": "Staj komisyonuyla ilgili detayları sekreterlikten alabilirsiniz.", "options": ["Formlar", "Başa Dön"]}
            elif "yaz okul" in last_msg:
                return {"text": "Yaz okulu koordinatörü Dr. Ahmet Yılmaz'dır.", "options": ["İletişim", "Başa Dön"]}
        
        # Kullanıcı Veri Setine Dayalı Akıllı Yerel Eşleşmeler (Ultra Hızlı & Kota Bağımsız)
        if "staj" in q:
            if "kaç" in q or "gun" in q or "gün" in q or "sure" in q or "süre" in q:
                return {"text": "Mühendislik fakültesinde zorunlu staj süresi toplam 40 iş günüdür (genelde 20 gün donanım, 20 gün yazılım). 🛠️", "options": ["Staj Evrakları", "1. Sınıfta Staj Yapılır mı?"]}
            if "1" in q or "birinci" in q:
                return {"text": "Hayır, 1. sınıfın sonunda zorunlu staj yapılamaz. Temel mesleki bilgi gerektiğinden en erken 2. sınıfın sonunda başlanabilir.", "options": ["Zorunlu Staj Kaç Gün?", "Yaz Okulunda Staj"]}
            if "sigorta" in q:
                return {"text": "Zorunlu staj süresince 'İş Kazası ve Meslek Hastalığı' sigorta priminiz Adıyaman Üniversitesi tarafından ödenir. 🏛️", "options": ["Staj Evrakları", "Cumartesi Sayılır mı?"]}
            if "cumartesi" in q:
                return {"text": "Evet, staj yaptığın kurum Cumartesi günleri de çalışıyorsa ve belgelersen Cumartesi de staj iş gününden sayılır.", "options": ["Staj Kaç Gün?", "Defter Kime İmzalatılır?"]}
            if "defter" in q or "imza" in q:
                return {"text": "Staj defterindeki ilgili kısımlar, staj yaptığınız kurumdaki yetkili mühendis tarafından kaşelenip imzalanmalıdır.", "options": ["Staj Kaç Gün?", "Teslim Süresi"]}
            return {"text": "Zorunlu Staj: Toplam 40 iş günüdür. Takip eden yarıyılın ilk 4 haftası içinde defter teslim edilmelidir.", "options": ["Staj Kaç Gün?", "Sigorta", "1. Sınıfta Staj"]}

        if "çap" in q or "cift anadal" in q or "çift anadal" in q:
            return {"text": "ÇAP'a başvurmak için sınıfının başarı sıralamasında ilk %20'lik dilimde olman ve AGNO'nun en az 3.00 olması gerekir. 🎓", "options": ["Yandal Şartları", "Başarılı Öğrenci Üstten Ders"]}

        if "yandal" in q:
            return {"text": "Yandal programına başvurmak için AGNO'nun en az 2.50 olması ve alttan başarısız ders bulunmaması gerekir.", "options": ["ÇAP Şartları", "Ders Kayıtları"]}

        if "üstten" in q or "ustten" in q:
            if "1.7" in q or "1.8" in q or "düşük" in q or "kaldım" in q:
                return {"text": "AGNO'su 1.80'in altında olan öğrenciler üst yarıyıllardan yeni ders alamazlar. Öncelikle alt dönem derslerini almalısın.", "options": ["Ders Kayıtları", "Kayıt Dondurma"]}
            return {"text": "AGNO'su 3.00 ve üzeri olan öğrenciler, alttan başarısız dersi olmamak şartıyla danışman onayıyla üstten en fazla 2 ders alabilir.", "options": ["Ders Kayıtları", "ÇAP Şartları"]}

        if "tek ders" in q:
            return {"text": "Mezuniyeti için sadece tek bir başarısız (FF/FD) dersi kalan öğrencilere tek ders sınav hakkı verilir. Devamsızlıktan (DZ) kalanlar giremez.", "options": ["Mezuniyet Şartları", "Bütünleme"]}

        if "onur" in q:
            return {"text": "Disiplin cezası almamak kaydıyla; mezuniyet AGNO'su 3.00-3.49 arası olanlar 'Onur', 3.50-4.00 arası olanlar 'Yüksek Onur' öğrencisi olur. 🏅", "options": ["Mezuniyet Şartları", "Ders Seçimi"]}

        if "kayıt" in q or "dondur" in q:
            return {"text": "Kayıt Dondurma: Sağlık veya mazeret belgesiyle dönemin ilk 2 haftasında dilekçe verilmelidir. En fazla 2 yarıyıl dondurulabilir.", "options": ["Ders Kayıtları", "Harç Ödenir mi?"]}

        if "yaz okul" in q:
            return {"text": "Yaz Okulu: En fazla 3 ders veya 16 AKTS alınabilir. Üniversitemizde açılmayan ders taban puanı eşit/yüksek başka okuldan onay ile alınabilir.", "options": ["Yaz Okulunda Kaç Ders?", "Başka Okuldan Ders Alma"]}

        if "devamsız" in q or "dz" in q or "devam" in q:
            return {"text": "Derse devam zorunluluğu teorik derslerde en az %70, laboratuvar/uygulamalarda en az %80'dir. Devamsızlıktan kalınan ders (DZ) tekrar alınmak zorundadır.", "options": ["Sınav Mazereti", "Ders Kaydı"]}

        if "bütünleme" in q or "but" in q:
            return {"text": "Finalde başarısız olanlar (FF/FD) veya not yükseltmek isteyenler (DD/DC) bütünlemeye girebilir. Bütünleme notu finalin yerine geçer.", "options": ["Mazeret Sınavı", "Not İtirazı"]}

        if "harç" in q or "harc" in q or "ücret" in q:
            return {"text": "İkinci öğretim öğrenim ücretleri kayıt haftasında anlaşmalı bankalara öğrenci numarasıyla yatırılır. Yatırmayanların ders kaydı onaylanmaz.", "options": ["Ders Kayıtları", "Yaz Okulu Ücreti"]}

        if "erasmus" in q or "farabi" in q or "mevlana" in q:
            return {"text": "Değişim Programları: Erasmus için AGNO en az 2.20, Farabi için en az 2.00 olmalıdır. Protokoldeki dersler döndüğünüzde intibak ettirilir.", "options": ["Erasmus Şartları", "Farabi Şartları"]}

        if "kod" in q or "python" in q or "c++" in q:
            return {"text": "Ben Adıyaman Üniversitesi akademik ve idari asistanıyım. Kod yazma veya ödev çözme konuları kapsamım dışındadır; ancak ders ve staj kurallarında sana seve seve yardımcı olurum! 😊", "options": ["Staj Kuralları", "Ders Kayıtları"]}

        return {
            "text": "Bu konuda sistemimde kesin bir bilgi bulunmuyor. Yanlış yönlendirmemek adına bölüm sekreterliğine veya danışman hocana danışmanı öneririm. 🏛️",
            "options": ["Ders Kayıtları", "Staj Takvimi", "Sınavlar"],
            "is_unanswered": True
        }

rag_engine = FacultyRAG()
