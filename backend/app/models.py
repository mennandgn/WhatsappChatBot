from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="student", nullable=False)

    messages = relationship("MessageLog", back_populates="owner")

class MessageLog(Base):
    __tablename__ = "message_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String, nullable=True)         # Sohbet oturumu ID'si
    category = Column(String, default="Diğer")
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    rating = Column(Integer, default=0)                # 1=beğendi, -1=beğenmedi, 0=oylanmadı
    is_unanswered = Column(Boolean, default=False)     # Yapay zeka bilemedi mi?
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="messages")

class ChatFlow(Base):
    """Görsel akış tasarımcısında (React Flow) oluşturulan sohbet akışlarını saklar."""
    __tablename__ = "chat_flows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, default="Yeni Akış")
    description = Column(Text, nullable=True)
    nodes = Column(JSON, nullable=False, default=list)   # React Flow node listesi
    edges = Column(JSON, nullable=False, default=list)   # React Flow edge listesi
    is_active = Column(Boolean, default=False)           # Öğrenci arayüzünde aktif mi?
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SystemSetting(Base):
    """Sistem ayarları ve guardrail yapılandırmalarını veritabanında saklar."""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FAQItem(Base):
    """Sıkça Sorulan Sorular ve hızlı konu butonları."""
    __tablename__ = "faq_items"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String, nullable=False)
    category = Column(String, nullable=True, default="Genel")
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Announcement(Base):
    """Fakülte ve bölüm canlı duyuru bandı kayıtları."""
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    starts_at = Column(String, nullable=True)
    expires_at = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
