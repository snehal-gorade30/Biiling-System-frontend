import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const CreditBill = () => {
  const { t } = useLanguage();

  return (
    <div className="content-container">
      <h2 className="page-title">{t('pages.creditBill.title')}</h2>
      <div className="welcome-message">
        <p>{t('pages.creditBill.description')}</p>
        <p>{t('pages.creditBill.comingSoon')}</p>
      </div>
    </div>
  );
};

export default CreditBill;
