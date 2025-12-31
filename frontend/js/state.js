// ==============================================================================
// DURUM YÖNETİMİ MODÜLÜ (state.js)
// ==============================================================================
// Hafta 3 - Uygulama durumunu yönetir
// Dosya listesi, bekleyen dosyalar ve sistem durumu burada tutulur
// ==============================================================================

/**
 * Uygulama durum nesnesi
 * Tüm uygulama durumu burada merkezi olarak yönetilir
 */
const AppState = {
    // Eklenmeyi bekleyen dosya yolları (henüz yüklenmemiş)
    pendingFiles: [],
    
    // Korunan dosyalar listesi (Firestore'dan gelen)
    protectedFiles: [],
    
    // Sistem durumu
    systemStatus: {
        serverOnline: false,
        firebaseConnected: false,
        encryptionReady: false
    },
    
    // Yükleme durumu
    isLoading: false,
    
    /**
     * Bekleyen dosya ekler
     * @param {string} filepath - Dosya yolu
     */
    addPendingFile: function(filepath) {
        if (!this.pendingFiles.includes(filepath)) {
            this.pendingFiles.push(filepath);
        }
    },
    
    /**
     * Bekleyen dosyayı kaldırır
     * @param {string} filepath - Dosya yolu
     */
    removePendingFile: function(filepath) {
        const index = this.pendingFiles.indexOf(filepath);
        if (index > -1) {
            this.pendingFiles.splice(index, 1);
        }
    },
    
    /**
     * Tüm bekleyen dosyaları temizler
     */
    clearPendingFiles: function() {
        this.pendingFiles = [];
    },
    
    /**
     * Korunan dosyaları günceller
     * @param {Array} files - Dosya listesi
     */
    setProtectedFiles: function(files) {
        this.protectedFiles = files || [];
    },
    
    /**
     * Sistem durumunu günceller
     * @param {Object} status - Durum bilgisi
     */
    updateSystemStatus: function(status) {
        this.systemStatus = {
            serverOnline: status.success || false,
            firebaseConnected: status.firebase?.connected || false,
            encryptionReady: status.encryption?.key_loaded || false
        };
    },
    
    /**
     * Sistem durumunu ayarlar (alias for updateSystemStatus)
     * @param {Object} status - Durum bilgisi
     */
    setSystemStatus: function(status) {
        this.updateSystemStatus(status);
    }
};

// Modülü global scope'a aktar
window.AppState = AppState;
