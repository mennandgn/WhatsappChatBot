import os
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
import app.models as models
from app.auth import get_password_hash

def seed_users():
    db: Session = SessionLocal()
    
    # 1. Admin Hesabını Oluştur
    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin_user:
        admin = models.User(
            username="admin", 
            password_hash=get_password_hash("12345"), 
            role="admin"
        )
        db.add(admin)
        print("[+] 'admin' kullanicisi (Yonetici) basariyla olusturuldu. (Sifre: 12345)")
    
    # 2. Örnek Öğrenci Hesabını Oluştur
    student_user = db.query(models.User).filter(models.User.username == "ogrenci").first()
    if not student_user:
        student = models.User(
            username="ogrenci", 
            password_hash=get_password_hash("12345"), 
            role="student"
        )
        db.add(student)
        print("[+] 'ogrenci' kullanicisi (Ogrenci) basariyla olusturuldu. (Sifre: 12345)")
        
    db.commit()
    db.close()

if __name__ == "__main__":
    print("Veritabanı kontrol ediliyor...")
    models.Base.metadata.create_all(bind=engine)
    seed_users()
    print("İşlem tamamlandı!")
