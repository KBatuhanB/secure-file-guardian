# ==============================================================================
# DOSYA İZLEME SERVİSİ (file_watcher.py)
# ==============================================================================
# Hafta 4 - Watchdog ile dosya izleme, hash karşılaştırma ve otomatik onarım
# Security Engineer (Üye 2) tarafından geliştirildi
# ==============================================================================

import os
import time
import threading
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Callable
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

from .config import LOG_MESSAGES


class FileIntegrityHandler(FileSystemEventHandler):
    """
    Dosya değişikliklerini izleyen ve bütünlük kontrolü yapan handler.
    
    Watchdog kütüphanesi ile dosya sistemindeki değişiklikleri yakalar,
    hash karşılaştırması yapar ve gerekirse otomatik onarım başlatır.
    """
    
    def __init__(self, 
                 protected_files: Dict[str, dict],
                 on_violation: Optional[Callable] = None,
                 on_restore: Optional[Callable] = None,
                 cooldown_seconds: int = 5):
        """
        FileIntegrityHandler yapıcı metodu.
        
        Args:
            protected_files: Korunan dosyaların bilgileri {filepath: {hash, encrypted_data, ...}}
            on_violation: Bütünlük ihlali callback fonksiyonu
            on_restore: Onarım tamamlandığında callback fonksiyonu
            cooldown_seconds: Aynı dosya için tekrar kontrol bekleme süresi
        """
        super().__init__()
        self.protected_files = protected_files
        self.on_violation = on_violation
        self.on_restore = on_restore
        self.cooldown_seconds = cooldown_seconds
        
        # Thread-safe cooldown tracking
        self._cooldown_lock = threading.Lock()
        self._last_event_times: Dict[str, float] = {}
        
        # Event log
        self._events_lock = threading.Lock()
        self._events: List[dict] = []
    
    def _is_in_cooldown(self, filepath: str) -> bool:
        """Dosyanın cooldown süresinde olup olmadığını kontrol eder."""
        with self._cooldown_lock:
            last_time = self._last_event_times.get(filepath, 0)
            current_time = time.time()
            
            if current_time - last_time < self.cooldown_seconds:
                return True
            
            self._last_event_times[filepath] = current_time
            return False
    
    def _calculate_file_hash(self, filepath: str) -> Optional[str]:
        """Dosyanın SHA256 hash'ini hesaplar."""
        try:
            if not os.path.exists(filepath):
                return None
            
            sha256_hash = hashlib.sha256()
            with open(filepath, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except Exception as e:
            self._log_event("error", f"Hash calculation error: {filepath} - {str(e)}")
            return None
    
    def _log_event(self, event_type: str, message: str, filepath: str = None):
        """Olayı thread-safe şekilde loglar."""
        with self._events_lock:
            event = {
                "timestamp": datetime.now().isoformat(),
                "type": event_type,
                "message": message,
                "filepath": filepath
            }
            self._events.append(event)
            
            # Console'a da yazdır
            icon = {
                "info": "ℹ️",
                "warning": "⚠️",
                "violation": "🚨",
                "restore": "🔧",
                "error": "❌",
                "success": "✅"
            }.get(event_type, "📝")
            
            print(f"{icon} [{event['timestamp'][:19]}] {message}")
    
    def get_events(self, limit: int = 50) -> List[dict]:
        """Son olayları döndürür."""
        with self._events_lock:
            return self._events[-limit:][::-1]  # En yeni önce
    
    def clear_events(self):
        """Olay loglarını temizler."""
        with self._events_lock:
            self._events.clear()
    
    def on_modified(self, event: FileSystemEvent):
        """Dosya değişikliği olayını işler."""
        if event.is_directory:
            return
        
        filepath = os.path.abspath(event.src_path)
        
        # Korunan dosya mı kontrol et
        if filepath not in self.protected_files:
            return
        
        # Cooldown kontrolü
        if self._is_in_cooldown(filepath):
            return
        
        self._log_event("info", f"File modification detected: {os.path.basename(filepath)}", filepath)
        
        # Hash karşılaştırması
        self._check_integrity(filepath)
    
    def on_deleted(self, event: FileSystemEvent):
        """Dosya silme olayını işler."""
        if event.is_directory:
            return
        
        filepath = os.path.abspath(event.src_path)
        
        if filepath not in self.protected_files:
            return
        
        if self._is_in_cooldown(filepath):
            return
        
        self._log_event("violation", f"🚨 Protected file deleted: {os.path.basename(filepath)}", filepath)
        
        # Otomatik onarım
        self._auto_restore(filepath, reason="deleted")
    
    def _check_integrity(self, filepath: str):
        """Dosya bütünlüğünü kontrol eder."""
        protected_info = self.protected_files.get(filepath)
        if not protected_info:
            return
        
        expected_hash = protected_info.get("file_hash")
        if not expected_hash:
            self._log_event("warning", f"Expected hash not found: {os.path.basename(filepath)}", filepath)
            return
        
        current_hash = self._calculate_file_hash(filepath)
        
        if current_hash is None:
            self._log_event("error", f"Current hash could not be calculated: {os.path.basename(filepath)}", filepath)
            return
        
        if current_hash != expected_hash:
            # Değiştirilen içeriği oku ve logla
            modified_content = self._read_file_content(filepath)
            
            self._log_event(
                "violation", 
                f"🚨 INTEGRITY VIOLATION: {os.path.basename(filepath)} - Hash mismatch!", 
                filepath
            )
            
            # Yazılan içeriği ayrı bir log olarak göster
            if modified_content:
                # İçeriği kısalt (çok uzunsa)
                display_content = modified_content[:500] + "..." if len(modified_content) > 500 else modified_content
                self._log_event(
                    "warning",
                    f"📝 Attempted content: \"{display_content}\"",
                    filepath
                )
            
            # Violation callback
            if self.on_violation:
                self.on_violation(filepath, expected_hash, current_hash)
            
            # Otomatik onarım
            self._auto_restore(filepath, reason="modified")
        else:
            self._log_event("success", f"Integrity verified: {os.path.basename(filepath)}", filepath)
    
    def _read_file_content(self, filepath: str) -> str:
        """Dosya içeriğini okur (text dosyaları için)."""
        try:
            if not os.path.exists(filepath):
                return None
            
            # Önce text olarak okumayı dene
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    return f.read()
            except UnicodeDecodeError:
                # Binary dosyaysa, hex olarak göster
                with open(filepath, "rb") as f:
                    data = f.read(200)  # İlk 200 byte
                    return f"[Binary data: {data.hex()[:100]}...]"
        except Exception as e:
            return f"[Could not read: {str(e)}]"
    
    def _auto_restore(self, filepath: str, reason: str = "unknown"):
        """Dosyayı otomatik olarak onarır (şifreli yedekten geri yükler)."""
        protected_info = self.protected_files.get(filepath)
        if not protected_info:
            self._log_event("error", f"Restore information not found: {filepath}", filepath)
            return
        
        try:
            self._log_event("restore", f"Starting automatic restore: {os.path.basename(filepath)}", filepath)
            
            # Şifreyi çöz ve dosyayı geri yükle
            from .crypto_service import crypto_service
            from .firebase_service import firebase_service
            
            # Firebase'den şifreli veriyi al
            doc_id = protected_info.get("doc_id")
            if doc_id:
                encrypted_data = firebase_service.get_encrypted_data(doc_id)
                
                if encrypted_data:
                    # Şifreyi çöz
                    decrypted_data = crypto_service.decrypt(encrypted_data)
                    
                    if decrypted_data:
                        # Dizin yoksa oluştur
                        os.makedirs(os.path.dirname(filepath), exist_ok=True)
                        
                        # Dosyayı yaz
                        with open(filepath, "wb") as f:
                            f.write(decrypted_data)
                        
                        self._log_event("success", f"✅ File restored successfully: {os.path.basename(filepath)}", filepath)
                        
                        # Restore callback
                        if self.on_restore:
                            self.on_restore(filepath, reason)
                        return
            
            self._log_event("error", f"Encrypted backup not found: {filepath}", filepath)
                
        except Exception as e:
            self._log_event("error", f"Restore error: {filepath} - {str(e)}", filepath)


class FileWatcherService:
    """
    Dosya izleme servisi ana sınıfı.
    
    Watchdog Observer'ı yönetir ve koruma işlemlerini koordine eder.
    Thread-safe tasarım ile eşzamanlı erişimi destekler.
    """
    
    def __init__(self):
        """FileWatcherService yapıcı metodu."""
        self._observer: Optional[Observer] = None
        self._handler: Optional[FileIntegrityHandler] = None
        self._is_running = False
        self._lock = threading.Lock()
        
        # Korunan dosyalar
        self._protected_files: Dict[str, dict] = {}
        
        # İzlenen dizinler
        self._watched_directories: set = set()
    
    @property
    def is_running(self) -> bool:
        """İzleme servisinin çalışıp çalışmadığını döndürür."""
        return self._is_running
    
    @property
    def protected_file_count(self) -> int:
        """Korunan dosya sayısını döndürür."""
        return len(self._protected_files)
    
    def add_protected_file(self, filepath: str, file_info: dict) -> bool:
        """
        Koruma listesine dosya ekler.
        
        Args:
            filepath: Korunacak dosyanın mutlak yolu
            file_info: Dosya bilgileri (hash, encrypted_data, vb.)
        
        Returns:
            bool: Ekleme başarılı ise True
        """
        with self._lock:
            abs_path = os.path.abspath(filepath)
            self._protected_files[abs_path] = file_info
            
            # Dizini izleme listesine ekle
            directory = os.path.dirname(abs_path)
            is_new_directory = directory not in self._watched_directories
            self._watched_directories.add(directory)
            
            # Eğer izleme çalışıyorsa ve yeni bir dizin eklendiyse, observer'a schedule et
            if self._is_running and self._observer and is_new_directory:
                if os.path.exists(directory):
                    self._observer.schedule(self._handler, directory, recursive=False)
                    print(f"👁️ New directory added to watch: {directory}")
            
            print(f"🛡️ Protected: {os.path.basename(filepath)}")
            return True
    
    def remove_protected_file(self, filepath: str) -> bool:
        """Koruma listesinden dosya çıkarır."""
        with self._lock:
            abs_path = os.path.abspath(filepath)
            if abs_path in self._protected_files:
                del self._protected_files[abs_path]
                print(f"🗑️ Unprotected: {os.path.basename(filepath)}")
                return True
            return False
    
    def get_protected_files(self) -> List[dict]:
        """Korunan dosyaların listesini döndürür."""
        with self._lock:
            return [
                {
                    "filepath": fp,
                    "filename": os.path.basename(fp),
                    "file_hash": (info.get("file_hash") or "N/A")[:16] + "..." if info.get("file_hash") else "N/A"
                }
                for fp, info in self._protected_files.items()
            ]
    
    def start(self, on_violation: Callable = None, on_restore: Callable = None) -> bool:
        """
        Dosya izleme servisini başlatır.
        
        Args:
            on_violation: Bütünlük ihlali callback'i
            on_restore: Onarım tamamlandığında callback'i
        
        Returns:
            bool: Başlatma başarılı ise True
        """
        with self._lock:
            if self._is_running:
                print("⚠️ Monitoring service is already running.")
                return False
            
            if not self._protected_files:
                print("⚠️ No protected files. Cannot start monitoring.")
                return False
            
            try:
                # Handler oluştur
                self._handler = FileIntegrityHandler(
                    protected_files=self._protected_files,
                    on_violation=on_violation,
                    on_restore=on_restore,
                    cooldown_seconds=5
                )
                
                # Observer oluştur ve başlat
                self._observer = Observer()
                
                # Her izlenen dizin için schedule ekle
                for directory in self._watched_directories:
                    if os.path.exists(directory):
                        self._observer.schedule(self._handler, directory, recursive=False)
                        print(f"👁️ Watching directory: {directory}")
                
                self._observer.start()
                self._is_running = True
                
                print(f"\n{'='*50}")
                print(f"🛡️ FILE PROTECTION ACTIVE")
                print(f"📁 Protected files: {len(self._protected_files)}")
                print(f"📂 Watched directories: {len(self._watched_directories)}")
                print(f"{'='*50}\n")
                
                return True
                
            except Exception as e:
                print(f"❌ Monitoring start error: {str(e)}")
                self._is_running = False
                return False
    
    def stop(self) -> bool:
        """Dosya izleme servisini durdurur."""
        with self._lock:
            if not self._is_running:
                print("⚠️ Monitoring service is already stopped.")
                return False
            
            try:
                if self._observer:
                    self._observer.stop()
                    self._observer.join(timeout=5)
                    self._observer = None
                
                self._is_running = False
                
                print(f"\n{'='*50}")
                print(f"🛑 FILE PROTECTION STOPPED")
                print(f"{'='*50}\n")
                
                return True
                
            except Exception as e:
                print(f"❌ Monitoring stop error: {str(e)}")
                return False
    
    def get_status(self) -> dict:
        """İzleme servisi durumunu döndürür."""
        return {
            "is_running": self._is_running,
            "protected_file_count": len(self._protected_files),
            "watched_directory_count": len(self._watched_directories),
            "watched_directories": list(self._watched_directories),
            "protected_files": self.get_protected_files()
        }
    
    def get_events(self, limit: int = 50) -> List[dict]:
        """Son güvenlik olaylarını döndürür."""
        if self._handler:
            return self._handler.get_events(limit)
        return []
    
    def clear_events(self):
        """Olay loglarını temizler."""
        if self._handler:
            self._handler.clear_events()


# Singleton instance
file_watcher_service = FileWatcherService()
