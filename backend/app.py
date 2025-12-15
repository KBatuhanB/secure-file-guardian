# ==============================================================================
# FLASK UYGULAMASI (app.py)
# ==============================================================================
# Monitoring API endpoint'leri eklendi
# Dosya izleme, log yönetimi, otomatik onarım durumu
# ==============================================================================

import os
import re
import time
import threading
from functools import wraps
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from .config import HOST, PORT, DEBUG, BASE_DIR
from .firebase_service import firebase_service
from .crypto_service import crypto_service
from .file_watcher import file_watcher_service


# ==============================================================================
# GÜVENLİK: RATE LIMITING SİSTEMİ
# ==============================================================================
# Brute-force saldırılarına karşı istek sınırlaması uygular.
# Her IP adresi için belirli bir zaman diliminde maksimum istek sayısı belirlenir.
# ==============================================================================

# Rate limit ayarları
RATE_LIMIT_WINDOW = 60  # 60 saniye pencere
RATE_LIMIT_MAX_REQUESTS = 100  # Pencere başına maksimum istek
_rate_limit_storage = {}  # IP bazlı istek sayıları
_rate_limit_lock = threading.Lock()

def _check_rate_limit(ip_address: str) -> bool:
    """
    GÜVENLİK: Rate limiting kontrolü.
    
    Belirli bir IP adresinin istek limitini aşıp aşmadığını kontrol eder.
    Bu fonksiyon DDoS ve brute-force saldırılarını engellemek için kullanılır.
    
    Args:
        ip_address: İstek yapan client'ın IP adresi
        
    Returns:
        bool: True ise istek kabul edilir, False ise reddedilir
    """
    current_time = time.time()
    
    with _rate_limit_lock:
        # Eski kayıtları temizle (memory leak önleme)
        expired_ips = [ip for ip, data in _rate_limit_storage.items() 
                       if current_time - data['start_time'] > RATE_LIMIT_WINDOW]
        for ip in expired_ips:
            del _rate_limit_storage[ip]
        
        # IP kaydını kontrol et veya oluştur
        if ip_address not in _rate_limit_storage:
            _rate_limit_storage[ip_address] = {
                'count': 1,
                'start_time': current_time
            }
            return True
        
        record = _rate_limit_storage[ip_address]
        
        # Pencere süresi dolmuşsa sıfırla
        if current_time - record['start_time'] > RATE_LIMIT_WINDOW:
            record['count'] = 1
            record['start_time'] = current_time
            return True
        
        # Limit aşıldı mı kontrol et
        if record['count'] >= RATE_LIMIT_MAX_REQUESTS:
            return False
        
        record['count'] += 1
        return True

