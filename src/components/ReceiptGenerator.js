import React from 'react';
import { generateReceipt } from '../utils/receiptGenerator';

const ReceiptGenerator = ({ 
  orderData, 
  buttonText = 'Print Receipt', 
  className = '',
  onPrintComplete = () => {},
  language = 'en'
}) => {
  const handlePrint = () => {
    try {
      // Add timestamp to order data
      const receiptData = {
        ...orderData,
        date: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };
      
      generateReceipt(receiptData, language);
      onPrintComplete(true);
    } catch (error) {
      console.error('Error generating receipt:', error);
      onPrintComplete(false, error);
    }
  };

  return (
    <button 
      onClick={handlePrint}
      className={`${className} bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200`}
      disabled={!orderData || !orderData.items || orderData.items.length === 0}
    >
      {buttonText}
    </button>
  );
};

export default ReceiptGenerator;
