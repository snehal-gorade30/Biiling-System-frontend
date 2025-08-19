/**
 * Get translated text for the current language
 * @param {Object} t - The translations object
 * @param {string} key - Dot notation path to the translation (e.g., 'pages.invoice.title')
 * @returns {string} - Translated text
 */
export const getDisplayText = (t, key) => {
  if (!t || !key) return '';
  
  const keys = key.split('.');
  let result = t;
  
  for (const k of keys) {
    if (!result || typeof result !== 'object') return '';
    result = result[k];
  }
  
  // If the result is an object with language keys, return based on current language
  if (result && typeof result === 'object' && ('english' in result || 'marathi' in result)) {
    return result[t.language] || result.english || '';
  }
  
  return result || '';
};

/**
 * Format currency based on locale and currency
 * @param {number} amount - The amount to format
 * @param {string} locale - The locale (e.g., 'en-IN', 'mr-IN')
 * @param {string} currency - The currency code (e.g., 'INR')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, locale = 'en-IN', currency = 'INR') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
