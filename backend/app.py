# ==============================================================================
# FLASK UYGULAMASI (app.py)
# ==============================================================================
# Hafta 3 - CRUD API endpoint'leri eklendi
# Dosya yükleme, listeleme, silme işlemleri
# ==============================================================================

import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from .config import HOST, PORT, DEBUG, BASE_DIR
from .firebase_service import firebase_service
from .crypto_service import crypto_service


# Flask uygulamasını oluştur
app = Flask(__name__, static_folder=None)

# CORS desteği ekle (tüm originlere izin ver)
CORS(app, resources={r"/api/*": {"origins": "*"}})

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
# API ENDPOINT'LERİ - SAĞLIK KONTROLÜ
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
# API ENDPOINT'LERİ - DOSYA İŞLEMLERİ (Hafta 3)
# ==============================================================================

@app.route("/api/files", methods=["GET"])
def get_files():
    """
    Korunan tüm dosyaların listesini döndürür.
    
    Returns:
        JSON: Dosya listesi veya hata mesajı
    """
    try:
        files = firebase_service.get_all_files()
        return jsonify({
            "success": True,
            "files": files,
            "count": len(files)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/files/upload", methods=["POST"])
def upload_file():
    """
    Yeni bir dosyayı şifreleyip buluta yükler.
    
    Request Body:
        filepath: Yüklenecek dosyanın tam yolu
    
    Returns:
        JSON: Yükleme sonucu
    """
    try:
        # JSON verisini al
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "JSON verisi gerekli!"
            }), 400
        
        filepath = data.get("filepath")
        
        if not filepath:
            return jsonify({
                "success": False,
                "error": "Dosya yolu belirtilmedi!"
            }), 400
        
        # Dosya yolunu normalize et
        filepath = os.path.normpath(filepath)
        
        # Dosya var mı kontrol et
        if not os.path.exists(filepath):
            return jsonify({
                "success": False,
                "error": f"Dosya bulunamadı: {filepath}"
            }), 404
        
        # Dosyayı yükle
        result = firebase_service.upload_file(filepath)
        
        if result.get("success"):
            return jsonify({
                "success": True,
                "message": f"Dosya başarıyla yüklendi: {result.get('filename')}",
                "doc_id": result.get("doc_id"),
                "hash": result.get("hash")
            })
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/files/<doc_id>", methods=["DELETE"])
def delete_file(doc_id):
    """
    Belirtilen dosyayı buluttan siler.
    
    Args:
        doc_id: Silinecek dosyanın döküman ID'si
    
    Returns:
        JSON: Silme sonucu
    """
    try:
        if not doc_id:
            return jsonify({
                "success": False,
                "error": "Döküman ID'si gerekli!"
            }), 400
        
        result = firebase_service.delete_file(doc_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==============================================================================
# SUNUCU BAŞLATMA
# ==============================================================================

def run_server():
    """Flask sunucusunu başlatır."""
    print("=" * 50)
    print("  FILE GUARDIAN - Hafta 3 Prototipi")
    print("=" * 50)
    print(f"🌐 Sunucu: http://{HOST}:{PORT}")
    print(f"📁 Frontend: {FRONTEND_DIR}")
    print(f"🔥 Firebase: {'Bağlı ✅' if firebase_service.is_connected else 'Bağlı değil ⚠️'}")
    print("-" * 50)
    
    app.run(host=HOST, port=PORT, debug=DEBUG)


if __name__ == "__main__":
    run_server()
