@echo off
chcp 65001 >nul
title WhatsappChatBot - Projeyi Başlat

REM Her zaman dosyanın bulunduğu dizine geç
cd /d "%~dp0"
cls

echo ==============================================================
echo        🚀 WhatsappChatBot Başlatılıyor...
echo ==============================================================
echo.

REM 1. Kurulum Kontrolü: backend\venv var mı?
if not exist "backend\venv\Scripts\activate.bat" (
    echo [!] Backend sanal ortamı (venv) bulunamadı.
    echo [*] Otomatik olarak kurulum sihirbazı başlatılıyor...
    echo.
    call setup.bat
    if errorlevel 1 (
        echo [HATA] Kurulum tamamlanamadı. Lütfen hataları kontrol edin.
        pause
        exit /b 1
    )
)

REM 2. Frontend node_modules kontrolü
if not exist "frontend\node_modules" (
    echo [!] Frontend paketleri eksik görünüyor.
    echo [*] 'npm install' çalıştırılıyor...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
)

REM 3. Backend'i Yeni Pencerede Başlat
echo [*] Backend Sunucusu Başlatılıyor (FastAPI - http://localhost:8000)...
start "WhatsappChatBot - Backend (FastAPI)" cmd /k "cd /d ""%~dp0backend"" && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

REM 4. Frontend'i Yeni Pencerede Başlat
echo [*] Frontend Arayüzü Başlatılıyor (Vite - http://localhost:5173)...
start "WhatsappChatBot - Frontend (React Vite)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo ==============================================================
echo  ✅ Her iki servis de ayrı pencerelerde başarıyla başlatıldı!
echo.
echo  🌐 Öğrenci & Giriş Ekranı: http://localhost:5173
echo  ⚙️  Yönetici (Admin) Paneli: http://localhost:5173/admin
echo  📚 Backend API Belgeleri:   http://localhost:8000/docs
echo ==============================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
