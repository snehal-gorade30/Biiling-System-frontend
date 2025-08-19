import React, { useState, useEffect } from 'react';
import { Search, FileText, Printer, Trash2, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations/translations';
import { getDisplayText } from '../utils/textUtils';

const ManageInvoices = () => {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInvoices = async (searchQuery = '') => {
    try {
      setLoading(true);
      setError('');
      // TODO: Replace with actual API endpoint
      const response = await fetch(`http://localhost:8080/api/bills/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      setError(getDisplayText({
        marathi: 'चलन मिळवताना त्रुटी आली',
        english: 'Error fetching invoices'
      }, language));
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInvoices(searchTerm);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>{getDisplayText({
          marathi: 'चलन व्यवस्थापन',
          english: 'Invoice Management'
        }, language)}</h2>
      </div>

      <div className="search-container">
        <form onSubmit={handleSearch}>
          <div className="search-input">
            <input
              type="text"
              placeholder={getDisplayText({
                marathi: 'चलन क्रमांक, ग्राहकाचे नाव किंवा फोन नंबर शोधा',
                english: 'Search by invoice number, customer name or phone'
              }, language)}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">
              <Search size={18} />
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="loading">
          {getDisplayText({
            marathi: 'लोड होत आहे...',
            english: 'Loading...'
          }, language)}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="invoices-list">
        {invoices.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>{getDisplayText({ marathi: 'चलन क्र.', english: 'Invoice #' }, language)}</th>
                <th>{getDisplayText({ marathi: 'तारीख', english: 'Date' }, language)}</th>
                <th>{getDisplayText({ marathi: 'ग्राहक', english: 'Customer' }, language)}</th>
                <th>{getDisplayText({ marathi: 'एकूण रक्कम', english: 'Total Amount' }, language)}</th>
                <th>{getDisplayText({ marathi: 'कृती', english: 'Actions' }, language)}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.billNumber}</td>
                  <td>{formatDate(invoice.billDate)}</td>
                  <td>{invoice.customerName || '-'}</td>
                  <td>{formatCurrency(invoice.grandTotal)}</td>
                  <td className="actions">
                    <button className="btn-icon" title={getDisplayText({
                      marathi: 'पहा',
                      english: 'View'
                    }, language)}>
                      <Eye size={16} />
                    </button>
                    <button className="btn-icon" title={getDisplayText({
                      marathi: 'प्रिंट करा',
                      english: 'Print'
                    }, language)}>
                      <Printer size={16} />
                    </button>
                    <button className="btn-icon danger" title={getDisplayText({
                      marathi: 'हटवा',
                      english: 'Delete'
                    }, language)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !loading && (
            <div className="no-results">
              <FileText size={48} />
              <p>{getDisplayText({
                marathi: 'कोणतीही चलने सापडली नाहीत',
                english: 'No invoices found'
              }, language)}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ManageInvoices;
