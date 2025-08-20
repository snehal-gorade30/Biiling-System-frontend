import React from 'react';
import { Phone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const { t } = useLanguage();

  return (
    <header className="header">
      <h1>{t('header.title')}</h1>
      <div className="header-right">
        <LanguageSwitcher />
        <div className="support-info">
          <Phone size={16} />
          <span>{t('header.customerSupport')}</span>
          <span className="support-number">+918149491025</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
