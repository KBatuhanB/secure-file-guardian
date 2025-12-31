# ==============================================================================
# FİREBASE SERVİSİ (firebase_service.py)
# ==============================================================================
# Hafta 3 - Firestore CRUD işlemleri eklendi
# Dosya yükleme, getirme, listeleme, silme işlemleri
# ==============================================================================

import os
import base64
import firebase_admin
from firebase_admin import credentials, firestore

from .config import CRED_FILE, COLLECTION_NAME, LOG_MESSAGES
from .crypto_service import crypto_service


class FirebaseService:
    """
    Firebase/Firestore servisi sınıfı.
    
    Bu sınıf, Firebase bağlantısını ve Firestore CRUD işlemlerini yönetir.
    Hafta 3'te dosya yükleme, getirme, listeleme ve silme eklendi.
    """
    
    def __init__(self):
        """
        FirebaseService sınıfının yapıcı metodu.
        Firebase bağlantısını başlatır.
        """
        self.db = None
        self.is_connected = False
        self._initialize_firebase()
    
    def _initialize_firebase(self) -> None:
        """
        Firebase bağlantısını başlatır.
        """
        try:
            # Kimlik dosyası kontrolü
            if not os.path.exists(CRED_FILE):
                print(f"⚠️ '{CRED_FILE}' bulunamadı. Firebase devre dışı.")
                return
            
            # Firebase başlat
            if not firebase_admin._apps:
                cred = credentials.Certificate(CRED_FILE)
                firebase_admin.initialize_app(cred)
            
            # Firestore client oluştur
            self.db = firestore.client()
            self.is_connected = True
            print(LOG_MESSAGES["firebase_connected"])
            
        except Exception as e:
            self.is_connected = False
            print(LOG_MESSAGES["firebase_error"].format(str(e)))
    
    def get_status(self) -> dict:
        """
        Firebase bağlantı durumunu döndürür.
        
        Returns:
            dict: Bağlantı durumu
        """
        return {
            "connected": self.is_connected,
            "collection": COLLECTION_NAME if self.is_connected else None
        }
    
    # ==========================================================================
    # CRUD İŞLEMLERİ (Hafta 3)
    # ==========================================================================
    
    def upload_file(self, filepath: str) -> dict:
        """
        Dosyayı şifreleyip Firestore'a yükler.
        
        Args:
            filepath: Yüklenecek dosyanın yolu
            
        Returns:
            dict: Yükleme sonucu (success, doc_id, hash, filename)
        """
        if not self.is_connected:
            return {"success": False, "error": "Firebase bağlantısı yok!"}
        
        # Dosya yolunu normalize et (tutarlı doc_id için)
        filepath = os.path.abspath(filepath)
        
        if not os.path.exists(filepath):
            return {"success": False, "error": f"File not found: {filepath}"}
        
        try:
            # Dosyayı şifrele
            encrypted_data = crypto_service.encrypt_file(filepath)
            
            # Dosya hash'ini hesapla
            file_hash = crypto_service.calculate_hash(filepath)
            
            # Benzersiz döküman ID'si oluştur
            doc_id = crypto_service.generate_doc_id(filepath)
            
            # Şifrelenmiş veriyi Base64'e dönüştür (Firestore uyumluluğu)
            encrypted_base64 = base64.b64encode(encrypted_data).decode('utf-8')
            
            # Firestore'a kaydedilecek veri
            data = {
                "original_path": filepath,
                "filename": os.path.basename(filepath),
                "encrypted_content": encrypted_base64,
                "file_hash": file_hash,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "status": "active",
                "file_size": os.path.getsize(filepath)
            }
            
            # Firestore'a kaydet
            self.db.collection(COLLECTION_NAME).document(doc_id).set(data)
            
            print(f"☁️ File uploaded: {os.path.basename(filepath)} (doc_id: {doc_id[:12]}...)")
            
            return {
                "success": True,
                "doc_id": doc_id,
                "hash": file_hash,
                "filename": os.path.basename(filepath)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_file(self, doc_id: str) -> dict:
        """
        Firestore'dan tekil dosya verisini getirir.
        
        Args:
            doc_id: Dosyanın döküman ID'si
            
        Returns:
            dict: Dosya verisi veya None
        """
        if not self.is_connected:
            return None
        
        try:
            doc = self.db.collection(COLLECTION_NAME).document(doc_id).get()
            
            if doc.exists:
                return doc.to_dict()
            return None
            
        except Exception as e:
            print(f"File retrieval error: {e}")
            return None
    
    def get_all_files(self) -> list:
        """
        Tüm korunan dosyaların listesini getirir.
        
        Returns:
            list: Dosya bilgileri listesi
        """
        if not self.is_connected:
            return []
        
        try:
            docs = self.db.collection(COLLECTION_NAME).stream()
            files = []
            
            for doc in docs:
                data = doc.to_dict()
                full_hash = data.get("file_hash", "")
                files.append({
                    "doc_id": doc.id,
                    "filename": data.get("filename", "Bilinmiyor"),
                    "original_path": data.get("original_path", ""),
                    "file_hash": full_hash,  # Tam hash (watcher için)
                    "file_hash_short": full_hash[:16] + "..." if full_hash else "",  # Kısa hash (UI için)
                    "status": data.get("status", "unknown"),
                    "file_size": data.get("file_size", 0)
                })
            
            return files
            
        except Exception as e:
            print(f"File list error: {e}")
            return []
    
    def delete_file(self, doc_id: str) -> dict:
        """
        Firestore'dan dosya kaydını siler.
        
        Args:
            doc_id: Silinecek dosyanın döküman ID'si
            
        Returns:
            dict: Silme işlemi sonucu
        """
        if not self.is_connected:
            return {"success": False, "error": "Firebase bağlantısı yok!"}
        
        try:
            self.db.collection(COLLECTION_NAME).document(doc_id).delete()
            print(f"🗑️ File deleted: {doc_id}")
            return {"success": True, "message": "Dosya buluttan silindi."}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_encrypted_data(self, doc_id: str) -> bytes:
        """
        Firestore'dan şifrelenmiş dosya içeriğini getirir.
        
        Args:
            doc_id: Dosyanın döküman ID'si
            
        Returns:
            bytes: Şifrelenmiş veri veya None
        """
        if not self.is_connected:
            return None
        
        try:
            doc = self.db.collection(COLLECTION_NAME).document(doc_id).get()
            
            if doc.exists:
                data = doc.to_dict()
                encrypted_content = data.get("encrypted_content")
                if encrypted_content:
                    return base64.b64decode(encrypted_content)
            return None
            
        except Exception as e:
            print(f"Şifreli veri getirme hatası: {e}")
            return None
    
    def get_file_by_path(self, filepath: str) -> dict:
        """
        Dosya yoluna göre Firebase kaydını getirir.
        
        Args:
            filepath: Orijinal dosya yolu
            
        Returns:
            dict: Dosya verisi veya None
        """
        if not self.is_connected:
            return None
        
        try:
            doc_id = crypto_service.generate_doc_id(filepath)
            doc = self.db.collection(COLLECTION_NAME).document(doc_id).get()
            
            if doc.exists:
                data = doc.to_dict()
                data['doc_id'] = doc.id
                return data
            return None
            
        except Exception as e:
            print(f"Dosya arama hatası: {e}")
            return None


# Modül düzeyinde tekil örnek
firebase_service = FirebaseService()
