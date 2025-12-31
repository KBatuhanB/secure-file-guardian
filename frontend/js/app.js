// ==============================================================================
// ANA UYGULAMA MODÜLÜ (app.js) - FILE GUARDIAN
// ==============================================================================
// Hafta 5 (Final) - Tüm modüllerin birleştirilmesi ve başlatılması
// 
// Bu modül uygulamanın ana giriş noktasıdır:
//   - Tüm JavaScript modüllerini başlatır
//   - Polling mekanizması ile otomatik güncelleme sağlar
//   - Console logging ve debugging araçları sunar
//   - Application lifecycle yönetimi yapar
//
// MODÜL BAĞIMLILIKLARI:
//   1. config.js   - API yapılandırması ve sabitler
//   2. state.js    - Uygulama durum yönetimi
//   3. api.js      - Backend API servisi
//   4. ui.js       - Kullanıcı arayüzü bileşenleri
//   5. events.js   - Olay işleyicileri
//
// Geliştirici: Frontend Developer (Üye 3)
// Son Güncelleme: Hafta 5 - Final Sprint
// ==============================================================================

/**
 * App - Ana Uygulama Modülü
 * 
 * File Guardian uygulamasının merkezi kontrol noktası.
 * Singleton pattern ile implement edilmiştir.
 * 
 * @namespace
 */
