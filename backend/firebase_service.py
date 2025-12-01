# ==============================================================================
# FİREBASE SERVİSİ (firebase_service.py)
# ==============================================================================
# Hafta 2 - Firebase bağlantı altyapısı
# Firestore veritabanı bağlantısının temel kurulumu
# ==============================================================================

import os
import firebase_admin
from firebase_admin import credentials, firestore

from .config import CRED_FILE, COLLECTION_NAME, LOG_MESSAGES


class FirebaseService:
    """
    Firebase/Firestore servisi sınıfı.
    
    Bu sınıf, Firebase bağlantısını yönetir.
    Hafta 2'de sadece bağlantı kurulumu yapılmıştır.
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


# Modül düzeyinde tekil örnek
firebase_service = FirebaseService()
