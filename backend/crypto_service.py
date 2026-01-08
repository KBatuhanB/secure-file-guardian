# ==============================================================================
# ŞİFRELEME SERVİSİ (crypto_service.py)
# ==============================================================================
# Hafta 3 - SHA256 hash ve dosya bütünlük kontrolü eklendi
# Fernet şifreleme + hash hesaplama + döküman ID üretimi
# ==============================================================================

import os
import hashlib
from cryptography.fernet import Fernet
from .config import KEY_FILE, LOG_MESSAGES


class CryptoService:
    """
    Şifreleme servisi sınıfı.
    
    Bu sınıf, Fernet algoritması kullanarak veri şifreleme
    işlemlerini gerçekleştirir. Hafta 3'te hash fonksiyonları eklendi.
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
    
    def encrypt_file(self, filepath: str) -> bytes:
        """
        Dosyayı okuyup şifreler.
        
        Args:
            filepath: Şifrelenecek dosyanın yolu
            
        Returns:
            bytes: Şifrelenmiş dosya içeriği
        """
        with open(filepath, "rb") as f:
            data = f.read()
        return self.encrypt(data)
    
    def decrypt_to_file(self, encrypted_data: bytes, filepath: str) -> None:
        """
        Şifrelenmiş veriyi çözüp dosyaya yazar.
        
        Args:
            encrypted_data: Şifrelenmiş veri
            filepath: Yazılacak dosyanın yolu
        """
        decrypted = self.decrypt(encrypted_data)
        with open(filepath, "wb") as f:
            f.write(decrypted)
    
    # ==========================================================================
    # HASH FONKSİYONLARI (Hafta 3)
    # ==========================================================================
    
    @staticmethod
    def calculate_hash(filepath: str) -> str:
        """
        Dosyanın SHA256 hash değerini hesaplar.
        
        Bu metod, dosya bütünlüğü kontrolü için kullanılır.
        Dosya 4KB'lık parçalar halinde okunarak bellek tasarrufu sağlanır.
        
        Args:
            filepath: Hash hesaplanacak dosyanın yolu
            
        Returns:
            str: SHA256 hash değeri (hexadecimal) veya None
        """
        sha256 = hashlib.sha256()
        try:
            with open(filepath, "rb") as f:
                # Dosyayı 4KB'lık parçalar halinde oku
                for chunk in iter(lambda: f.read(4096), b""):
                    sha256.update(chunk)
            return sha256.hexdigest()
        except FileNotFoundError:
            return None
    
    @staticmethod
    def generate_doc_id(filepath: str) -> str:
        """
        Dosya yolundan benzersiz bir döküman ID'si oluşturur.
        
        Firestore'da her dosya için benzersiz bir ID gereklidir.
        Dosya yolunun MD5 hash'i bu amaçla kullanılır.
        
        Args:
            filepath: Dosya yolu
            
        Returns:
            str: Benzersiz döküman ID'si (MD5 hash)
        """
        return hashlib.md5(filepath.encode()).hexdigest()
    
    def verify_integrity(self, filepath: str, expected_hash: str) -> bool:
        """
        Dosya bütünlüğünü kontrol eder.
        
        Args:
            filepath: Kontrol edilecek dosyanın yolu
            expected_hash: Beklenen hash değeri
            
        Returns:
            bool: Hash eşleşirse True, değilse False
        """
        current_hash = self.calculate_hash(filepath)
        if current_hash is None:
            return False
        return current_hash == expected_hash


# Modül düzeyinde tekil örnek
crypto_service = CryptoService()