const App = {
    
    // =========================================================================
    // UYGULAMA DURUMU
    // =========================================================================
    
    /** @type {boolean} Uygulama başlatıldı mı? */
    _initialized: false,
    
    /** @type {number|null} Polling interval ID */
    _pollingIntervalId: null,
    
    /** @type {number} Polling aralığı (ms) */
    _pollingInterval: 5000,
    
    /** @type {boolean} Polling aktif mi? */
    _isPolling: false,
    
    /** @type {string} Uygulama versiyonu */
    version: '1.0.0',
    
    // =========================================================================
    // BAŞLATMA
    // =========================================================================
    
    /**
     * Uygulamayı başlatır.
     * 
     * DOMContentLoaded event'i ile otomatik olarak çağrılır.
     * Tüm modüller sırasıyla başlatılır ve ilk veriler yüklenir.
     * 
     * @returns {Promise<void>}
     */
    init: async function() {
        // Çift başlatmayı önle
        if (this._initialized) {
            console.warn('⚠️ Uygulama zaten başlatılmış!');
            return;
        }
        
        console.log('');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  🛡️  FILE GUARDIAN - Güvenli Dosya Koruma Sistemi        ║');
        console.log('║  📦  Version: ' + this.version + '                                      ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('');
        
        try {
            // 1. Modülleri başlat
            console.log('📋 Modüller başlatılıyor...');
            this._initModules();
            
            // 2. İlk verileri yükle
            console.log('📡 İlk veriler yükleniyor...');
            await this._loadInitialData();
            
            // 3. Polling'i başlat
            console.log('⏱️ Polling başlatılıyor...');
            this._startPolling();
            
            // 4. Başlatma tamamlandı
            this._initialized = true;
            console.log('');
            console.log('✅ File Guardian başarıyla başlatıldı!');
            console.log('');
            
            // Debug bilgisi
            this._logDebugInfo();
            
        } catch (error) {
            console.error('❌ Uygulama başlatma hatası:', error);
            UI.showToast('Uygulama başlatılırken hata oluştu!', 'error');
        }
    },
    
    /**
     * Tüm modülleri başlatır.
     * 
     * @private
     */
    _initModules: function() {
        // UI modülünü başlat (Toast, Modal vb.)
        if (typeof UI !== 'undefined') {
            UI.init();
            console.log('  ✓ UI modülü hazır');
        }
        
        // Event handlers'ı başlat
        if (typeof EventHandlers !== 'undefined') {
            EventHandlers.init();
            console.log('  ✓ Event handlers hazır');
        }
        
        // State modülünü kontrol et
        if (typeof AppState !== 'undefined') {
            console.log('  ✓ State modülü hazır');
        }
        
        // API modülünü kontrol et
        if (typeof ApiService !== 'undefined') {
            console.log('  ✓ API servisi hazır');
        }
        
        // Config modülünü kontrol et
        if (typeof CONFIG !== 'undefined') {
            console.log('  ✓ Config modülü hazır');
        }
    },
    
    /**
     * İlk verileri backend'den yükler.
     * 
     * @private
     * @returns {Promise<void>}
     */
    _loadInitialData: async function() {
        try {
            // Sistem durumunu al
            const statusResult = await ApiService.getStatus();
            if (statusResult.success) {
                AppState.updateSystemStatus({
                    backend: true,
                    firebase: statusResult.firebase?.connected || false,
                    monitoring: statusResult.monitoring?.is_running || false
                });
                console.log('  ✓ Sistem durumu alındı');
            }
            
            // Korunan dosyaları al
            const filesResult = await ApiService.getFiles();
            if (filesResult.success) {
                AppState.setProtectedFiles(filesResult.files || []);
                UI.updateFileList(filesResult.files || []);
                console.log(`  ✓ ${filesResult.count || 0} korunan dosya yüklendi`);
            }
            
            // Logları al
            const logsResult = await ApiService.getLogs();
            if (logsResult.success) {
                UI.updateLogs(logsResult.logs || []);
                console.log(`  ✓ ${logsResult.count || 0} log kaydı yüklendi`);
            }
            
            // İzleme durumunu al ve UI'ı güncelle
            const monitoringResult = await ApiService.getMonitoringStatus();
            if (monitoringResult.success) {
                UI.updateMonitoringStatus(monitoringResult);
                console.log('  ✓ İzleme durumu güncellendi');
            }
            
        } catch (error) {
            console.error('  ✗ Veri yükleme hatası:', error);
            AppState.updateSystemStatus({ backend: false });
        }
    },
    
    // =========================================================================
    // POLLING MEKANİZMASI
    // =========================================================================
    
    /**
     * Otomatik güncelleme polling'ini başlatır.
     * 
     * Belirli aralıklarla backend'den veri çekerek UI'ı güncel tutar.
     * 
     * @private
     */
    _startPolling: function() {
        if (this._isPolling) {
            console.warn('⚠️ Polling zaten aktif!');
            return;
        }
        
        this._isPolling = true;
        
        // Polling interval'ını ayarla
        this._pollingIntervalId = setInterval(async () => {
            await this._pollData();
        }, this._pollingInterval);
        
        console.log(`  ✓ Polling başlatıldı (${this._pollingInterval / 1000}s aralıkla)`);
    },
    
    /**
     * Polling'i durdurur.
     * 
     * @private
     */
    _stopPolling: function() {
        if (this._pollingIntervalId) {
            clearInterval(this._pollingIntervalId);
            this._pollingIntervalId = null;
        }
        this._isPolling = false;
        console.log('⏹️ Polling durduruldu');
    },
    
    /**
     * Tek bir polling döngüsünü gerçekleştirir.
     * 
     * @private
     * @returns {Promise<void>}
     */
    _pollData: async function() {
        try {
            // Sistem durumunu güncelle
            const statusResult = await ApiService.getStatus();
            if (statusResult.success) {
                AppState.updateSystemStatus({
                    backend: true,
                    firebase: statusResult.firebase?.connected || false,
                    monitoring: statusResult.monitoring?.is_running || false
                });
            }
            
            // İzleme durumunu güncelle
            const monitoringResult = await ApiService.getMonitoringStatus();
            if (monitoringResult.success) {
                UI.updateMonitoringStatus(monitoringResult);
            }
            
            // Logları güncelle
            const logsResult = await ApiService.getLogs();
            if (logsResult.success) {
                UI.updateLogs(logsResult.logs || []);
            }
            
        } catch (error) {
            // Bağlantı hatası - sessizce logla
            AppState.updateSystemStatus({ backend: false });
        }
    },
    
    // =========================================================================
    // PUBLIC API
    // =========================================================================
    
    /**
     * Dosya listesini manuel olarak yeniler.
     * 
     * @returns {Promise<void>}
     */
    refreshFiles: async function() {
        try {
            const result = await ApiService.getFiles();
            if (result.success) {
                AppState.setProtectedFiles(result.files || []);
                UI.updateFileList(result.files || []);
                UI.showToast('Dosya listesi güncellendi', 'success');
            }
        } catch (error) {
            UI.showToast('Dosya listesi güncellenemedi', 'error');
        }
    },
    
    /**
     * Logları manuel olarak yeniler.
     * 
     * @returns {Promise<void>}
     */
    refreshLogs: async function() {
        try {
            const result = await ApiService.getLogs();
            if (result.success) {
                UI.updateLogs(result.logs || []);
            }
        } catch (error) {
            console.error('Log güncelleme hatası:', error);
        }
    },
    
    /**
     * Polling aralığını değiştirir.
     * 
     * @param {number} intervalMs - Yeni polling aralığı (milisaniye)
     */
    setPollingInterval: function(intervalMs) {
        if (intervalMs < 1000) {
            console.warn('⚠️ Minimum polling aralığı 1 saniyedir!');
            intervalMs = 1000;
        }
        
        this._pollingInterval = intervalMs;
        
        // Aktif polling varsa yeniden başlat
        if (this._isPolling) {
            this._stopPolling();
            this._startPolling();
        }
        
        console.log(`⏱️ Polling aralığı ${intervalMs / 1000}s olarak ayarlandı`);
    },
    
    // =========================================================================
    // DEBUGGING
    // =========================================================================
    
    /**
     * Debug bilgilerini konsola yazdırır.
     * 
     * @private
     */
    _logDebugInfo: function() {
        console.log('📊 Debug Bilgisi:');
        console.log('  - API Base URL:', CONFIG?.API_BASE_URL || 'Tanımsız');
        console.log('  - Polling Interval:', this._pollingInterval + 'ms');
        console.log('  - Pending Files:', AppState?.pendingFiles?.length || 0);
        console.log('  - Protected Files:', AppState?.protectedFiles?.length || 0);
    },
    
    /**
     * Uygulama durumunu döndürür (debugging için).
     * 
     * @returns {Object} Uygulama durumu
     */
    getStatus: function() {
        return {
            initialized: this._initialized,
            version: this.version,
            polling: {
                active: this._isPolling,
                interval: this._pollingInterval
            },
            state: {
                pendingFiles: AppState?.pendingFiles?.length || 0,
                protectedFiles: AppState?.protectedFiles?.length || 0,
                systemStatus: AppState?.systemStatus || {}
            },
            modules: {
                config: typeof CONFIG !== 'undefined',
                state: typeof AppState !== 'undefined',
                api: typeof ApiService !== 'undefined',
                ui: typeof UI !== 'undefined',
                events: typeof EventHandlers !== 'undefined'
            }
        };
    }
};


// =============================================================================
// DOMContentLoaded - UYGULAMA BAŞLATMA
// =============================================================================
// Sayfa yüklendiğinde uygulamayı başlat

document.addEventListener('DOMContentLoaded', function() {
    // Uygulamayı başlat
    App.init();
});


// =============================================================================
// GLOBAL HATA YAKALAMA
// =============================================================================
// Yakalanmamış hataları logla

window.addEventListener('error', function(event) {
    console.error('🔴 Yakalanmamış hata:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('🔴 Yakalanmamış Promise rejection:', event.reason);
});


// =============================================================================
// EXPORT (Global Scope)
// =============================================================================
// App nesnesini global scope'a ekle (debugging için)

window.FileGuardian = App;
