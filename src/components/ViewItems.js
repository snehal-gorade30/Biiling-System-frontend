import React, { useState, useEffect } from 'react';
import { Eye, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ViewItems = () => {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8080/api/items');
      
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      
      const data = await response.json();
      setItems(data);
      setError('');
    } catch (err) {
      setError('Error fetching items: ' + err.message);
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = (currentStock, minStockLevel) => {
    return currentStock <= minStockLevel;
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <Eye size={24} />
          <div>
            <h1>{t('pages.viewItems.title')}</h1>
            <p>{t('pages.viewItems.description')}</p>
          </div>
        </div>
        <div className="loading-container">
          <p>{t('pages.viewItems.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <Eye size={24} />
          <div>
            <h1>{t('pages.viewItems.title')}</h1>
            <p>{t('pages.viewItems.description')}</p>
          </div>
        </div>
        <div className="error-container">
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={fetchItems} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Eye size={24} />
        <div>
          <h1>{t('pages.viewItems.title')}</h1>
          <p>{t('pages.viewItems.description')}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="no-items-container">
          <p>{t('pages.viewItems.noItems')}</p>
        </div>
      ) : (
        <div className="items-table-container">
          <div className="table-responsive">
            <table className="items-table">
              <thead>
                <tr>
                  <th>{t('pages.viewItems.itemName')}</th>
                  <th>{t('pages.viewItems.category')}</th>
                  <th>{t('pages.viewItems.currentStock')}</th>
                  <th>{t('pages.viewItems.minStockLevel')}</th>
                  <th>{t('pages.viewItems.unit')}</th>
                  <th>{t('pages.viewItems.sellPrice')}</th>
                  <th>{t('pages.viewItems.mrp')}</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const lowStock = isLowStock(item.currentStock, item.minStockLevel);
                  return (
                    <tr 
                      key={item.id} 
                      className={lowStock ? 'low-stock-row' : ''}
                      style={{
                        backgroundColor: lowStock ? '#ffebee' : 'transparent',
                        borderLeft: lowStock ? '4px solid #f44336' : 'none'
                      }}
                    >
                      <td className="item-name">
                        {item.itemName}
                        {lowStock && (
                          <AlertTriangle 
                            size={16} 
                            style={{ 
                              color: '#f44336', 
                              marginLeft: '8px',
                              verticalAlign: 'middle'
                            }} 
                          />
                        )}
                      </td>
                      <td>{item.category}</td>
                      <td style={{ color: lowStock ? '#f44336' : 'inherit', fontWeight: lowStock ? 'bold' : 'normal' }}>
                        {item.currentStock}
                      </td>
                      <td>{item.minStockLevel}</td>
                      <td>{item.unit}</td>
                      <td>{formatCurrency(item.sellPrice)}</td>
                      <td>{formatCurrency(item.mrp)}</td>
                      <td>
                        {lowStock ? (
                          <span className="status-badge low-stock">
                            {t('pages.viewItems.lowStock')}
                          </span>
                        ) : (
                          <span className="status-badge normal-stock">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e9ecef;
        }

        .page-header h1 {
          margin: 0;
          color: #343a40;
          font-size: 1.8rem;
        }

        .page-header p {
          margin: 5px 0 0 0;
          color: #6c757d;
          font-size: 1rem;
        }

        .loading-container, .error-container, .no-items-container {
          text-align: center;
          padding: 40px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-top: 20px;
        }

        .items-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .items-table th {
          background: #f8f9fa;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          color: #495057;
          border-bottom: 2px solid #dee2e6;
          white-space: nowrap;
        }

        .items-table td {
          padding: 12px 8px;
          border-bottom: 1px solid #dee2e6;
          vertical-align: middle;
        }

        .items-table tr:hover {
          background-color: #f8f9fa;
        }

        .low-stock-row:hover {
          background-color: #ffcdd2 !important;
        }

        .item-name {
          font-weight: 500;
          display: flex;
          align-items: center;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.low-stock {
          background-color: #ffcdd2;
          color: #c62828;
        }

        .status-badge.normal-stock {
          background-color: #c8e6c9;
          color: #2e7d32;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          margin-top: 10px;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background-color: #0056b3;
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 10px;
          }
          
          .items-table {
            font-size: 12px;
          }
          
          .items-table th,
          .items-table td {
            padding: 8px 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default ViewItems;
