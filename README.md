# 🔒 FILE GUARDIAN - Secure File Encryption & Protection System

## 📋 Project Overview

**File Guardian** is a complete file encryption, protection, and monitoring system built with Python Flask backend and vanilla JavaScript frontend. The application provides secure file storage with AES-256 encryption, real-time file integrity monitoring, and automatic restoration from cloud backups.

### ✨ Key Features

- **AES-256 Encryption**: Industry-standard Fernet encryption for all stored files
- **Firebase Cloud Storage**: Secure cloud backup with Firestore integration
- **Real-time Monitoring**: Watchdog-based file integrity monitoring with automatic tamper detection
- **Auto-Restoration**: Automatic file recovery from cloud backups when tampering is detected
- **Security Logging**: Comprehensive logging of all security events and violations
- **Modern Web UI**: Responsive interface with toast notifications, modals, and status indicators
- **Rate Limiting**: Built-in protection against brute-force attacks
- **Input Validation**: Path traversal and injection attack prevention

---

## 🚀 Installation & Setup

### Prerequisites

- **Python 3.8+** installed on your system
- **Firebase Project** with Firestore enabled
- **Firebase Service Account Key** (JSON file)

### Step 1: Clone/Download the Project

```powershell
cd path/to/project/week
```

### Step 2: Create Virtual Environment (Recommended)

```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Or for Command Prompt
.\venv\Scripts\activate.bat
```

### Step 3: Install Dependencies

```powershell
pip install -r requirements.txt
```

**Required packages:**
- `flask` - Web framework
- `flask-cors` - Cross-Origin Resource Sharing
- `cryptography` - AES encryption (Fernet)
- `firebase-admin` - Firebase/Firestore integration
- `watchdog` - File system monitoring

### Step 4: Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Navigate to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the downloaded JSON file as `backend/serviceAccountKey.json`

### Step 5: Run the Application

```powershell
python run.py
```

The server will start and display:
```
==================================================
  FILE GUARDIAN - Secure File Protection System
==================================================

🚀 Server starting...
✅ Firebase connected
✅ Encryption service ready
🌐 Running on http://127.0.0.1:5000
```

### Step 6: Access the Application

Open your browser and navigate to: **http://127.0.0.1:5000**

---

## 📁 Project Structure

```
week/
├── backend/
│   ├── __init__.py           # Package initializer
│   ├── app.py                # Flask server + API endpoints
│   ├── config.py             # Configuration settings
│   ├── crypto_service.py     # AES-256 encryption service
│   ├── firebase_service.py   # Firebase Firestore integration
│   ├── file_watcher.py       # Watchdog file monitoring service
│   └── serviceAccountKey.json # Firebase credentials (not in repo)
│
├── frontend/
│   ├── index.html            # Main application page
│   ├── styles.css            # UI styles and animations
│   └── js/
│       ├── api.js            # API service layer
│       ├── app.js            # Application initialization
│       ├── config.js         # Frontend configuration
│       ├── events.js         # Event handlers module
│       ├── state.js          # Application state management
│       └── ui.js             # UI components (Toast, Modal)
│
├── run.py                    # Application entry point
├── requirements.txt          # Python dependencies
├── secret.key                # Encryption key (auto-generated)
└── README.md                 # This file
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/status` | System status (Firebase, encryption) |
| `GET` | `/api/files` | List all protected files |
| `POST` | `/api/files/upload` | Upload and encrypt a file |
| `DELETE` | `/api/files/<id>` | Delete a protected file |
| `POST` | `/api/monitoring/start` | Start file monitoring |
| `POST` | `/api/monitoring/stop` | Stop file monitoring |
| `GET` | `/api/monitoring/status` | Get monitoring status |
| `GET` | `/api/logs` | Get security logs |
| `DELETE` | `/api/logs` | Clear security logs |

---

## 🛡️ Security Features

### Encryption
- **AES-256 (Fernet)**: All files are encrypted before storage
- **Unique Keys**: Encryption key is auto-generated and stored locally
- **Hash Verification**: SHA-256 hash for integrity checking

### Protection
- **Rate Limiting**: 100 requests per minute per IP
- **Input Validation**: All paths sanitized against traversal attacks
- **CORS Policy**: Controlled cross-origin access

### Monitoring
- **Real-time Detection**: Watchdog monitors file modifications
- **Automatic Restore**: Tampered files restored from Firebase backup
- **Event Logging**: All security events logged with timestamps

---

## 📖 Usage Guide

### Adding Files for Protection

1. Enter the full file path in the input field
2. Click **Add** to add to pending list
3. Click **Upload All** to encrypt and protect

### Starting File Monitoring

1. Click **Start Protection** in the monitoring panel
2. Status will change to **Active** (green indicator)
3. Any file tampering will be automatically detected and restored

### Viewing Security Logs

- All security events appear in the **Security Logs** panel
- Events include: file additions, modifications, violations, restorations
- Click **Refresh** to update logs manually

---

## 🧪 Testing

```powershell
# Run the server
python run.py

# Test API health
curl http://127.0.0.1:5000/api/health

# Test system status
curl http://127.0.0.1:5000/api/status
```

---

## 📝 Development Notes

- The encryption key (`secret.key`) is auto-generated on first run
- Firebase credentials must be placed in `backend/serviceAccountKey.json`
- File monitoring uses a cooldown mechanism to prevent duplicate events
- All API responses follow a consistent JSON structure

---

## 👥 Team

- **Backend Developer**: Flask API, Firebase integration, Security features
- **Encryption Specialist**: Cryptography service, Hash verification
- **Frontend Developer**: Event handling, API integration
- **UI/UX Developer**: Interface design, Toast/Modal components

---

## 📄 License

This project was developed as part of the Scripting Languages course.

**File Guardian © 2024-2025**
