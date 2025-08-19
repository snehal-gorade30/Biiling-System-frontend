import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useLanguage();

  // Handle language change
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    changeLanguage(newLang);
  };

  return (
    <div className="language-switcher">
      <Globe size={16} />
      <select 
        value={language} 
        onChange={handleLanguageChange}
        className="language-select"
      >
        <option value="en">English</option>
        <option value="mr">मराठी</option>
        <option value="bilingual">मराठी/English</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
