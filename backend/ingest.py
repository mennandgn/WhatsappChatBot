import os
import shutil
from dotenv import load_dotenv
from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Gemini Embeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
FAISS_DIR = "faiss_index"
API_KEY = os.getenv("GOOGLE_API_KEY")

def ingest_file(filepath: str) -> bool:
    """Tek bir belgeyi mevcut FAISS indeksine artımlı (incremental) ekler."""
    if not API_KEY or API_KEY.strip() == "":
        print("UYARI: GOOGLE_API_KEY bulunamadı.")
        return False
    if not os.path.exists(filepath):
        return False

    try:
        loader = TextLoader(filepath, encoding='utf-8')
        docs = loader.load()
        if not docs:
            return False

        text_splitter = RecursiveCharacterTextSplitter(
            separators=["\n---\n", "\n\n", "\n"],
            chunk_size=400,
            chunk_overlap=50
        )
        chunks = text_splitter.split_documents(docs)
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2")

        if os.path.exists(FAISS_DIR):
            try:
                db = FAISS.load_local(FAISS_DIR, embeddings, allow_dangerous_deserialization=True)
                db.add_documents(chunks)
                db.save_local(FAISS_DIR)
                print(f"[Artımlı İndeksleme] '{os.path.basename(filepath)}' ({len(chunks)} parça) mevcut FAISS indeksine eklendi!")
                return True
            except Exception as e:
                print(f"[Artımlı İndeksleme Hatası, tam indeksleme tetiklenecek]: {e}")

        # Mevcut indeks yoksa baştan oluştur
        ingest_data(force_rebuild=True)
        return True
    except Exception as e:
        print(f"[ingest_file Hatası]: {e}")
        return False

def ingest_data(force_rebuild: bool = True):
    if not API_KEY or API_KEY.strip() == "":
        print("UYARI: GOOGLE_API_KEY bulunamadı. Simülasyon modunda devam edilecek.")
        return

    print("1. Dokümanlar yükleniyor...")
    loader = DirectoryLoader(DATA_DIR, glob='**/*.txt', loader_cls=TextLoader, loader_kwargs={'encoding': 'utf-8'})
    documents = loader.load()

    if not documents:
        print("Veri klasöründe doküman bulunamadı! data/ içine .txt dosyaları ekleyin.")
        return

    print("2. Dokümanlar parçalara ayrılıyor...")
    text_splitter = RecursiveCharacterTextSplitter(
        separators=["\n---\n", "\n\n", "\n"],
        chunk_size=400,
        chunk_overlap=50
    )
    chunks = text_splitter.split_documents(documents)

    print(f"3. Vektör veritabanı oluşturuluyor ve kaydediliyor ({len(chunks)} parça)...")
    
    # Gemini Embedding Modeli
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2")
    
    # FAISS dizinini hazırla
    if force_rebuild and os.path.exists(FAISS_DIR):
        try:
            shutil.rmtree(FAISS_DIR, ignore_errors=True)
        except Exception:
            pass
    os.makedirs(FAISS_DIR, exist_ok=True)
        
    # Gemini ücretsiz kota: Dakikada max 100 istek. 30'ar parçalık batch'ler ve bekleme süresi ile indeksleyelim.
    batch_size = 25
    db = None
    import time
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        print(f"   İşleniyor: {i + 1} - {min(i + batch_size, len(chunks))} / {len(chunks)}...")
        retries = 3
        while retries > 0:
            try:
                if db is None:
                    db = FAISS.from_documents(batch, embeddings)
                else:
                    db.add_documents(batch)
                break
            except Exception as e:
                print(f"   Kota uyarısı, 20 saniye bekleniyor... ({e})")
                time.sleep(20)
                retries -= 1
        time.sleep(2)
        
    if db:
        db.save_local(FAISS_DIR)
        print("Basarili! Tum soru-cevap verileri FAISS vektor veritabanina islendi.")

if __name__ == "__main__":
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print("Lütfen 'data' klasörüne .txt dosyalarınızı ekleyip tekrar çalıştırın.")
    else:
        ingest_data()
