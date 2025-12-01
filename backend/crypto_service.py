# ==============================================================================
# ŞİFRELEME SERVİSİ (crypto_service.py)
# ==============================================================================
# Hafta 2 - Temel şifreleme altyapısı
# Fernet simetrik şifreleme için temel fonksiyonlar
# ==============================================================================

import os
from cryptography.fernet import Fernet
from .config import KEY_FILE, LOG_MESSAGES


class CryptoService:
    """
    Şifreleme servisi sınıfı.
    
    Bu sınıf, Fernet algoritması kullanarak veri şifreleme
    işlemlerini gerçekleştirir.
    """
    
    def __init__(self):
        """
        CryptoService sınıfının yapıcı metodu.
        Şifreleme anahtarını yükler veya oluşturur.
        """
        self.key = self._load_or_generate_key()
        self.fernet = Fernet(self.key)
    
    def _load_or_generate_key(self) -> bytes:
        """
        Şifreleme anahtarını yükler veya yeni oluşturur.
        
        Returns:
            bytes: Şifreleme anahtarı
        """
        if os.path.exists(KEY_FILE):
            # Mevcut anahtarı dosyadan oku
            with open(KEY_FILE, "rb") as f:
                print(LOG_MESSAGES["key_loaded"])
                return f.read()
        else:
            # Yeni anahtar oluştur ve kaydet
            key = Fernet.generate_key()
            with open(KEY_FILE, "wb") as f:
                f.write(key)
            print(LOG_MESSAGES["key_generated"])
            return key
    
    def encrypt(self, data: bytes) -> bytes:
        """
        Veriyi şifreler.
        
        Args:
            data: Şifrelenecek veri (bytes)
            
        Returns:
            bytes: Şifrelenmiş veri
        """
        return self.fernet.encrypt(data)
    
    def decrypt(self, encrypted_data: bytes) -> bytes:
        """
        Şifrelenmiş veriyi çözer.
        
        Args:
            encrypted_data: Şifrelenmiş veri (bytes)
            
        Returns:
            bytes: Çözülmüş veri
        """
        return self.fernet.decrypt(encrypted_data)


# Modül düzeyinde tekil örnek
crypto_service = CryptoService()
