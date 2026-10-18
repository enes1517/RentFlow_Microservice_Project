@echo off
title RentFlow - Akilli Kira Yonetim Sistemi Baslatici
color 0B

echo ===================================================
echo     RENTFLOW - MIKROSERVIS PROJESI BASLATILIYOR
echo ===================================================
echo.

:: 0. .env Kontrolü
if not exist ".env" (
    echo [0/3] .env dosyasi bulunamadi. .env.example'dan olusturuluyor...
    copy .env.example .env >nul
    echo .env dosyasi basariyla olusturuldu!
    echo.
)

:: 1. Docker Altyapisini Baslat
echo [1/4] Takili kalmis eski container'lar temizleniyor...
docker-compose down

echo [2/4] Docker container'lari baslatiliyor...
docker-compose up -d --remove-orphans
if %errorlevel% neq 0 (
    color 0C
    echo HATA: Docker baslatilamadi! Lutfen Docker Desktop'in acik oldugundan emin olun.
    pause
    exit /b %errorlevel%
)
echo Docker altyapisi basariyla baslatildi!
echo.

:: 2. Frontend Paketlerini Kontrol Et ve Yukle
echo [3/4] Frontend bagimliliklari kontrol ediliyor...
cd frontend\rent-management
if not exist "node_modules\" (
    echo node_modules bulunamadi. Paketler yukleniyor, lutfen bekleyin...
    call npm install --legacy-peer-deps
) else (
    echo Frontend paketleri zaten yuklu.
)
cd ..\..
echo.

:: 3. Frontend'i Yeni Pencerede Baslat
echo [4/4] Angular Frontend yeni bir pencerede baslatiliyor (http://localhost:4200)...
start "RentFlow Frontend" cmd /c "cd frontend\rent-management && npm start"

:: 4. Gelecekteki Backend Servisleri (Hazirlikli)
:: Backend servisleri tamamen yazildiginda asagidaki satirlari aktif edecegiz.
:: echo Backend API Gateway baslatiliyor...
:: start "RentFlow API Gateway" cmd /c "cd src\ApiGateway && dotnet run"

echo.
echo ===================================================
echo TUM SISTEM BASARIYLA TETIKLENDI!
echo ===================================================
echo Frontend acilmak uzere, lutfen tarayicinizda http://localhost:4200 adresini kontrol edin.
echo Altyapi servisleri icin:
echo - Keycloak: http://localhost:8080
echo - Grafana: http://localhost:3001
echo - Seq (Log): http://localhost:5341
echo.
echo Bu pencereyi kapatabilirsiniz.
pause
