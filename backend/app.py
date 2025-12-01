# ==============================================================================
# FLASK UYGULAMASI (app.py)
# ==============================================================================
# Hafta 2 - Flask sunucusunun temel iskeleti
# Ana sayfa ve sağlık kontrolü endpoint'leri
# ==============================================================================

import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from .config import HOST, PORT, DEBUG, BASE_DIR
from .firebase_service import firebase_service
from .crypto_service import crypto_service


# Flask uygulamasını oluştur
app = Flask(__name__, static_folder=None)

# CORS desteği ekle
CORS(app)

# Frontend klasörü
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


# ==============================================================================
# STATIK DOSYA SUNUMU
# ==============================================================================

@app.route("/")
def serve_index():
    """Ana sayfa"""
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:filename>")
def serve_static(filename):
    """Statik dosyalar (CSS, JS)"""
    return send_from_directory(FRONTEND_DIR, filename)


# ==============================================================================
# API ENDPOINT'LERİ
# ==============================================================================

@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Sağlık kontrolü endpoint'i.
    Sunucunun çalışıp çalışmadığını kontrol eder.
    """
    return jsonify({
        "status": "healthy",
        "message": "File Guardian çalışıyor!"
    })


@app.route("/api/status", methods=["GET"])
def get_status():
    """
    Sistem durumu endpoint'i.
    Firebase bağlantı durumunu döndürür.
    """
    return jsonify({
        "success": True,
        "firebase": firebase_service.get_status(),
        "encryption": {
            "algorithm": "Fernet (AES-128-CBC)",
            "key_loaded": crypto_service.key is not None
        }
    })


# ==============================================================================
# SUNUCU BAŞLATMA
# ==============================================================================

def run_server():
    """Flask sunucusunu başlatır."""
    print(f"🌐 Sunucu başlatılıyor: http://{HOST}:{PORT}")
    print(f"📁 Frontend: {FRONTEND_DIR}")
    print(f"🔥 Firebase: {'Bağlı ✅' if firebase_service.is_connected else 'Bağlı değil ⚠️'}")
    print("-" * 50)
    
    app.run(host=HOST, port=PORT, debug=DEBUG)


if __name__ == "__main__":
    run_server()
