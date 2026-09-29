@echo off
chcp 65001 >nul
title WhatsappChatBot - Kurulum Sihirbazı

REM Her zaman dosyanın bulunduğu dizine geç
cd /d "%~dp0"
cls

echo ==============================================================
echo        🤖 WhatsappChatBot - Otomatik Kurulum Sihirbazı
echo ==============================================================
echo.

REM 1. Python Kontrolü
where python >nul 2>&1
if %errorlevel% neq 0 (
    where py >nul 2>&1
    if %errorlevel% neq 0 (
        echo [HATA] Python sisteminizde kurulu değil veya PATH'e eklenmemiş!
        echo Lütfen https://www.python.org adresinden Python 3.10+ indirin ve
        echo kurulumda 'Add python.exe to PATH' kutucuğunu işaretleyin.
        pause
        exit /b 1
    )
    set PY_CMD=py
) else (
    set PY_CMD=python
)
echo [✓] Python algılandı: %PY_CMD%

REM 2. Node.js & NPM Kontrolü
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Node.js veya npm sisteminizde kurulu değil!
    echo Lütfen https://nodejs.org adresinden Node.js 18+ indirin.
    pause
    exit /b 1
)
echo [✓] Node.js ve npm algılandı.
echo.

REM 3. Backend Kurulumu
echo --------------------------------------------------------------
echo [1/3] Backend (Python & FastAPI) Hazırlanıyor...
echo --------------------------------------------------------------
cd /d "%~dp0backend"

if not exist venv (
    echo [*] Python sanal ortamı (venv) oluşturuluyor...
    %PY_CMD% -m venv venv
)

if not exist .env (
    echo [*] .env.example dosyasından .env oluşturuluyor...
    copy .env.example .env >nul
)

echo [*] Python paketleri yükleniyor (requirements.txt)...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt

echo [*] Veritabanı tabloları ve varsayılan kullanıcılar oluşturuluyor...
python seed.py

echo [*] Örnek görsel akış diyagramı yükleniyor...
python seed_master_flow.py

cd /d "%~dp0"
echo [✓] Backend kurulumu başarıyla tamamlandı.
echo.

REM 4. Frontend Kurulumu
echo --------------------------------------------------------------
echo [2/3] Frontend (React, Vite & Tailwind) Hazırlanıyor...
echo --------------------------------------------------------------
cd /d "%~dp0frontend"

if not exist .env (
    copy .env.example .env >nul
)

echo [*] NPM paketleri yükleniyor (npm install)...
call npm install

cd /d "%~dp0"
echo [✓] Frontend kurulumu başarıyla tamamlandı.
echo.

REM 5. Sonuç & Bilgilendirme
echo ==============================================================
echo        🎉 Tebrikler! Kurulum Başarıyla Tamamlandı!
echo ==============================================================
echo.
echo Şimdi yapmanız gerekenler:
echo  1. 'backend\.env' dosyasını açıp GOOGLE_API_KEY anahtarınızı girin.
echo  2. Projeyi başlatmak için 'baslat.bat' dosyasını çalıştırın.
echo.
echo Varsayılan Yönetici Girişi:
echo  - Kullanıcı Adı: admin
echo  - Şifre: 12345
echo.
pause
