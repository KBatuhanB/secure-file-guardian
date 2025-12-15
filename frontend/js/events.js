// ==============================================================================
// OLAY İŞLEYİCİ MODÜLÜ (events.js)
// ==============================================================================
// Hafta 4 - Form submit, button click, event delegation, keyboard events
// Frontend Developer (Üye 3) tarafından geliştirildi
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
     * Form submit olaylarını ayarlar
     */
    _setupFormHandlers: function() {
        // Dosya yükleme formu
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this._handleUploadSubmit(e));
        }
        
        // Dosya ekleme formu (pending list)
        const addFileForm = document.getElementById('addFileForm');
        if (addFileForm) {
            addFileForm.addEventListener('submit', (e) => this._handleAddFileSubmit(e));
        }
    },
    
    /**
     * Dosya yükleme form submit handler
     */
    _handleUploadSubmit: async function(event) {
        event.preventDefault();
        
        const filepathInput = document.getElementById('filepathInput');
        const filepath = filepathInput?.value?.trim();
        
        if (!filepath) {
            UI.showToast('Lütfen dosya yolu girin!', 'warning');
            return;
        }
        
        // Loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Yükleniyor...';
        }
        
        try {
            const result = await ApiService.uploadFile(filepath);
            
            if (result.success) {
                UI.showToast(`✅ ${result.message}`, 'success');
                filepathInput.value = '';
                
                // Dosya listesini güncelle
                await this._refreshFileList();
            } else {
                UI.showToast(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            UI.showToast(`❌ Hata: ${error.message}`, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },
    
    /**
     * Dosya ekleme (pending list) form submit handler
     */
    _handleAddFileSubmit: function(event) {
        event.preventDefault();
        
        const input = document.getElementById('pendingFilePath');
        const filepath = input?.value?.trim();
        
        if (!filepath) {
            UI.showToast('Lütfen dosya yolu girin!', 'warning');
            return;
        }
        
        // State'e ekle
        AppState.addPendingFile(filepath);
        
        // UI güncelle
        UI.updatePendingList();
        
        // Input temizle
        input.value = '';
        
        UI.showToast(`📁 Dosya listeye eklendi: ${filepath.split(/[\\/]/).pop()}`, 'info');
    },
    
    // ==========================================================================
    // BUTTON HANDLERS
    // ==========================================================================
    
    /**
     * Buton click olaylarını ayarlar
     */
    _setupButtonHandlers: function() {
        // Korumayı Başlat butonu
        this._addClickHandler('startMonitoringBtn', () => this._handleStartMonitoring());
        
        // Korumayı Durdur butonu
        this._addClickHandler('stopMonitoringBtn', () => this._handleStopMonitoring());
        
        // Dosyaları Yükle butonu
        this._addClickHandler('uploadAllBtn', () => this._handleUploadAll());
        
        // Listeyi Temizle butonu
        this._addClickHandler('clearPendingBtn', () => this._handleClearPending());
        
        // Logları Temizle butonu
        this._addClickHandler('clearLogsBtn', () => this._handleClearLogs());
        
        // Yenile butonları
        this._addClickHandler('refreshFilesBtn', () => this._refreshFileList());
        this._addClickHandler('refreshLogsBtn', () => this._refreshLogs());
        this._addClickHandler('refreshStatusBtn', () => this._refreshStatus());
    },
    
    /**
     * Click handler ekleme yardımcı fonksiyonu
     */
    _addClickHandler: function(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', handler);
        }
    },
    
    /**
     * Korumayı başlat handler
     */
    _handleStartMonitoring: async function() {
        const btn = document.getElementById('startMonitoringBtn');
        if (btn) btn.disabled = true;
        
        try {
            const result = await ApiService.request(
                CONFIG.API_BASE_URL + '/monitoring/start',
                { method: 'POST' }
            );
            
            if (result.success) {
                UI.showToast(`🛡️ Koruma başlatıldı! (${result.protected_count} dosya)`, 'success');
                await this._refreshStatus();
            } else {
                UI.showToast(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            UI.showToast(`❌ Hata: ${error.message}`, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    },
    
    /**
     * Korumayı durdur handler
     */
    _handleStopMonitoring: async function() {
        const btn = document.getElementById('stopMonitoringBtn');
        if (btn) btn.disabled = true;
        
        try {
            const result = await ApiService.request(
                CONFIG.API_BASE_URL + '/monitoring/stop',
                { method: 'POST' }
            );
            
            if (result.success) {
                UI.showToast('🛑 Koruma durduruldu', 'info');
                await this._refreshStatus();
            } else {
                UI.showToast(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            UI.showToast(`❌ Hata: ${error.message}`, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    },
    
    /**
     * Tüm pending dosyaları yükle
     */
    _handleUploadAll: async function() {
        const pendingFiles = AppState.pendingFiles;
        
        if (pendingFiles.length === 0) {
            UI.showToast('Yüklenecek dosya yok!', 'warning');
            return;
        }
        
        const btn = document.getElementById('uploadAllBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Yükleniyor...';
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
            UI.showToast(`✅ ${successCount} dosya yüklendi${errorCount > 0 ? `, ${errorCount} hata` : ''}`, 'success');
        } else {
            UI.showToast(`❌ ${errorCount} dosya yüklenemedi`, 'error');
        }
        
        if (btn) {
            btn.disabled = false;
            btn.textContent = '📤 Tümünü Yükle';
        }
    },
    
    /**
     * Pending listesini temizle
     */
    _handleClearPending: function() {
        UI.showModal({
            title: 'Listeyi Temizle',
            message: 'Bekleyen tüm dosyalar listeden kaldırılacak. Emin misiniz?',
            confirmText: 'Temizle',
            cancelText: 'İptal',
            onConfirm: () => {
                AppState.clearPendingFiles();
                UI.updatePendingList();
                UI.showToast('🗑️ Liste temizlendi', 'info');
            }
        });
    },
    
    /**
     * Logları temizle
     */
    _handleClearLogs: async function() {
        try {
            const result = await ApiService.request(
                CONFIG.API_BASE_URL + '/logs',
                { method: 'DELETE' }
            );
            
            if (result.success) {
                UI.updateLogs([]);
                UI.showToast('🗑️ Loglar temizlendi', 'info');
            }
        } catch (error) {
            UI.showToast(`❌ Hata: ${error.message}`, 'error');
        }
    },
    
    // ==========================================================================
    // KEYBOARD HANDLERS
    // ==========================================================================
    
    /**
     * Keyboard olaylarını ayarlar
     */
    _setupKeyboardHandlers: function() {
        // Enter tuşu ile dosya ekleme
        const pendingInput = document.getElementById('pendingFilePath');
        if (pendingInput) {
            pendingInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('addFileForm')?.dispatchEvent(new Event('submit'));
                }
            });
        }
        
        // Enter tuşu ile dosya yükleme
        const filepathInput = document.getElementById('filepathInput');
        if (filepathInput) {
            filepathInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('uploadForm')?.dispatchEvent(new Event('submit'));
                }
            });
        }
        
        // Escape ile modal kapatma
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
     * Event delegation ile dinamik element handler'ları
     */
    _setupDelegatedHandlers: function() {
        // Dosya listesi container'ı
        const fileListContainer = document.getElementById('fileList');
        if (fileListContainer) {
            fileListContainer.addEventListener('click', (e) => this._handleFileListClick(e));
        }
        
        // Pending dosya listesi container'ı
        const pendingListContainer = document.getElementById('pendingFileList');
        if (pendingListContainer) {
            pendingListContainer.addEventListener('click', (e) => this._handlePendingListClick(e));
        }
    },
    
    /**
     * Dosya listesindeki click olaylarını yönetir (Event Delegation)
     */
    _handleFileListClick: async function(event) {
        const target = event.target;
        
        // Silme butonu
        if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
            const btn = target.classList.contains('delete-btn') ? target : target.closest('.delete-btn');
            const docId = btn.dataset.docId;
            
            if (docId) {
                UI.showModal({
                    title: 'Dosyayı Sil',
                    message: 'Bu dosya kalıcı olarak silinecek. Emin misiniz?',
                    confirmText: 'Sil',
                    cancelText: 'İptal',
                    type: 'danger',
                    onConfirm: async () => {
                        await this._deleteFile(docId);
                    }
                });
            }
        }
        
        // İndir butonu
        if (target.classList.contains('download-btn') || target.closest('.download-btn')) {
            const btn = target.classList.contains('download-btn') ? target : target.closest('.download-btn');
            const docId = btn.dataset.docId;
            
            if (docId) {
                UI.showToast('📥 İndirme özelliği yakında eklenecek...', 'info');
            }
        }
    },
    
    /**
     * Pending listesindeki click olaylarını yönetir (Event Delegation)
     */
    _handlePendingListClick: function(event) {
        const target = event.target;
        
        // Kaldır butonu
        if (target.classList.contains('remove-pending-btn') || target.closest('.remove-pending-btn')) {
            const btn = target.classList.contains('remove-pending-btn') ? target : target.closest('.remove-pending-btn');
            const filepath = btn.dataset.filepath;
            
            if (filepath) {
                AppState.removePendingFile(filepath);
                UI.updatePendingList();
                UI.showToast('🗑️ Dosya listeden kaldırıldı', 'info');
            }
        }
    },
    
    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================
    
    /**
     * Dosya silme işlemi
     */
    _deleteFile: async function(docId) {
        try {
            const result = await ApiService.deleteFile(docId);
            
            if (result.success) {
                UI.showToast('✅ Dosya silindi', 'success');
                await this._refreshFileList();
            } else {
                UI.showToast(`❌ ${result.error}`, 'error');
            }
        } catch (error) {
            UI.showToast(`❌ Hata: ${error.message}`, 'error');
        }
    },
    
    /**
     * Dosya listesini yenile
     */
    _refreshFileList: async function() {
        try {
            const result = await ApiService.getFiles();
            if (result.success) {
                AppState.setProtectedFiles(result.files || []);
                UI.updateFileList(result.files || []);
            }
        } catch (error) {
            console.error('Dosya listesi yenileme hatası:', error);
        }
    },
    
    /**
     * Logları yenile
     */
    _refreshLogs: async function() {
        try {
            const result = await ApiService.request(CONFIG.API_BASE_URL + '/logs');
            if (result.success) {
                UI.updateLogs(result.logs || []);
            }
        } catch (error) {
            console.error('Log yenileme hatası:', error);
        }
    },
    
    /**
     * Durumu yenile
     */
    _refreshStatus: async function() {
        try {
            const [statusResult, monitoringResult] = await Promise.all([
                ApiService.getStatus(),
                ApiService.request(CONFIG.API_BASE_URL + '/monitoring/status')
            ]);
            
            if (statusResult.success) {
                AppState.setSystemStatus(statusResult);
            }
            
            if (monitoringResult.success) {
                UI.updateMonitoringStatus(monitoringResult);
            }
        } catch (error) {
            console.error('Durum yenileme hatası:', error);
        }
    }
};

// Modülü başlat
EventHandlers.init();
