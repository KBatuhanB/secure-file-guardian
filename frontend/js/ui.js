// ==============================================================================
// UI GÜNCELLEME MODÜLÜ (ui.js)
// ==============================================================================
// Hafta 4 - DOM manipulation, Toast, Modal, List render fonksiyonları
// UI/UX Developer (Üye 4) tarafından geliştirildi
// ==============================================================================

/**
 * UI - Kullanıcı Arayüzü Modülü
 * 
 * Bu modül tüm DOM manipülasyonlarını yönetir:
 * - Dosya listesi güncelleme (updateFileList)
 * - Log görüntüleme (updateLogs)
 * - Toast bildirimleri (showToast)
 * - Modal diyalogları (showModal, hideModal)
 */
const UI = {
    
    // Toast container referansı
    _toastContainer: null,
    
    // Modal elementleri
    _modalOverlay: null,
    _modalContent: null,
    _currentModalCallback: null,
    
    /**
     * UI modülünü başlatır
     */
    init: function() {
        console.log('🎨 UI modülü başlatılıyor...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._setup());
        } else {
            this._setup();
        }
    },
    
    /**
     * UI elementlerini oluşturur
     */
    _setup: function() {
        this._createToastContainer();
        this._createModal();
        console.log('✅ UI modülü hazır');
    },
    
    // ==========================================================================
    // TOAST BİLDİRİM SİSTEMİ
    // ==========================================================================
    
    /**
     * Toast container'ı oluşturur
     */
    _createToastContainer: function() {
        // Mevcut container varsa kullan
        let container = document.getElementById('toast-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        this._toastContainer = container;
    },
    
    /**
     * Toast bildirimi gösterir
     * @param {string} message - Gösterilecek mesaj
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     * @param {number} duration - Gösterim süresi (ms)
     */
    showToast: function(message, type = 'info', duration = 3000) {
        if (!this._toastContainer) {
            this._createToastContainer();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // İkon belirleme
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${this._escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        this._toastContainer.appendChild(toast);
        
        // Animasyon için kısa gecikme
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });
        
        // Otomatik kaldırma
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            toast.classList.add('toast-hiding');
            
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    },
    
    // ==========================================================================
    // MODAL DİYALOG SİSTEMİ
    // ==========================================================================
    
    /**
     * Modal elementlerini oluşturur
     */
    _createModal: function() {
        // Mevcut modal varsa kullan
        let overlay = document.getElementById('modal-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-content" id="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="modal-title">Modal Başlık</h3>
                        <button class="modal-close" id="modal-close-btn">×</button>
                    </div>
                    <div class="modal-body" id="modal-body">
                        <p id="modal-message">Modal içeriği</p>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">İptal</button>
                        <button class="modal-btn modal-btn-confirm" id="modal-confirm-btn">Onayla</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            // Event listener'ları ekle
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideModal();
                }
            });
            
            document.getElementById('modal-close-btn')?.addEventListener('click', () => this.hideModal());
            document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.hideModal());
            document.getElementById('modal-confirm-btn')?.addEventListener('click', () => this._handleModalConfirm());
        }
        
        this._modalOverlay = overlay;
    },
    
    /**
     * Modal diyaloğunu gösterir
     * @param {Object} options - Modal ayarları
     */
    showModal: function(options = {}) {
        const {
            title = 'Onay',
            message = 'Bu işlemi yapmak istediğinize emin misiniz?',
            confirmText = 'Onayla',
            cancelText = 'İptal',
            type = 'default', // 'default' | 'danger' | 'warning'
            onConfirm = null
        } = options;
        
        if (!this._modalOverlay) {
            this._createModal();
        }
        
        // Modal içeriğini güncelle
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('modal-confirm-btn').textContent = confirmText;
        document.getElementById('modal-cancel-btn').textContent = cancelText;
        
        // Tip sınıfını ayarla
        const confirmBtn = document.getElementById('modal-confirm-btn');
        confirmBtn.className = `modal-btn modal-btn-confirm modal-btn-${type}`;
        
        // Callback'i kaydet
        this._currentModalCallback = onConfirm;
        
        // Modal'ı göster
        this._modalOverlay.classList.add('modal-visible');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Modal diyaloğunu gizler
     */
    hideModal: function() {
        if (this._modalOverlay) {
            this._modalOverlay.classList.remove('modal-visible');
            document.body.style.overflow = '';
            this._currentModalCallback = null;
        }
    },
    
    /**
     * Modal onay butonunu işler
     */
    _handleModalConfirm: function() {
        if (this._currentModalCallback) {
            this._currentModalCallback();
        }
        this.hideModal();
    },
    
    // ==========================================================================
    // DOSYA LİSTESİ GÜNCELLEME
    // ==========================================================================
    
    /**
     * Korunan dosya listesini günceller
     * @param {Array} files - Dosya dizisi
     */
    updateFileList: function(files = []) {
        const container = document.getElementById('fileList');
        if (!container) return;
        
        if (files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📁</span>
                    <p>Henüz korunan dosya yok</p>
                    <small>Dosya eklemek için yukarıdaki formu kullanın</small>
                </div>
            `;
            return;
        }
        
        const fileItems = files.map((file, index) => this._createFileItem(file, index)).join('');
        
        container.innerHTML = `
            <div class="file-list-header">
                <span>🛡️ Korunan Dosyalar (${files.length})</span>
            </div>
            <div class="file-list-items">
                ${fileItems}
            </div>
        `;
    },
    
    /**
     * Tek dosya elementi oluşturur
     */
    _createFileItem: function(file, index) {
        const filename = file.original_path?.split(/[\\/]/).pop() || 'Bilinmeyen Dosya';
        const uploadDate = file.upload_date ? this._formatDate(file.upload_date) : 'Bilinmiyor';
        const fileSize = file.original_size ? this._formatFileSize(file.original_size) : '-';
        
        return `
            <div class="file-item" data-index="${index}">
                <div class="file-item-icon">
                    ${this._getFileIcon(filename)}
                </div>
                <div class="file-item-info">
                    <div class="file-item-name" title="${this._escapeHtml(file.original_path || '')}">${this._escapeHtml(filename)}</div>
                    <div class="file-item-meta">
                        <span class="file-size">${fileSize}</span>
                        <span class="file-date">${uploadDate}</span>
                    </div>
                </div>
                <div class="file-item-status ${file.is_protected ? 'protected' : 'unprotected'}">
                    ${file.is_protected ? '🔒 Korunuyor' : '🔓 Korunmuyor'}
                </div>
                <div class="file-item-actions">
                    <button class="btn-icon download-btn" data-doc-id="${file.id}" title="İndir">
                        📥
                    </button>
                    <button class="btn-icon delete-btn" data-doc-id="${file.id}" title="Sil">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * Dosya uzantısına göre ikon döner
     */
    _getFileIcon: function(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'txt': '📄',
            'pdf': '📕',
            'doc': '📘',
            'docx': '📘',
            'xls': '📗',
            'xlsx': '📗',
            'ppt': '📙',
            'pptx': '📙',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'png': '🖼️',
            'gif': '🖼️',
            'mp3': '🎵',
            'mp4': '🎬',
            'zip': '📦',
            'rar': '📦',
            'py': '🐍',
            'js': '📜',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'md': '📝'
        };
        
        return iconMap[ext] || '📄';
    },
    
    // ==========================================================================
    // PENDING (BEKLEYEN) LİSTE GÜNCELLEME
    // ==========================================================================
    
    /**
     * Bekleyen dosya listesini günceller
     */
    updatePendingList: function() {
        const container = document.getElementById('pendingFileList');
        if (!container) return;
        
        const pendingFiles = AppState.pendingFiles || [];
        
        if (pendingFiles.length === 0) {
            container.innerHTML = `
                <div class="empty-state small">
                    <p>Bekleyen dosya yok</p>
                </div>
            `;
            return;
        }
        
        const items = pendingFiles.map(filepath => {
            const filename = filepath.split(/[\\/]/).pop();
            return `
                <div class="pending-item">
                    <span class="pending-icon">📄</span>
                    <span class="pending-name" title="${this._escapeHtml(filepath)}">${this._escapeHtml(filename)}</span>
                    <button class="btn-icon remove-pending-btn" data-filepath="${this._escapeHtml(filepath)}" title="Kaldır">
                        ×
                    </button>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div class="pending-list-header">
                Bekleyen Dosyalar (${pendingFiles.length})
            </div>
            ${items}
        `;
    },
    
    // ==========================================================================
    // LOG GÜNCELLEME
    // ==========================================================================
    
    /**
     * Güvenlik loglarını günceller
     * @param {Array} logs - Log dizisi
     */
    updateLogs: function(logs = []) {
        const container = document.getElementById('logsContainer');
        if (!container) return;
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <p>Henüz güvenlik logu yok</p>
                </div>
            `;
            return;
        }
        
        const logItems = logs.map(log => this._createLogItem(log)).join('');
        
        container.innerHTML = `
            <div class="logs-list">
                ${logItems}
            </div>
        `;
    },
    
    /**
     * Tek log elementi oluşturur
     */
    _createLogItem: function(log) {
        const typeClass = this._getLogTypeClass(log.type);
        const typeIcon = this._getLogTypeIcon(log.type);
        const time = this._formatTime(log.timestamp);
        
        return `
            <div class="log-item ${typeClass}">
                <span class="log-icon">${typeIcon}</span>
                <span class="log-time">${time}</span>
                <span class="log-message">${this._escapeHtml(log.message)}</span>
            </div>
        `;
    },
    
    /**
     * Log tipine göre CSS sınıfı döner
     */
    _getLogTypeClass: function(type) {
        const classMap = {
            'violation': 'log-danger',
            'restore': 'log-success',
            'warning': 'log-warning',
            'info': 'log-info',
            'error': 'log-error'
        };
        return classMap[type] || 'log-info';
    },
    
    /**
     * Log tipine göre ikon döner
     */
    _getLogTypeIcon: function(type) {
        const iconMap = {
            'violation': '🚨',
            'restore': '✅',
            'warning': '⚠️',
            'info': 'ℹ️',
            'error': '❌'
        };
        return iconMap[type] || 'ℹ️';
    },
    
    // ==========================================================================
    // MONITORING DURUM GÜNCELLEME
    // ==========================================================================
    
    /**
     * Monitoring durumunu günceller
     * @param {Object} status - Monitoring durumu
     */
    updateMonitoringStatus: function(status = {}) {
        const statusContainer = document.getElementById('monitoringStatus');
        if (!statusContainer) return;
        
        const isRunning = status.is_running || false;
        const protectedCount = status.protected_files_count || 0;
        
        statusContainer.innerHTML = `
            <div class="status-indicator ${isRunning ? 'status-active' : 'status-inactive'}">
                <span class="status-dot"></span>
                <span class="status-text">${isRunning ? '🛡️ Aktif' : '⏸️ Pasif'}</span>
            </div>
            <div class="status-info">
                <span>Korunan: ${protectedCount} dosya</span>
            </div>
        `;
        
        // Butonları güncelle
        const startBtn = document.getElementById('startMonitoringBtn');
        const stopBtn = document.getElementById('stopMonitoringBtn');
        
        if (startBtn) startBtn.disabled = isRunning;
        if (stopBtn) stopBtn.disabled = !isRunning;
    },
    
    // ==========================================================================
    // YARDIMCI FONKSİYONLAR
    // ==========================================================================
    
    /**
     * HTML karakterlerini escape eder
     */
    _escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Tarihi formatlar
     */
    _formatDate: function(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    },
    
    /**
     * Zamanı formatlar
     */
    _formatTime: function(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return timestamp;
        }
    },
    
    /**
     * Dosya boyutunu formatlar
     */
    _formatFileSize: function(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
};

// Modülü başlat
UI.init();
