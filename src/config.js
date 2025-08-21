const API_CONFIG = {
  BASE_URL: 'http://localhost:8080',
  ENDPOINTS: {
    ITEMS: '/api/items',
    ITEMS_BY_BARCODE: (barcode) => `/api/items/barcode/${barcode}`,
    ITEMS_SEARCH: '/api/items/search',
  },
};

export default API_CONFIG;
