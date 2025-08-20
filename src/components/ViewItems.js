import React, { useState, useEffect } from 'react';
import { Plus, Minus, Edit, Save, X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ViewItems = () => {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [stockUpdateItem, setStockUpdateItem] = useState(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const updateStock = async (itemId, newStock) => {
    try {
      const response = await fetch(`http://localhost:8080/api/items/${itemId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentStock: newStock }),
      });

      if (!response.ok) {
        throw new Error('Failed to update stock');
      }

      // Update local state
      setItems(items.map(item => 
        item.id === itemId ? { ...item, currentStock: newStock } : item
      ));
      
      setSuccessMessage(t('pages.viewItems.stockUpdated'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Error updating stock: ' + err.message);
      console.error('Error updating stock:', err);
    }
  };

  const handleStockUpdate = (item, operation) => {
    const quantity = parseInt(stockQuantity) || 1;
    let newStock;
    
    if (operation === 'increase') {
      newStock = item.currentStock + quantity;
    } else {
      newStock = Math.max(0, item.currentStock - quantity);
    }
    
    updateStock(item.id, newStock);
    setStockUpdateItem(null);
    setStockQuantity('');
  };

  const updateItem = async (itemId, updatedData) => {
    try {
      const response = await fetch(`http://localhost:8080/api/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      const updatedItem = await response.json();
      
      // Update local state
      setItems(items.map(item => 
        item.id === itemId ? updatedItem : item
      ));
      
      setSuccessMessage(t('pages.viewItems.itemUpdated'));
      setTimeout(() => setSuccessMessage(''), 3000);
      setEditingItem(null);
    } catch (err) {
      setError('Error updating item: ' + err.message);
      console.error('Error updating item:', err);
    }
  };

  const handleEditSave = (item) => {
    updateItem(item.id, {
      itemName: item.itemName,
      name: item.itemName, 
      category: item.category,
      purchasePrice: parseFloat(item.purchasePrice) || 0,
      mrp: parseFloat(item.mrp) || 0,
      sellPrice: parseFloat(item.sellPrice) || 0,
      minSellPrice: parseFloat(item.minSellPrice) || 0,
      currentStock: parseInt(item.currentStock) || 0,
      minStockLevel: parseInt(item.minStockLevel) || 0,
      unit: item.unit || 'pieces',
      barcode: item.barcode || null
    });
  };

  const isLowStock = (currentStock, minStockLevel) => {
    return currentStock <= minStockLevel;
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="view-items-container">
        <div className="header-section">
          <h2>{t('pages.viewItems.title')}</h2>
          <p>{t('pages.viewItems.description')}</p>
        </div>
        <div className="loading-container">
          <span>{t('pages.viewItems.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-items-container">
        <div className="header-section">
          <h2>{t('viewAndManageItems')}</h2>
          <p>{t('viewAndManageItemsDesc')}</p>
        </div>
        <div className="error-container">
          <span style={{ color: 'red' }}>{error}</span>
          <button onClick={fetchItems} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-items-container">
      <style jsx>{`
        .view-items-container {
          padding: 24px;
          max-width: 100%;
          min-height: 100vh;
        }

        .header-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
          padding: 0 0 16px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .header-section h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .header-section p {
          margin: 4px 0 0 0;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .loading-container, .error-container, .no-items-container {
          text-align: center;
          padding: 48px;
          background: white;
          border-radius: 12px;
          margin-top: 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .success-message {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          margin: 16px 0;
          font-weight: 500;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .items-table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          border: 1px solid #e5e7eb;
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
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 16px 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #d1d5db;
          white-space: nowrap;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .items-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
          transition: all 0.2s ease;
        }

        .items-table td input {
          width: 100%;
          padding: 8px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 13px;
          transition: border-color 0.2s ease;
          background-color: #f9fafb;
        }

        .items-table td input:focus {
          outline: none;
          border-color: #3b82f6;
          background-color: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .items-table td button {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          margin: 0 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          font-weight: 500;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }

        .items-table td button:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .items-table td button.save-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        }

        .items-table td button.save-btn:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .items-table td button.cancel-btn {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }

        .items-table td button.cancel-btn:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
        }

        .items-table tr {
          transition: background-color 0.2s ease;
        }

        .items-table tr:hover {
          background-color: #f8fafc;
        }

        .low-stock-row {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-left: 4px solid #ef4444;
        }

        .low-stock-row:hover {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        }

        .item-name {
          font-weight: 600;
          display: flex;
          align-items: center;
          color: #1f2937;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .status-badge.low-stock {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #dc2626;
          border: 1px solid #fca5a5;
        }

        .status-badge.normal-stock {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          border: 1px solid #86efac;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-top: 16px;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 12px -1px rgba(59, 130, 246, 0.3);
        }

        .stock-update-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding: 8px;
          background-color: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .stock-update-controls input {
          width: 80px;
          padding: 6px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          text-align: center;
          font-weight: 500;
        }

        .stock-update-controls button {
          padding: 6px 10px;
          font-size: 12px;
          min-width: 32px;
          height: 32px;
        }

        @media (max-width: 768px) {
          .view-items-container {
            padding: 16px;
          }
          
          .header-section {
            padding: 20px;
            margin-bottom: 24px;
          }
          
          .header-section h2 {
            font-size: 1.5rem;
          }
          
          .items-table {
            font-size: 12px;
          }
          
          .items-table th,
          .items-table td {
            padding: 12px 8px;
          }
          
          .items-table td button {
            padding: 6px 8px;
            margin: 0 2px;
          }
        }

        @media (max-width: 480px) {
          .items-table th,
          .items-table td {
            padding: 8px 4px;
          }
          
          .items-table td input {
            padding: 4px 6px;
            font-size: 12px;
          }
        }
      `}</style>
      <div className="header-section">
        <h2>{t('pages.viewItems.title')}</h2>
        <p>{t('pages.viewItems.description')}</p>
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
                  <th>Actions</th>
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
                        {editingItem && editingItem.id === item.id ? (
                          <input type="text" value={editingItem.itemName} onChange={(e) => setEditingItem({ ...editingItem, itemName: e.target.value })} />
                        ) : (
                          item.itemName
                        )}
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
                      <td>
                        {editingItem && editingItem.id === item.id ? (
                          <input type="text" value={editingItem.category} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })} />
                        ) : (
                          item.category
                        )}
                      </td>
                      <td style={{ color: lowStock ? '#f44336' : 'inherit', fontWeight: lowStock ? 'bold' : 'normal' }}>
                        {item.currentStock}
                        {stockUpdateItem && stockUpdateItem.id === item.id ? (
                          <div>
                            <input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
                            <button onClick={() => handleStockUpdate(item, 'increase')}><Plus size={16} /></button>
                            <button onClick={() => handleStockUpdate(item, 'decrease')}><Minus size={16} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setStockUpdateItem(item)}><Edit size={16} /></button>
                        )}
                      </td>
                      <td>
                        {editingItem && editingItem.id === item.id ? (
                          <input type="number" value={editingItem.minStockLevel} onChange={(e) => setEditingItem({ ...editingItem, minStockLevel: e.target.value })} />
                        ) : (
                          item.minStockLevel
                        )}
                      </td>
                      <td>
                        {editingItem && editingItem.id === item.id ? (
                          <input type="text" value={editingItem.unit} onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })} />
                        ) : (
                          item.unit
                        )}
                      </td>
                      <td>
                        {editingItem && editingItem.id === item.id ? (
                          <input type="number" value={editingItem.sellPrice} onChange={(e) => setEditingItem({ ...editingItem, sellPrice: e.target.value })} />
                        ) : (
                          formatCurrency(item.sellPrice)
                        )}
                      </td>
                      <td>
                        {editingItem && editingItem.id === item.id ? (
                          <input type="number" value={editingItem.mrp} onChange={(e) => setEditingItem({ ...editingItem, mrp: e.target.value })} />
                        ) : (
                          formatCurrency(item.mrp)
                        )}
                      </td>
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
                      <td>
                        {editingItem && editingItem.id === item.id ? (
                          <button onClick={() => handleEditSave(editingItem)}><Save size={16} /></button>
                        ) : (
                          <button onClick={() => setEditingItem(item)}><Edit size={16} /></button>
                        )}
                        {editingItem && editingItem.id === item.id ? (
                          <button onClick={() => setEditingItem(null)}><X size={16} /></button>
                        ) : (
                          <></>
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

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default ViewItems;
