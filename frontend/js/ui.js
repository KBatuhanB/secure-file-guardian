// ==============================================================================
// UI UPDATE MODULE (ui.js)
// ==============================================================================
// DOM manipulation, Toast, Modal, List render functions
// UI/UX Developer
// ==============================================================================

/**
 * UI - User Interface Module
 * 
 * This module handles all DOM manipulations:
 * - File list update (updateFileList)
 * - Log display (updateLogs)
 * - Toast notifications (showToast)
 * - Modal dialogs (showModal, hideModal)
 */
const UI = {

    // Toast container reference
    _toastContainer: null,

    // Modal elements
    _modalOverlay: null,
    _modalContent: null,
    _currentModalCallback: null,

    /**
     * Initialize UI module
     */
    init: function () {
        console.log('🎨 UI module initializing...');

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._setup());
        } else {
            this._setup();
        }
    },

    /**
     * Create UI elements
     */
    _setup: function () {
        this._createToastContainer();
        this._createModal();
        console.log('✅ UI module ready');
    },

    // ==========================================================================
    // TOAST NOTIFICATION SYSTEM
    // ==========================================================================

    /**
     * Create toast container
     */
    _createToastContainer: function () {
        // Use existing container if available
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
    showToast: function (message, type = 'info', duration = 3000) {
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

        // Short delay for animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });

        // Auto remove
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
    // MODAL DIALOG SYSTEM
    // ==========================================================================

    /**
     * Create modal elements
     */
    _createModal: function () {
        // Use existing modal if available
        let overlay = document.getElementById('modal-overlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-content" id="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="modal-title">Modal Title</h3>
                        <button class="modal-close" id="modal-close-btn">×</button>
                    </div>
                    <div class="modal-body" id="modal-body">
                        <p id="modal-message">Modal content</p>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">Cancel</button>
                        <button class="modal-btn modal-btn-confirm" id="modal-confirm-btn">Confirm</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Add event listeners
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
     * Show modal dialog
     * @param {Object} options - Modal settings
     */
    showModal: function (options = {}) {
        const {
            title = 'Confirm',
            message = 'Are you sure you want to perform this action?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'default', // 'default' | 'danger' | 'warning'
            onConfirm = null
        } = options;

        if (!this._modalOverlay) {
            this._createModal();
        }

        // Update modal content
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('modal-confirm-btn').textContent = confirmText;
        document.getElementById('modal-cancel-btn').textContent = cancelText;

        // Set type class
        const confirmBtn = document.getElementById('modal-confirm-btn');
        confirmBtn.className = `modal-btn modal-btn-confirm modal-btn-${type}`;

        // Save callback
        this._currentModalCallback = onConfirm;

        // Show modal
        this._modalOverlay.classList.add('modal-visible');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Hide modal dialog
     */
    hideModal: function () {
        if (this._modalOverlay) {
            this._modalOverlay.classList.remove('modal-visible');
            document.body.style.overflow = '';
            this._currentModalCallback = null;
        }
    },

    /**
     * Handle modal confirm button
     */
    _handleModalConfirm: function () {
        if (this._currentModalCallback) {
            this._currentModalCallback();
        }
        this.hideModal();
    },

    // ==========================================================================
    // FILE LIST UPDATE
    // ==========================================================================

    /**
     * Update protected file list
     * @param {Array} files - File array
     */
    updateFileList: function (files = []) {
        const container = document.getElementById('fileList');
        if (!container) return;

        if (files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📁</span>
                    <p>No protected files yet</p>
                    <small>Use the form above to add files</small>
                </div>
            `;
            return;
        }

        const fileItems = files.map((file, index) => this._createFileItem(file, index)).join('');

        container.innerHTML = `
            <div class="file-list-header">
                <span>🛡️ Protected Files (${files.length})</span>
            </div>
            <div class="file-list-items">
                ${fileItems}
            </div>
        `;
    },

    /**
     * Create single file element
     */
    _createFileItem: function (file, index) {
        const filename = file.filename || file.original_path?.split(/[\\/]/).pop() || 'Unknown File';
        const fileSize = file.file_size ? this._formatFileSize(file.file_size) : '-';
        const docId = file.doc_id || file.id || '';
        const isProtected = file.status === 'active' || file.is_protected;

        return `
            <div class="file-item" data-index="${index}">
                <div class="file-item-icon">
                    ${this._getFileIcon(filename)}
                </div>
                <div class="file-item-info">
                    <div class="file-item-name" title="${this._escapeHtml(file.original_path || '')}">${this._escapeHtml(filename)}</div>
                    <div class="file-item-meta">
                        <span class="file-size">${fileSize}</span>
                    </div>
                </div>
                <div class="file-item-status ${isProtected ? 'protected' : 'unprotected'}">
                    ${isProtected ? '🔒 Protected' : '🔓 Not Protected'}
                </div>
                <div class="file-item-actions">
                    <button class="btn-icon delete-btn" data-doc-id="${docId}" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Get icon based on file extension
     */
    _getFileIcon: function (filename) {
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
    // PENDING LIST UPDATE
    // ==========================================================================

    /**
     * Update pending file list
     */
    updatePendingList: function () {
        const container = document.getElementById('pendingFileList');
        if (!container) return;

        const pendingFiles = AppState.pendingFiles || [];

        if (pendingFiles.length === 0) {
            container.innerHTML = `
                <div class="empty-state small">
                    <p>No pending files</p>
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
                    <button class="btn-icon remove-pending-btn" data-filepath="${this._escapeHtml(filepath)}" title="Remove">
                        ×
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="pending-list-header">
                Pending Files (${pendingFiles.length})
            </div>
            ${items}
        `;
    },

    // ==========================================================================
    // LOG UPDATE
    // ==========================================================================

    // Son görülen log'ların hash'lerini sakla
    _logCache: new Map(),

    /**
     * Update security logs - gerçekten yeni log varsa ekle
     * @param {Array} logs - Log array
     * @param {boolean} forceRefresh - Zorla tam yenile
     */
    updateLogs: function (logs = [], forceRefresh = false) {
        const container = document.getElementById('logsContainer');
        if (!container) return;

        // Boş liste durumu
        if (logs.length === 0) {
            this._logCache.clear();
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <p>No security logs yet</p>
                </div>
            `;
            return;
        }

        // Force refresh ise cache'i temizle ve tam yenile
        if (forceRefresh) {
            this._logCache.clear();
            logs.forEach(log => {
                const logKey = `${log.timestamp}_${log.type}_${log.message}`;
                this._logCache.set(logKey, true);
            });

            const logItems = logs.map(log => this._createLogItem(log)).join('');
            container.innerHTML = `
                <div class="logs-list">
                    ${logItems}
                </div>
            `;
            return;
        }

        // Sadece yeni logları bul
        const newLogs = [];
        for (const log of logs) {
            const logKey = `${log.timestamp}_${log.type}_${log.message}`;
            if (!this._logCache.has(logKey)) {
                newLogs.push(log);
                this._logCache.set(logKey, true);
            }
        }

        // Yeni log yoksa hiçbir şey yapma - DOM'a DOKUNMA
        if (newLogs.length === 0) {
            return;
        }

        // Liste container'ı yoksa oluştur
        let logsList = container.querySelector('.logs-list');
        if (!logsList) {
            logsList = document.createElement('div');
            logsList.className = 'logs-list';
            container.innerHTML = '';
            container.appendChild(logsList);
        }

        // Sadece yeni logları ekle (en üste)
        const fragment = document.createDocumentFragment();
        newLogs.reverse().forEach(log => {
            const div = document.createElement('div');
            div.innerHTML = this._createLogItem(log);
            fragment.appendChild(div.firstElementChild);
        });

        logsList.insertBefore(fragment, logsList.firstChild);
    },

    /**
     * Create single log element
     */
    _createLogItem: function (log) {
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
     * Get CSS class based on log type
     */
    _getLogTypeClass: function (type) {
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
     * Get icon based on log type
     */
    _getLogTypeIcon: function (type) {
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
    // MONITORING STATUS UPDATE
    // ==========================================================================

    /**
     * Update monitoring status
     * @param {Object} status - Monitoring status
     */
    updateMonitoringStatus: function (status = {}) {
        const statusContainer = document.getElementById('monitoringStatus');
        if (!statusContainer) return;

        const isRunning = status.is_running || false;
        const protectedCount = status.protected_file_count || status.protected_files_count || 0;

        // Koruma aktif değilse 0 göster, aktifse gerçek sayıyı göster
        const displayCount = isRunning ? protectedCount : 0;

        statusContainer.innerHTML = `
            <div class="status-indicator ${isRunning ? 'status-active' : 'status-inactive'}">
                <span class="status-dot"></span>
                <span class="status-text">${isRunning ? '🛡️ Active' : '⏸️ Inactive'}</span>
            </div>
            <div class="status-info">
                <span>Protected: ${displayCount} files</span>
            </div>
        `;

        // Update buttons
        const startBtn = document.getElementById('startMonitoringBtn');
        const stopBtn = document.getElementById('stopMonitoringBtn');

        if (startBtn) startBtn.disabled = isRunning;
        if (stopBtn) stopBtn.disabled = !isRunning;
    },

    // ==========================================================================
    // HELPER FUNCTIONS
    // ==========================================================================

    /**
     * Escape HTML characters
     */
    _escapeHtml: function (text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Format date
     */
    _formatDate: function (dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    },

    /**
     * Format time
     */
    _formatTime: function (timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return timestamp;
        }
    },

    /**
     * Format file size
     */
    _formatFileSize: function (bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
};

// Initialize module
UI.init();
