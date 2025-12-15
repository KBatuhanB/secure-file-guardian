// ==============================================================================
// OLAY İŞLEYİCİ MODÜLÜ (events.js)
// ==============================================================================
// Form submit, button click, event delegation, keyboard events
// Tüm kullanıcı etkileşimleri bu modül tarafından yönetilir
// ==============================================================================

/**
 * EventHandlers - Olay işleyici modülü
 * 
 * Bu modül tüm kullanıcı etkileşimlerini yönetir:
 * - Form submit olayları
 * - Buton click olayları
 * - Keyboard olayları (Enter tuşu)
 * - Event delegation ile dinamik element yönetimi
 */
const EventHandlers = {
    
    /**
     * Tüm event listener'ları başlatır
     */
    init: function() {
        console.log('🎯 Event handlers başlatılıyor...');
        
        // DOM yüklendikten sonra çalıştır
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._setupAllHandlers());
        } else {
            this._setupAllHandlers();
        }
    },
    
    /**
     * Tüm handler'ları ayarlar
     */
    _setupAllHandlers: function() {
        this._setupFormHandlers();
        this._setupButtonHandlers();
        this._setupKeyboardHandlers();
        this._setupDelegatedHandlers();
        
        console.log('✅ Event handlers hazır');
    },
    
    // ==========================================================================
    // FORM HANDLERS
    // ==========================================================================
    
    /**
     * Setup form submit events
     */
    _setupFormHandlers: function() {
        // File upload form
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this._handleUploadSubmit(e));
        }
        
        // Add file form (pending list)
        const addFileForm = document.getElementById('addFileForm');
        if (addFileForm) {
            addFileForm.addEventListener('submit', (e) => this._handleAddFileSubmit(e));
        }
    },
    
    /**
     * File upload form submit handler
     */
    _handleUploadSubmit: async function(event) {
        event.preventDefault();
        
        const filepathInput = document.getElementById('filepathInput');
        const filepath = filepathInput?.value?.trim();
        
        if (!filepath) {
            UI.showToast('Please enter a file path!', 'warning');
            return;
        }
        
        // Loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Uploading...';
        }
        
        try {
            const result = await ApiService.uploadFile(filepath);
            
            if (result.success) {
                UI.showToast(`✅ ${result.message}`, 'success');
                filepathInput.value = '';
                
                // Update file list
                await this._refreshFileList();
            } else {
                UI.showToast(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },
    
    /**
     * Add file (pending list) form submit handler
     */
    _handleAddFileSubmit: function(event) {
        event.preventDefault();
        
        const input = document.getElementById('pendingFilePath');
        const filepath = input?.value?.trim();
        
        if (!filepath) {
            UI.showToast('Please enter a file path!', 'warning');
            return;
        }
        
        // Add to state
        AppState.addPendingFile(filepath);
        
        // Update UI
        UI.updatePendingList();
        
        // Clear input
        input.value = '';
        
        UI.showToast(`📁 File added to list: ${filepath.split(/[\\/]/).pop()}`, 'info');
    },
    
    // ==========================================================================
    // BUTTON HANDLERS
    // ==========================================================================
    
    /**
     * Setup button click events
     */
    _setupButtonHandlers: function() {
        // Start Protection button
        this._addClickHandler('startMonitoringBtn', () => this._handleStartMonitoring());
        
        // Stop Protection button
        this._addClickHandler('stopMonitoringBtn', () => this._handleStopMonitoring());
        
        // Upload Files button
        this._addClickHandler('uploadAllBtn', () => this._handleUploadAll());
        
        // Clear List button
        this._addClickHandler('clearPendingBtn', () => this._handleClearPending());
        
        // Clear Logs button
        this._addClickHandler('clearLogsBtn', () => this._handleClearLogs());
        
        // Refresh buttons
        this._addClickHandler('refreshFilesBtn', () => this._refreshFileList());
        this._addClickHandler('refreshLogsBtn', () => this._refreshLogsManual());
        this._addClickHandler('refreshStatusBtn', () => this._refreshStatus());
    },
    
    /**
     * Click handler helper function
     */
    _addClickHandler: function(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', handler);
        }
    },
    
    /**
     * Start protection handler
     */
    _handleStartMonitoring: async function() {
        const btn = document.getElementById('startMonitoringBtn');
        if (btn) btn.disabled = true;
        
        try {
            const result = await ApiService.request(
                '/monitoring/start',
                { method: 'POST' }
            );
            
            if (result.success) {
                UI.showToast(`🛡️ Protection started! (${result.protected_count} files)`, 'success');
                await this._refreshStatus();
                await this._refreshLogs();
                this._startLogPolling(); // Otomatik güncelleme başlat
            } else {
                UI.showToast(`❌ ${result.error}`, 'error');
                if (btn) btn.disabled = false; // Sadece hata durumunda butonu aç
            }
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
            if (btn) btn.disabled = false; // Sadece hata durumunda butonu aç
        }
    },
    
    /**
     * Stop protection handler
     */
    _handleStopMonitoring: async function() {
        const btn = document.getElementById('stopMonitoringBtn');
        if (btn) btn.disabled = true;
        
        try {
            const result = await ApiService.request(
                '/monitoring/stop',
                { method: 'POST' }
            );
            
            if (result.success) {
                UI.showToast('🛑 Protection stopped', 'info');
                await this._refreshStatus();
                await this._refreshLogs();
                this._stopLogPolling(); // Otomatik güncellemeyi durdur
            } else {
                UI.showToast(`❌ ${result.error}`, 'error');
                if (btn) btn.disabled = false; // Sadece hata durumunda butonu aç
            }
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
            if (btn) btn.disabled = false; // Sadece hata durumunda butonu aç
        }
    },
    
    /**
     * Upload all pending files
     */
    _handleUploadAll: async function() {
        const pendingFiles = AppState.pendingFiles;
        
        if (pendingFiles.length === 0) {
            UI.showToast('No files to upload!', 'warning');
            return;
        }
        
        const btn = document.getElementById('uploadAllBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Uploading...';
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const filepath of pendingFiles) {
            try {
                const result = await ApiService.uploadFile(filepath);
                if (result.success) {
                    successCount++;
                    AppState.removePendingFile(filepath);
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
            }
        }
        
        UI.updatePendingList();
        await this._refreshFileList();
        
        if (successCount > 0) {
            UI.showToast(`✅ ${successCount} files uploaded${errorCount > 0 ? `, ${errorCount} errors` : ''}`, 'success');
        } else {
            UI.showToast(`❌ ${errorCount} files failed to upload`, 'error');
        }
        
        if (btn) {
            btn.disabled = false;
            btn.textContent = '📤 Upload All';
        }
    },
    
    /**
     * Clear pending list
     */
    _handleClearPending: function() {
        UI.showModal({
            title: 'Clear List',
            message: 'All pending files will be removed from the list. Are you sure?',
            confirmText: 'Clear',
            cancelText: 'Cancel',
            onConfirm: () => {
                AppState.clearPendingFiles();
                UI.updatePendingList();
                UI.showToast('🗑️ List cleared', 'info');
            }
        });
    },
    
    /**
     * Clear logs
     */
    _handleClearLogs: async function() {
        try {
            const result = await ApiService.request(
                '/logs',
                { method: 'DELETE' }
            );
            
            if (result.success) {
                UI.updateLogs([]);
                UI.showToast('🗑️ Logs cleared', 'info');
            }
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },
    
    // ==========================================================================
    // KEYBOARD HANDLERS
    // ==========================================================================
    
    /**
     * Setup keyboard events
     */
    _setupKeyboardHandlers: function() {
        // Enter key to add file
        const pendingInput = document.getElementById('pendingFilePath');
        if (pendingInput) {
            pendingInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('addFileForm')?.dispatchEvent(new Event('submit'));
                }
            });
        }
        
        // Enter key to upload file
        const filepathInput = document.getElementById('filepathInput');
        if (filepathInput) {
            filepathInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('uploadForm')?.dispatchEvent(new Event('submit'));
                }
            });
        }
        
        // Escape to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                UI.hideModal();
            }
        });
    },
    
    // ==========================================================================
    // DELEGATED HANDLERS (Event Delegation Pattern)
    // ==========================================================================
    
    /**
     * Event delegation for dynamic element handlers
     */
    _setupDelegatedHandlers: function() {
        // File list container
        const fileListContainer = document.getElementById('fileList');
        if (fileListContainer) {
            fileListContainer.addEventListener('click', (e) => this._handleFileListClick(e));
        }
        
        // Pending file list container
        const pendingListContainer = document.getElementById('pendingFileList');
        if (pendingListContainer) {
            pendingListContainer.addEventListener('click', (e) => this._handlePendingListClick(e));
        }
    },
    
    /**
     * Handle click events in file list (Event Delegation)
     */
    _handleFileListClick: async function(event) {
        const target = event.target;
        
        // Delete button
        if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
            const btn = target.classList.contains('delete-btn') ? target : target.closest('.delete-btn');
            const docId = btn.dataset.docId;
            
            if (docId) {
                UI.showModal({
                    title: 'Delete File',
                    message: 'This file will be permanently deleted. Are you sure?',
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    type: 'danger',
                    onConfirm: async () => {
                        await this._deleteFile(docId);
                    }
                });
            }
        }
        
        // Download button
        if (target.classList.contains('download-btn') || target.closest('.download-btn')) {
            const btn = target.classList.contains('download-btn') ? target : target.closest('.download-btn');
            const docId = btn.dataset.docId;
            
            if (docId) {
                UI.showToast('📥 Download feature coming soon...', 'info');
            }
        }
    },
    
    /**
     * Handle click events in pending list (Event Delegation)
     */
    _handlePendingListClick: function(event) {
        const target = event.target;
        
        // Remove button
        if (target.classList.contains('remove-pending-btn') || target.closest('.remove-pending-btn')) {
            const btn = target.classList.contains('remove-pending-btn') ? target : target.closest('.remove-pending-btn');
            const filepath = btn.dataset.filepath;
            
            if (filepath) {
                AppState.removePendingFile(filepath);
                UI.updatePendingList();
                UI.showToast('🗑️ File removed from list', 'info');
            }
        }
    },
    
    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================
    
    /**
     * Delete file operation
     */
    _deleteFile: async function(docId) {
        try {
            const result = await ApiService.deleteFile(docId);
            
            if (result.success) {
                UI.showToast('✅ File deleted', 'success');
                await this._refreshFileList();
            } else {
                UI.showToast(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            UI.showToast(`❌ Error: ${error.message}`, 'error');
        }
    },
    
    /**
     * Refresh file list
     */
    _refreshFileList: async function() {
        try {
            const result = await ApiService.getFiles();
            if (result.success) {
                AppState.setProtectedFiles(result.files || []);
                UI.updateFileList(result.files || []);
            }
        } catch (error) {
            console.error('File list refresh error:', error);
        }
    },
    
    /**
     * Refresh logs (normal refresh - sadece yeni loglar)
     */
    _refreshLogs: async function() {
        try {
            const result = await ApiService.request('/logs');
            if (result.success) {
                UI.updateLogs(result.logs || []); // Force refresh YOK - sadece yeni loglar eklenecek
            }
        } catch (error) {
            console.error('Log refresh error:', error);
        }
    },
    
    /**
     * Refresh status
     */
    _refreshStatus: async function() {
        try {
            const [statusResult, monitoringResult] = await Promise.all([
                ApiService.getStatus(),
                ApiService.request('/monitoring/status')
            ]);
            
            if (statusResult.success) {
                AppState.setSystemStatus(statusResult);
            }
            
            if (monitoringResult.success) {
                UI.updateMonitoringStatus(monitoringResult);
            }
        } catch (error) {
            console.error('Status refresh error:', error);
        }
    },
    
    // Log polling interval ID
    _logPollingInterval: null,
    
    /**
     * Monitoring aktifken log polling başlat (3 saniyede bir)
     */
    _startLogPolling: function() {
        // Önce varsa durdur
        this._stopLogPolling();
        
        // 3 saniyede bir kontrol et
        this._logPollingInterval = setInterval(async () => {
            await this._refreshLogs();
        }, 3000);
        
        console.log('🔄 Log polling started (3s interval)');
    },
    
    /**
     * Log polling'i durdur
     */
    _stopLogPolling: function() {
        if (this._logPollingInterval) {
            clearInterval(this._logPollingInterval);
            this._logPollingInterval = null;
            console.log('⏹️ Log polling stopped');
        }
    }
};

// Initialize module
EventHandlers.init();
