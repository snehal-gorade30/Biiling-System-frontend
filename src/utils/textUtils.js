/**
 * Gets the display text based on the current language
 * @param {Object} textObj - The text object containing translations
 * @param {string} language - The current language ('en' or 'mr')
 * @param {string} [path] - Optional path for nested objects (e.g., 'paymentMethods.cash')
 * @returns {string} The translated text
 */
export const getDisplayText = (textObj, language, path) => {
  // If path is provided, resolve the nested property
  if (path) {
    const keys = path.split('.');
    let current = textObj;
    
    for (const key of keys) {
      if (current == null) return path; // Handle undefined paths
      current = current[key];
      if (current == null) return path; // Handle undefined nested properties
    }
    
    // If we found a string value, use it
    if (typeof current === 'string') {
      textObj = { english: current, marathi: current };
    } else if (current && typeof current === 'object') {
      textObj = current;
    } else {
      return path; // Fallback to path if not found
    }
  }

  // Handle the resolved text object
  if (language === 'mr') {
    return textObj.marathi || textObj.english || '';
  }
  
  // Default to English
  return textObj.english || '';
};

/**
 * Gets text with a specific path from the translations
 * @param {Object} translations - The translations object
 * @param {string} path - The path to the text (e.g., 'pages.newBill.receipt.storeName')
 * @param {string} language - The current language ('en' or 'mr')
 * @returns {string} The translated text
 */
export const getTextByPath = (translations, path, language) => {
  const keys = path.split('.');
  let current = translations;
  
  for (const key of keys) {
    if (current == null) return path; // Handle undefined paths
    current = current[key];
    if (current == null) return path; // Handle undefined nested properties
  }
  
  // If we found a string value, use it
  if (typeof current === 'string') {
    return current;
  }
  
  // If we have an object with language properties
  if (current && typeof current === 'object') {
    return language === 'mr' ? (current.marathi || current.english || path) : (current.english || path);
  }
  
  return path; // Fallback to path if not found
};
