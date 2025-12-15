# ==============================================================================
# FLASK UYGULAMASI (app.py)
# ==============================================================================
# Hafta 4 - Monitoring API endpoint'leri eklendi
# Dosya izleme, log yönetimi, otomatik onarım durumu
# ==============================================================================

import os
import threading
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from .config import HOST, PORT, DEBUG, BASE_DIR
from .firebase_service import firebase_service
from .crypto_service import crypto_service
from .file_watcher import file_watcher_service


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
# API ENDPOINT'LERİ - DOSYA İZLEME (Hafta 4)
# ==============================================================================

# Thread-safe log listesi
_monitoring_logs = []
_logs_lock = threading.Lock()

def _add_log(log_type: str, message: str, filepath: str = None):
    """Thread-safe log ekleme fonksiyonu."""
    from datetime import datetime
    with _logs_lock:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "type": log_type,
            "message": message,
            "filepath": filepath
        }
        _monitoring_logs.append(log_entry)
        # Maximum 100 log tut
        if len(_monitoring_logs) > 100:
            _monitoring_logs.pop(0)

def _on_violation(filepath: str, expected_hash: str, current_hash: str):
    """Bütünlük ihlali callback'i."""
    _add_log("violation", f"Bütünlük ihlali tespit edildi: {os.path.basename(filepath)}", filepath)

def _on_restore(filepath: str, reason: str):
    """Onarım tamamlandığında callback."""
    _add_log("restore", f"Dosya onarıldı ({reason}): {os.path.basename(filepath)}", filepath)


@app.route("/api/monitoring/start", methods=["POST"])
def start_monitoring():
    """
    Dosya izleme servisini başlatır.
    
    Güvenli izleme başlatma - Korunan dosyaları watchdog ile izlemeye alır.
    Hash karşılaştırma ve otomatik onarım aktif olur.
    
    Returns:
        JSON: Başlatma sonucu
    """
    try:
        # Korunan dosyaları Firebase'den al
        files = firebase_service.get_all_files()
        
        if not files:
            return jsonify({
                "success": False,
                "error": "Korunan dosya bulunamadı. Önce dosya yükleyin."
            }), 400
        
        # Dosyaları file watcher'a ekle
        for file_data in files:
            filepath = file_data.get("original_path") or file_data.get("filepath")
            if filepath and os.path.exists(filepath):
                file_watcher_service.add_protected_file(filepath, {
                    "file_hash": file_data.get("hash"),
                    "encrypted_data": file_data.get("encrypted_data"),
                    "doc_id": file_data.get("doc_id")
                })
        
        # İzlemeyi başlat
        success = file_watcher_service.start(
            on_violation=_on_violation,
            on_restore=_on_restore
        )
        
        if success:
            _add_log("info", "Dosya izleme servisi başlatıldı")
            return jsonify({
                "success": True,
                "message": "Dosya izleme başlatıldı",
                "protected_count": file_watcher_service.protected_file_count
            })
        else:
            return jsonify({
                "success": False,
                "error": "İzleme başlatılamadı"
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/monitoring/stop", methods=["POST"])
def stop_monitoring():
    """
    Dosya izleme servisini durdurur.
    
    Returns:
        JSON: Durdurma sonucu
    """
    try:
        success = file_watcher_service.stop()
        
        if success:
            _add_log("info", "Dosya izleme servisi durduruldu")
            return jsonify({
                "success": True,
                "message": "Dosya izleme durduruldu"
            })
        else:
            return jsonify({
                "success": False,
                "error": "İzleme zaten durmuş durumda"
            }), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/monitoring/status", methods=["GET"])
def get_monitoring_status():
    """
    Dosya izleme durumunu sorgular.
    
    Returns:
        JSON: İzleme durumu bilgileri
    """
    try:
        status = file_watcher_service.get_status()
        return jsonify({
            "success": True,
            **status
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/logs", methods=["GET"])
def get_logs():
    """
    Güvenlik loglarını döndürür.
    
    Thread-safe log yönetimi ile son 50 log kaydını getirir.
    
    Query Params:
        limit: Maksimum log sayısı (default: 50)
    
    Returns:
        JSON: Log listesi
    """
    try:
        limit = request.args.get("limit", 50, type=int)
        
        # File watcher loglarını al
        watcher_events = file_watcher_service.get_events(limit)
        
        # Uygulama loglarını al
        with _logs_lock:
            app_logs = _monitoring_logs[-limit:][::-1]
        
        # Birleştir ve sırala
        all_logs = watcher_events + app_logs
        all_logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return jsonify({
            "success": True,
            "logs": all_logs[:limit],
            "count": len(all_logs[:limit])
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/logs", methods=["DELETE"])
def clear_logs():
    """
    Güvenlik loglarını temizler.
    
    Returns:
        JSON: Temizleme sonucu
    """
    try:
        with _logs_lock:
            _monitoring_logs.clear()
        
        file_watcher_service.clear_events()
        
        return jsonify({
            "success": True,
            "message": "Loglar temizlendi"
        })
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
    print("  FILE GUARDIAN - Hafta 4 Prototipi")
    print("=" * 50)
    print(f"🌐 Sunucu: http://{HOST}:{PORT}")
    print(f"📁 Frontend: {FRONTEND_DIR}")
    print(f"🔥 Firebase: {'Bağlı ✅' if firebase_service.is_connected else 'Bağlı değil ⚠️'}")
    print(f"🛡️ File Watcher: Hazır")
    print("-" * 50)
    
    app.run(host=HOST, port=PORT, debug=DEBUG)


if __name__ == "__main__":
    run_server()
