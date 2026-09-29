import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# .env dosyasından DATABASE_URL alıyoruz.
# Hızlı başlangıç için varsayılan olarak SQLite kullanılır.
# PostgreSQL kullanmak için .env dosyasında DATABASE_URL değişkenini ayarlayabilirsiniz.
# Örn: postgresql://kullanici:sifre@localhost:5432/muhendislik_bot
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./muhendislik_bot.db")

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=1800,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
