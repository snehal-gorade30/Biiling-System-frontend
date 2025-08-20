import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Search, Download, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/bills';

const ManageInvoices = () => {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all',
  });

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (debouncedSearchTerm) params.append('q', debouncedSearchTerm);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.type !== 'all') params.append('type', filters.type);
      
      const response = await axios.get(`${API_BASE_URL}/search?${params.toString()}`);
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error(t('pages.manageInvoices.error.fetchingInvoices'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filters, t]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDelete = async (id) => {
    if (window.confirm(t('pages.manageInvoices.confirm.deleteInvoice', true))) {
      try {
        await axios.delete(`${API_BASE_URL}/${id}`);
        setInvoices(invoices.filter(invoice => invoice.id !== id));
        toast.success(t('pages.manageInvoices.success.invoiceDeleted'));
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error(t('pages.manageInvoices.error.deletingInvoice'));
      }
    }
  };

  const handleDownloadPdf = async (id, invoiceNumber) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(t('pages.manageInvoices.error.downloadingPdf'));
    }
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: 'all',
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === '' || 
      (invoice.billNumber && invoice.billNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.customerName && invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.customerPhone && invoice.customerPhone.includes(searchTerm));
    
    const matchesDate = (!filters.startDate || new Date(invoice.billDate) >= new Date(filters.startDate)) &&
      (!filters.endDate || new Date(invoice.billDate) <= new Date(filters.endDate + 'T23:59:59'));
    
    const matchesType = filters.type === 'all' || invoice.type === filters.type;
    
    return matchesSearch && matchesDate && matchesType;
  });

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <h1>{t('pages.manageInvoices.title')}</h1>
          <span className="description">{t('pages.manageInvoices.description')}</span>
        </div>
      </header>

      <div className="search-filter-container">
        <div className="search-container">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder={t('pages.manageInvoices.searchPlaceholder', true)}
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <label>{t('pages.manageInvoices.filters.startDate')}</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>{t('pages.manageInvoices.filters.endDate')}</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>{t('pages.manageInvoices.filters.paymentType')}</label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="all">{t('pages.manageInvoices.filters.allTypes', true)}</option>
              <option value="CASH">{t('pages.manageInvoices.filters.cash', true)}</option>
              <option value="CREDIT">{t('pages.manageInvoices.filters.credit', true)}</option>
            </select>
          </div>
          
          <button 
            onClick={resetFilters}
            className="clear-filters"
          >
            {t('common.clear')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>{t('pages.viewItems.loading')}</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="no-items">
          <p>{t('pages.manageInvoices.noInvoices')}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('pages.manageInvoices.table.invoiceNumber')}</th>
                <th>{t('pages.manageInvoices.table.customer')}</th>
                <th>{t('pages.manageInvoices.table.date')}</th>
                <th>{t('pages.manageInvoices.table.amount')}</th>
                <th>{t('pages.manageInvoices.table.status')}</th>
                <th className="text-right">{t('pages.manageInvoices.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="data-row">
                  <td className="font-medium">{invoice.billNumber}</td>
                  <td>
                    <div className="customer-cell">
                      <span className="customer-name">{invoice.customerName || 'Walk-in Customer'}</span>
                      {invoice.phoneNumber && (
                        <span className="customer-phone">{invoice.phoneNumber}</span>
                      )}
                    </div>
                  </td>
                  <td>{format(parseISO(invoice.billDate), 'dd MMM yyyy')}</td>
                  <td className="font-medium">₹{invoice.grandTotal?.toFixed(2) || '0.00'}</td>
                  <td>
                    <span className={`status-badge ${invoice.type === 'CREDIT' ? 'credit' : 'paid'}`}>
                      {invoice.type === 'CREDIT' 
                        ? t('pages.manageInvoices.table.credit')
                        : t('pages.manageInvoices.table.paid')}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      onClick={() => handleDownloadPdf(invoice.id, invoice.billNumber)}
                      className="icon-btn"
                      title={t('common.download')}
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(invoice.id)}
                      className="icon-btn danger"
                      title={t('common.delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx={"true"}>{`
        .page-container {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
          background: #fff;
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .page-header h1 {
          margin: 0 0 8px 0;
          color: #1e293b;
          font-size: 24px;
          font-weight: 600;
        }

        .page-header .description {
          color: #64748b;
          font-size: 14px;
        }

        .search-filter-container {
          margin-bottom: 24px;
        }

        .search-container {
          position: relative;
          max-width: 500px;
          margin-bottom: 16px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 10px 16px 10px 40px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .filters-container {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: flex-end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 4px;
        }

        .filter-input,
        .filter-select {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          min-width: 180px;
        }

        .clear-filters {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-filters:hover {
          background: #e2e8f0;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .no-items {
          text-align: center;
          padding: 40px 0;
          color: #64748b;
          background: #f8fafc;
          border-radius: 8px;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background-color: #f8fafc;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: left;
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .data-table th.text-right {
          text-align: right;
        }

        .data-table td {
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 14px;
        }

        .data-row:hover {
          background-color: #f8fafc;
        }

        .customer-cell {
          display: flex;
          flex-direction: column;
        }

        .customer-name {
          font-weight: 500;
          color: #1e293b;
        }

        .customer-phone {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.paid {
          background-color: #ecfdf5;
          color: #059669;
        }

        .status-badge.credit {
          background-color: #fef3c7;
          color: #d97706;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          color: #64748b;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background-color: #f1f5f9;
          color: #3b82f6;
        }

        .icon-btn.danger:hover {
          color: #ef4444;
          background-color: #fef2f2;
        }

        @media (max-width: 768px) {
          .table-container {
            border-radius: 0;
            margin: 0 -16px;
            width: calc(100% + 32px);
          }

          .data-table th,
          .data-table td {
            padding: 12px 8px;
          }

          .actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default ManageInvoices;