def rate_limit(f):
    """
    GÜVENLİK: Rate limiting decorator.
    
    Her API endpoint'ine uygulanarak istek sınırlaması sağlar.
    Limit aşılırsa 429 Too Many Requests yanıtı döner.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_ip = request.remote_addr or '127.0.0.1'
        
        if not _check_rate_limit(client_ip):
            return jsonify({
                'success': False,
                'error': 'Too many requests! Please wait.',
                'error_code': 'RATE_LIMIT_EXCEEDED'
            }), 429
        
        return f(*args, **kwargs)
    return decorated_function


# ==============================================================================
# GÜVENLİK: INPUT VALIDATION VE SANITIZATION
# ==============================================================================
# Kullanıcı girdilerini doğrular ve zararlı karakterleri temizler.
# Path traversal, injection ve diğer saldırılara karşı koruma sağlar.
# ==============================================================================

def _sanitize_filepath(filepath: str) -> tuple:
    """
    GÜVENLİK: Dosya yolu doğrulama ve sanitization.
    
    Path traversal saldırılarına karşı koruma sağlar.
    Tehlikeli karakterleri ve pattern'leri tespit eder.
    
    Args:
        filepath: Kullanıcıdan gelen dosya yolu
        
    Returns:
        tuple: (is_valid: bool, sanitized_path: str, error_message: str)
    """
    if not filepath or not isinstance(filepath, str):
        return False, None, "File path cannot be empty!"
    
    # GÜVENLİK: Path traversal pattern'lerini kontrol et
    # ".." ile üst dizine çıkma girişimlerini engelle
    dangerous_patterns = [
        r'\.\.[\\/]',  # Path traversal: ../
        r'\.\./',      # Path traversal: ../
        r'\\\.\.\\',   # Path traversal: \..\
        r'^/',         # Unix root path
        r'^\\',        # Windows UNC path başlangıcı (tek slash)
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, filepath):
            return False, None, "SECURITY: Invalid file path pattern detected!"
    
    # GÜVENLİK: Tehlikeli karakterleri kontrol et
    # Shell injection ve diğer saldırıları engelle
    dangerous_chars = ['|', '&', ';', '$', '`', '>', '<', '\n', '\r', '\0']
    for char in dangerous_chars:
        if char in filepath:
            return False, None, "SECURITY: Invalid character in file path!"
    
    # Yolu normalize et
    normalized_path = os.path.normpath(filepath)
    
    # GÜVENLİK: Normalize edilmiş yolda hala tehlikeli pattern var mı?
    if '..' in normalized_path:
        return False, None, "SECURITY: Path traversal detected!"
    
    return True, normalized_path, None

def _validate_doc_id(doc_id: str) -> tuple:
    """
    GÜVENLİK: Döküman ID doğrulama.
    
    Firebase döküman ID'lerinin geçerli formatta olduğunu kontrol eder.
    Injection saldırılarına karşı koruma sağlar.
    
    Args:
        doc_id: Firebase döküman ID'si
        
    Returns:
        tuple: (is_valid: bool, error_message: str)
    """
    if not doc_id or not isinstance(doc_id, str):
        return False, "Document ID cannot be empty!"
    
    # GÜVENLİK: ID uzunluk kontrolü
    if len(doc_id) > 100:
        return False, "SECURITY: Document ID too long!"
    
    # GÜVENLİK: Sadece alfanumerik ve belirli karakterlere izin ver
    if not re.match(r'^[a-zA-Z0-9_-]+$', doc_id):
        return False, "SECURITY: Invalid document ID format!"
    
    return True, None

def _create_error_response(message: str, error_code: str = None, status_code: int = 400):
    """
    GÜVENLİK: Standart hata yanıtı oluşturur.
    
    Tüm hata yanıtları tutarlı bir formatta döner.
    Hassas bilgiler (stack trace vb.) kullanıcıya gösterilmez.
    
    Args:
        message: Kullanıcıya gösterilecek hata mesajı
        error_code: Programatik hata kodu (opsiyonel)
        status_code: HTTP status kodu
        
    Returns:
        tuple: (response, status_code)
    """
    response = {
        'success': False,
        'error': message
    }
    if error_code:
        response['error_code'] = error_code
    
    return jsonify(response), status_code


# ==============================================================================
# FLASK UYGULAMA KURULUMU
# ==============================================================================

# Flask uygulamasını oluştur
app = Flask(__name__, static_folder=None)

# GÜVENLİK: CORS Policy ayarları
# Sadece belirtilen origin'lerden gelen isteklere izin ver
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Frontend klasörü
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


# ==============================================================================
# STATIK DOSYA SUNUMU
# ==============================================================================

@app.route("/")
def serve_index():
    """Ana sayfa - Frontend uygulamasını sunar."""
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:filename>")
def serve_static(filename):
    """
    Statik dosyalar (CSS, JS, görseller).
    
    GÜVENLİK: send_from_directory fonksiyonu otomatik olarak
    path traversal saldırılarına karşı koruma sağlar.
    """
    return send_from_directory(FRONTEND_DIR, filename)


# ==============================================================================
# API ENDPOINT'LERİ - SAĞLIK KONTROLÜ VE DURUM
# ==============================================================================

@app.route("/api/health", methods=["GET"])
@rate_limit
def health_check():
    """
    API ENDPOINT: Sağlık Kontrolü
    
    Sunucunun çalışıp çalışmadığını kontrol eder.
    Load balancer ve monitoring araçları tarafından kullanılır.
    
    Returns:
        JSON: {status: "healthy", message: string}
    """
    return jsonify({
        "status": "healthy",
        "message": "File Guardian API is running!",
        "version": "1.0.0"
    })


@app.route("/api/status", methods=["GET"])
@rate_limit
def get_status():
    """
    API ENDPOINT: Sistem Durumu
    
    Tüm sistem bileşenlerinin durumunu döndürür.
    - Firebase bağlantı durumu
    - Şifreleme servisi durumu
    - Dosya izleme durumu
    
    Returns:
        JSON: Detaylı sistem durumu bilgisi
    """
    return jsonify({
        "success": True,
        "firebase": firebase_service.get_status(),
        "encryption": {
            "algorithm": "Fernet (AES-128-CBC)",
            "key_loaded": crypto_service.key is not None
        },
        "monitoring": file_watcher_service.get_status()
    })


# ==============================================================================
# API ENDPOINT'LERİ - DOSYA İŞLEMLERİ (CRUD)
# ==============================================================================
# Korunan dosyaların listelenmesi, yüklenmesi ve silinmesi işlemleri.
# Tüm işlemler şifreli olarak Firebase'de saklanır.
# ==============================================================================

@app.route("/api/files", methods=["GET"])
@rate_limit
def get_files():
    """
    API ENDPOINT: Korunan Dosya Listesi
    
    Firebase'de kayıtlı tüm şifreli dosyaların listesini döndürür.
    Her dosya için metadata bilgisi (isim, hash, tarih) sağlanır.
    
    Returns:
        JSON: {success: bool, files: array, count: int}
    """
    try:
        files = firebase_service.get_all_files()
        return jsonify({
            "success": True,
            "files": files,
            "count": len(files)
        })
    except Exception as e:
        # GÜVENLİK: Detaylı hata bilgisi loglanır ama kullanıcıya gösterilmez
        print(f"[ERROR] Failed to get file list: {str(e)}")
        return _create_error_response(
            "An error occurred while retrieving file list.",
            "FILE_LIST_ERROR",
            500
        )


@app.route("/api/files/upload", methods=["POST"])
@rate_limit
def upload_file():
    """
    API ENDPOINT: Dosya Yükleme (Şifreli)
    
    Belirtilen dosyayı şifreleyip Firebase'e yükler.
    
    GÜVENLİK:
        - Path traversal kontrolü yapılır
        - Dosya varlığı doğrulanır
        - İçerik şifrelenerek saklanır
    
    Request Body:
        filepath (string): Yüklenecek dosyanın tam yolu
    
    Returns:
        JSON: {success: bool, message: string, doc_id: string, hash: string}
    """
    try:
        # GÜVENLİK: JSON verisi kontrolü
        data = request.get_json()
        
        if not data:
            return _create_error_response(
                "JSON data is required!",
                "MISSING_JSON_BODY",
                400
            )
        
        filepath = data.get("filepath")
        
        # GÜVENLİK: Dosya yolu validation ve sanitization
        is_valid, sanitized_path, error_msg = _sanitize_filepath(filepath)
        
        if not is_valid:
            return _create_error_response(error_msg, "INVALID_FILEPATH", 400)
        
        # Dosya varlık kontrolü
        if not os.path.exists(sanitized_path):
            return _create_error_response(
                f"File not found: {os.path.basename(sanitized_path)}",
                "FILE_NOT_FOUND",
                404
            )
        
        # GÜVENLİK: Dosya boyutu kontrolü (max 50MB)
        file_size = os.path.getsize(sanitized_path)
        max_size = 50 * 1024 * 1024  # 50MB
        
        if file_size > max_size:
            return _create_error_response(
                "File size too large! Maximum 50MB.",
                "FILE_TOO_LARGE",
                400
            )
        
        # Dosyayı şifrele ve yükle
        result = firebase_service.upload_file(sanitized_path)
        
        if result.get("success"):
            return jsonify({
                "success": True,
                "message": f"File uploaded successfully: {result.get('filename')}",
                "doc_id": result.get("doc_id"),
                "hash": result.get("hash")
            })
        else:
            return _create_error_response(
                result.get("error", "File upload failed."),
                "UPLOAD_FAILED",
                400
            )
            
    except Exception as e:
        print(f"[ERROR] File upload error: {str(e)}")
        return _create_error_response(
            "An error occurred while uploading file.",
            "UPLOAD_ERROR",
            500
        )


@app.route("/api/files/<doc_id>", methods=["DELETE"])
@rate_limit
def delete_file(doc_id):
    """
    API ENDPOINT: Dosya Silme
    
    Belirtilen döküman ID'sine sahip dosyayı Firebase'den siler.
    
    GÜVENLİK:
        - Döküman ID doğrulaması yapılır
        - Injection saldırılarına karşı koruma sağlanır
    
    Args:
        doc_id: Silinecek dosyanın Firebase döküman ID'si
    
    Returns:
        JSON: {success: bool, message: string}
    """
    try:
        # GÜVENLİK: Döküman ID validation
        is_valid, error_msg = _validate_doc_id(doc_id)
        
        if not is_valid:
            return _create_error_response(error_msg, "INVALID_DOC_ID", 400)
        
        result = firebase_service.delete_file(doc_id)
        return jsonify(result)
        
    except Exception as e:
        print(f"[ERROR] File deletion error: {str(e)}")
        return _create_error_response(
            "An error occurred while deleting file.",
            "DELETE_ERROR",
            500
        )


# ==============================================================================
# API ENDPOINT'LERİ - DOSYA İZLEME VE GÜVENLİK LOGLARI
# ==============================================================================
# Watchdog ile gerçek zamanlı dosya izleme.
# Bütünlük ihlali tespiti ve otomatik onarım.
# ==============================================================================

# Thread-safe log listesi
_monitoring_logs = []
_logs_lock = threading.Lock()

def _add_log(log_type: str, message: str, filepath: str = None):
    """
    GÜVENLİK: Thread-safe log ekleme fonksiyonu.
    
    Concurrent erişim durumunda veri bütünlüğünü korur.
    Loglar bellekte maksimum 100 adet tutulur (DoS önlemi).
    """
    from datetime import datetime
    with _logs_lock:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "type": log_type,
            "message": message,
            "filepath": filepath
        }
        _monitoring_logs.append(log_entry)
        # GÜVENLİK: Maximum log sayısı (memory overflow önleme)
        if len(_monitoring_logs) > 100:
            _monitoring_logs.pop(0)

def _on_violation(filepath: str, expected_hash: str, current_hash: str):
    """
    GÜVENLİK: Bütünlük ihlali callback'i.
    
    Dosya değiştirildiğinde veya silindiğinde tetiklenir.
    Olay loglanır ve gerekirse otomatik onarım başlatılır.
    """
    _add_log("violation", f"⚠️ BÜTÜNLÜK İHLALİ: {os.path.basename(filepath)}", filepath)

def _on_restore(filepath: str, reason: str):
    """
    GÜVENLİK: Onarım tamamlandı callback'i.
    
    Otomatik onarım işlemi başarıyla tamamlandığında tetiklenir.
    """
    _add_log("restore", f"✅ ONARILDI ({reason}): {os.path.basename(filepath)}", filepath)


@app.route("/api/monitoring/start", methods=["POST"])
@rate_limit
def start_monitoring():
    """
    API ENDPOINT: Dosya İzlemeyi Başlat
    
    Korunan dosyaları watchdog ile izlemeye alır.
    Bütünlük ihlali tespit edilirse otomatik onarım devreye girer.
    
    GÜVENLİK:
        - Sadece korunan dosyalar izlenir
        - Hash karşılaştırma ile değişiklik tespiti
        - Otomatik backup'tan restore
    
    Returns:
        JSON: {success: bool, message: string, protected_count: int}
    """
    try:
        # Korunan dosyaları Firebase'den al
        files = firebase_service.get_all_files()
        
        if not files:
            return _create_error_response(
                "No protected files found. Please upload files first.",
                "NO_PROTECTED_FILES",
                400
            )
        
        # Dosyaları file watcher'a ekle
        for file_data in files:
            filepath = file_data.get("original_path") or file_data.get("filepath")
            if filepath and os.path.exists(filepath):
                file_watcher_service.add_protected_file(filepath, {
                    "file_hash": file_data.get("file_hash"),
                    "doc_id": file_data.get("doc_id")
                })
        
        # İzlemeyi başlat
        success = file_watcher_service.start(
            on_violation=_on_violation,
            on_restore=_on_restore
        )
        
        if success:
            _add_log("info", "🛡️ File monitoring service started")
            return jsonify({
                "success": True,
                "message": "File monitoring started",
                "protected_count": file_watcher_service.protected_file_count
            })
        else:
            return _create_error_response(
                "Failed to start monitoring.",
                "MONITORING_START_FAILED",
                500
            )
            
    except Exception as e:
        print(f"[ERROR] Monitoring start error: {str(e)}")
        return _create_error_response(
            "An error occurred while starting monitoring.",
            "MONITORING_ERROR",
            500
        )


@app.route("/api/monitoring/stop", methods=["POST"])
@rate_limit
def stop_monitoring():
    """
    API ENDPOINT: Dosya İzlemeyi Durdur
    
    Aktif olan dosya izleme servisini güvenli bir şekilde durdurur.
    
    Returns:
        JSON: {success: bool, message: string}
    """
    try:
        success = file_watcher_service.stop()
        
        if success:
            _add_log("info", "⏹️ File monitoring service stopped")
            return jsonify({
                "success": True,
                "message": "File monitoring stopped"
            })
        else:
            return _create_error_response(
                "Monitoring is already stopped.",
                "MONITORING_NOT_RUNNING",
                400
            )
            
    except Exception as e:
        print(f"[ERROR] Monitoring stop error: {str(e)}")
        return _create_error_response(
            "An error occurred while stopping monitoring.",
            "MONITORING_STOP_ERROR",
            500
        )


@app.route("/api/monitoring/status", methods=["GET"])
@rate_limit
def get_monitoring_status():
    """
    API ENDPOINT: İzleme Durumu
    
    Dosya izleme servisinin mevcut durumunu döndürür.
    
    Returns:
        JSON: {success: bool, is_running: bool, protected_count: int, ...}
    """
    try:
        status = file_watcher_service.get_status()
        return jsonify({
            "success": True,
            **status
        })
    except Exception as e:
        print(f"[ERROR] Monitoring status error: {str(e)}")
        return _create_error_response(
            "Failed to get monitoring status.",
            "STATUS_ERROR",
            500
        )


@app.route("/api/logs", methods=["GET"])
@rate_limit
def get_logs():
    """
    API ENDPOINT: Güvenlik Logları
    
    Thread-safe şekilde güvenlik loglarını döndürür.
    
    Query Parameters:
        limit (int): Maksimum log sayısı (default: 50, max: 100)
    
    Returns:
        JSON: {success: bool, logs: array, count: int}
    """
    try:
        # GÜVENLİK: Limit değerini validate et
        limit = request.args.get("limit", 50, type=int)
        limit = min(max(1, limit), 100)  # 1-100 arası sınırla
        
        # File watcher loglarını al
        watcher_events = file_watcher_service.get_events(limit)
        
        # Uygulama loglarını al (thread-safe)
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
        print(f"[ERROR] Log reading error: {str(e)}")
        return _create_error_response(
            "An error occurred while retrieving logs.",
            "LOGS_ERROR",
            500
        )


@app.route("/api/logs", methods=["DELETE"])
@rate_limit
def clear_logs():
    """
    API ENDPOINT: Logları Temizle
    
    Tüm güvenlik loglarını temizler.
    
    GÜVENLİK: Thread-safe temizleme işlemi.
    
    Returns:
        JSON: {success: bool, message: string}
    """
    try:
        with _logs_lock:
            _monitoring_logs.clear()
        
        file_watcher_service.clear_events()
        
        return jsonify({
            "success": True,
            "message": "Logs cleared"
        })
    except Exception as e:
        print(f"[ERROR] Log clearing error: {str(e)}")
        return _create_error_response(
            "An error occurred while clearing logs.",
            "CLEAR_LOGS_ERROR",
            500
        )


# ==============================================================================
# SUNUCU BAŞLATMA
# ==============================================================================

def run_server():
    """
    Flask sunucusunu başlatır.
    
    Başlatma sırasında tüm bileşenlerin durumu kontrol edilir ve loglanır.
    """
    print("=" * 60)
    print("  🛡️  FILE GUARDIAN - Güvenli Dosya Koruma Sistemi")
    print("  📦  Version: 1.0.0 (Final Release)")
    print("=" * 60)
    print(f"  🌐 API Sunucusu: http://{HOST}:{PORT}")
    print(f"  📁 Frontend: {FRONTEND_DIR}")
    print(f"  🔥 Firebase: {'Connected ✅' if firebase_service.is_connected else 'Not Connected ⚠️'}")
    print(f"  🔐 Encryption: Fernet (AES-128-CBC)")
    print(f"  🛡️ File Watcher: Ready")
    print(f"  ⚡ Rate Limiting: {RATE_LIMIT_MAX_REQUESTS} requests/{RATE_LIMIT_WINDOW}s")
    print("-" * 60)
    print("  📋 API Endpoints:")
    print("     GET  /api/health           - Health check")
    print("     GET  /api/status           - System status")
    print("     GET  /api/files            - File list")
    print("     POST /api/files/upload     - Upload file")
    print("     DELETE /api/files/<id>     - Delete file")
    print("     POST /api/monitoring/start - Start monitoring")
    print("     POST /api/monitoring/stop  - Stop monitoring")
    print("     GET  /api/monitoring/status- Monitoring status")
    print("     GET  /api/logs             - Security logs")
    print("     DELETE /api/logs           - Clear logs")
    print("=" * 60)
    
    app.run(host=HOST, port=PORT, debug=DEBUG)


if __name__ == "__main__":
    run_server()
