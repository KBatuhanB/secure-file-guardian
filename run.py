# ==============================================================================
# MAIN ENTRY POINT (run.py)
# ==============================================================================
# This file is used to start the Flask server.
# File Guardian - Secure File Encryption & Monitoring System
# ==============================================================================

import sys
import os

# Add project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import run_server

if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("  FILE GUARDIAN - Secure File Protection System")
    print("=" * 50 + "\n")
    
    run_server()
