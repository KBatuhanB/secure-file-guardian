// ==============================================================================
// API SERVİS MODÜLÜ (api.js)
// ==============================================================================
// Hafta 3 - Backend ile iletişim
// Fetch API kullanarak RESTful istekler yapılır
// ==============================================================================

/**
 * API Servis nesnesi
 * Backend ile tüm iletişim bu modül üzerinden yapılır
 */
const ApiService = {
    
    /**
     * Genel API isteği yapan yardımcı fonksiyon
     * @param {string} endpoint - API endpoint'i
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} - JSON response
     */
    async request(endpoint, options = {}) {
        try {
            const url = CONFIG.API_BASE_URL + endpoint;
            
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();
            
            return data;
            
        } catch (error) {
            console.error('API Hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Sunucu sağlık kontrolü
     * @returns {Promise<Object>}
     */
    async healthCheck() {
        return this.request(CONFIG.ENDPOINTS.HEALTH);
    },
    
    /**
     * Sistem durumunu getirir
     * @returns {Promise<Object>}
     */
    async getStatus() {
        return this.request(CONFIG.ENDPOINTS.STATUS);
    },
    
    /**
     * Korunan dosyaları listeler
     * @returns {Promise<Object>}
     */
    async getFiles() {
        return this.request(CONFIG.ENDPOINTS.FILES);
    },
    
    /**
     * Dosya yükler
     * @param {string} filepath - Dosya yolu
     * @returns {Promise<Object>}
     */
    async uploadFile(filepath) {
        return this.request(CONFIG.ENDPOINTS.UPLOAD, {
            method: 'POST',
            body: JSON.stringify({ filepath })
        });
    },
    
    /**
     * Dosya siler
     * @param {string} docId - Döküman ID'si
     * @returns {Promise<Object>}
     */
    async deleteFile(docId) {
        return this.request(`${CONFIG.ENDPOINTS.FILES}/${docId}`, {
            method: 'DELETE'
        });
    }
};

// Modülü global scope'a aktar
window.ApiService = ApiService;
