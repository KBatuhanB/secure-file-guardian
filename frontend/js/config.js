// ==============================================================================
// YAPILANDIRMA MODÜLÜ (config.js)
// ==============================================================================
// Hafta 3 - API yapılandırması ve sabitler
// Tüm API endpoint'leri ve ayarları burada tanımlanır
// ==============================================================================

/**
 * Uygulama yapılandırma nesnesi
 * API base URL ve diğer sabitler burada tutulur
 */
const CONFIG = {
    // API temel adresi
    API_BASE_URL: '/api',
    
    // Endpoint'ler
    ENDPOINTS: {
        HEALTH: '/health',
        STATUS: '/status',
        FILES: '/files',
        UPLOAD: '/files/upload'
    },
    
    // Polling aralığı (milisaniye)
    POLL_INTERVAL: 5000,
    
    // Toast bildirim süresi (milisaniye)
    TOAST_DURATION: 3000
};

// Modülü global scope'a aktar
window.CONFIG = CONFIG;
