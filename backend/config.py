# ==============================================================================
# YAPILANDIRMA DOSYASI (config.py)
# ==============================================================================
# Proje genelinde kullanılan sabitler ve ayarlar
# Temel yapılandırma
# ==============================================================================

import os

# Temel dizin yolu
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Şifreleme anahtarı dosyası
KEY_FILE = os.path.join(BASE_DIR, "secret.key")

# Firebase kimlik bilgileri dosyası (backend klasöründe)
CRED_FILE = os.path.join(BASE_DIR, "backend", "serviceAccountKey.json")

# Firestore koleksiyon adı
COLLECTION_NAME = "encrypted_files"

# Sunucu ayarları
HOST = "127.0.0.1"
PORT = 5000
DEBUG = True

# Log mesajları (Türkçe)
LOG_MESSAGES = {
    "key_loaded": "🔑 Mevcut şifreleme anahtarı yüklendi.",
    "key_generated": "🔑 Yeni şifreleme anahtarı oluşturuldu.",
    "firebase_connected": "✅ Firebase bağlantısı başarılı.",
    "firebase_error": "❌ Firebase bağlantı hatası: {}"
}
