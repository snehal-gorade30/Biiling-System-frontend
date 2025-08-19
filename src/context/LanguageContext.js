import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [activeLanguage, setActiveLanguage] = useState('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setLanguage(savedLanguage);
    setActiveLanguage(savedLanguage);
  }, []);

  const changeLanguage = (lang) => {
    console.log('Changing language to:', lang);
    setLanguage(lang);
    setActiveLanguage(lang);
    localStorage.setItem('language', lang);
  };

  // Helper function to get nested translation
  const getNestedTranslation = (translations, key) => {
    const keys = key.split('.');
    let result = translations;
    
    for (const k of keys) {
      if (!result || typeof result !== 'object' || !(k in result)) {
        console.error(`Translation key not found: ${key} (at ${k})`);
        return null;
      }
      result = result[k];
    }
    
    return result;
  };

  // Helper function to get translated text
  const t = (key) => {
    if (!key) return '';
    
    try {
      // For bilingual mode, show both English and Marathi
      if (language === 'bilingual') {
        const enText = getNestedTranslation(translations['en'], key) || key;
        const mrText = getNestedTranslation(translations['mr'], key) || key;
        return (
          <>
            <div>{enText}</div>
            <div style={{ fontSize: '0.9em', color: '#666' }}>{mrText}</div>
          </>
        );
      }
      
      // For single language mode
      const langToUse = language === 'bilingual' ? 'en' : language;
      const langTranslations = translations[langToUse] || translations['en'];
      return getNestedTranslation(langTranslations, key) || key;
      
    } catch (error) {
      console.error('Translation error:', error);
      return key;
    }
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      activeLanguage,
      changeLanguage, 
      t 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
