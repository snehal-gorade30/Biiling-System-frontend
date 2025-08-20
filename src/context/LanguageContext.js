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
  const t = (key, isOption = false) => {
    if (!key) return '';
    
    try {
      // For bilingual mode, show both English and Marathi
      if (language === 'bilingual' && !isOption) {
        const enText = getNestedTranslation(translations['en'], key) || key;
        const mrText = getNestedTranslation(translations['mr'], key) || key;
        return (
          <span>
            <span>{enText}</span>
            <span style={{ display: 'block', fontSize: '0.9em', color: '#666' }}>{mrText}</span>
          </span>
        );
      }
      
      // For single language mode or when inside option elements
      const langToUse = language === 'bilingual' ? 'en' : language;
      const langTranslations = translations[langToUse] || translations['en'];
      const text = getNestedTranslation(langTranslations, key) || key;
      
      // Return plain text for option elements to prevent hydration errors
      if (isOption) {
        return text;
      }
      
      return <span>{text}</span>;
      
    } catch (error) {
      console.error('Translation error:', error);
      return isOption ? key : <span>{key}</span>;
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
