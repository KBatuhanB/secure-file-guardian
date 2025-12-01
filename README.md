# 🔒 FILE GUARDIAN - Hafta 2 Prototipi

## 📋 Proje Durumu

Bu klasör, projenin **2. hafta sonundaki** durumunu içermektedir.

### ✅ Tamamlanan Görevler

**Hafta 1 - Planlama ve Araştırma:**
- [x] Proje gereksinimlerinin analizi
- [x] Teknoloji araştırması (Flask, Firebase, Fernet, Watchdog)
- [x] Proje yapısının planlanması
- [x] UI/UX tasarım taslakları

**Hafta 2 - Temel Altyapı:**
- [x] Python proje yapısının oluşturulması
- [x] Flask uygulamasının temel iskeleti
- [x] requirements.txt dosyasının hazırlanması
- [x] Temel HTML/CSS arayüzü
- [x] Firebase bağlantı modülü (temel)
- [x] Şifreleme servisi (temel)
- [x] .gitignore dosyası

### 📁 Proje Yapısı

```
week1-2/
├── backend/
│   ├── __init__.py
│   ├── app.py              # Flask sunucusu (temel)
│   ├── config.py           # Yapılandırma
│   ├── crypto_service.py   # Şifreleme (temel)
│   └── firebase_service.py # Firebase bağlantısı (temel)
│
├── frontend/
│   ├── index.html          # Ana sayfa (temel)
│   └── styles.css          # Stiller (temel)
│
├── run.py                  # Başlatıcı
├── requirements.txt        # Bağımlılıklar
└── README.md              # Bu dosya
```

### 🚀 Çalıştırma

```powershell
# Bağımlılıkları yükle
pip install -r requirements.txt

# Sunucuyu başlat
python run.py
```

Tarayıcıda: http://127.0.0.1:5000

### 📝 Sonraki Hafta Planı (Hafta 3)

- [ ] CRUD API endpoint'lerinin tamamlanması
- [ ] Dosya yükleme/listeleme işlevleri
- [ ] Frontend JavaScript entegrasyonu
- [ ] Firestore veri işlemleri

---

**Hafta 2 Sonu - Aralık 2024**
