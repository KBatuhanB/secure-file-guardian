# ==============================================================================
# ANA BAŞLATICI DOSYA (run.py)
# ==============================================================================
# Bu dosya, Flask sunucusunu başlatmak için kullanılır.
# Hafta 2 sonunda oluşturulan temel yapı.
# ==============================================================================

import sys
import os

# Proje dizinini Python path'ine ekle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import run_server

if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("  FILE GUARDIAN - Hafta 2 Prototipi")
    print("=" * 50 + "\n")
    
    run_server()
