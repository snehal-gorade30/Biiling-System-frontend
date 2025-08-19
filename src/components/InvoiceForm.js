import React, { useState, useEffect } from 'react';
import { Printer, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';

const InvoiceForm = () => {
  const { t } = useLanguage();
  
  const [items, setItems] = useState([
    { id: 1, itemId: '', name: '', hsn: '', qty: 1, mrp: 0, salePrice: 0, gst: 0, discount: 0, amount: 0, total: 0 }
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    invoiceNo: `INV-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    mobile: '',
    address: '',
    paymentMode: 'cash',
    receivedAmount: 0,
    invoiceDiscount: 0,
    notes: '',
    subTotal: 0,
    totalGst: 0,
    grandTotal: 0,
    balance: 0
  });

  // Fetch items for search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      axios.get(`/api/items/search?q=${encodeURIComponent(searchTerm)}`)
        .then(response => {
          setSearchResults(response.data.slice(0, 5)); // Limit to 5 results
        })
        .catch(error => {
          console.error('Error searching items:', error);
          setSearchResults([]);
        });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // Calculate totals when items or form data changes
  useEffect(() => {
    const calculateTotals = () => {
      const updatedItems = items.map(item => {
        const amount = (item.salePrice * item.qty) - (item.discount * item.qty);
        const gstAmount = (amount * item.gst) / 100;
        const total = amount + gstAmount;
        return { ...item, amount, total };
      });

      const subTotal = updatedItems.reduce((sum, item) => sum + (item.salePrice * item.qty), 0);
      const totalDiscount = updatedItems.reduce((sum, item) => sum + (item.discount * item.qty), 0) + (formData.invoiceDiscount || 0);
      const totalGst = updatedItems.reduce((sum, item) => ((item.amount * item.gst) / 100), 0);
      const grandTotal = subTotal + totalGst - totalDiscount;
      const balance = (formData.receivedAmount || 0) - grandTotal;

      // Only update state if values have actually changed
      if (JSON.stringify(updatedItems) !== JSON.stringify(items)) {
        setItems(updatedItems);
      }

      setFormData(prev => {
        if (
          prev.subTotal !== subTotal ||
          prev.totalGst !== totalGst ||
          prev.grandTotal !== grandTotal ||
          prev.balance !== balance
        ) {
          return {
            ...prev,
            subTotal,
            totalGst,
            grandTotal,
            balance
          };
        }
        return prev;
      });
    };

    calculateTotals();
  }, [items, formData.receivedAmount, formData.invoiceDiscount]);

  const handleItemSearch = (index, value) => {
    setSearchTerm(value);
    setShowSearchResults(true);
    
    const newItems = [...items];
    newItems[index].name = value;
    setItems(newItems);
  };

  const selectItem = (index, item) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      itemId: item.id,
      name: item.name,
      hsn: item.hsnCode || '',
      mrp: item.mrp,
      salePrice: item.salePrice,
      gst: item.gstRate || 0
    };
    setItems(newItems);
    setShowSearchResults(false);
    setSearchTerm('');
  };

  const addItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    setItems([...items, { id: newId, itemId: '', name: '', hsn: '', qty: 1, mrp: 0, salePrice: 0, gst: 0, discount: 0, amount: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === 'qty' || field === 'discount' || field === 'gst' || field === 'mrp' || field === 'salePrice' 
      ? parseFloat(value) || 0 
      : value;
    setItems(newItems);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'receivedAmount' || field === 'invoiceDiscount' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleSave = async (printAfterSave = false) => {
    const invoiceData = {
      ...formData,
      items: items.map(item => ({
        itemId: item.itemId,
        name: item.name,
        hsn: item.hsn,
        qty: item.qty,
        mrp: item.mrp,
        salePrice: item.salePrice,
        gst: item.gst,
        discount: item.discount,
        amount: item.amount,
        total: item.total
      }))
    };

    try {
      setIsSaving(true);
      await axios.post('/api/invoices', invoiceData);
      
      if (printAfterSave) {
        // Small delay to ensure state is updated before printing
        setTimeout(() => {
          window.print();
        }, 100);
      }
      
      // Show success message or redirect
    } catch (error) {
      console.error('Error saving invoice:', error);
      // Show error message to user
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndPrint = async (e) => {
    await handleSave(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-container">
      <div className="invoice-header">
        <h2>{t('pages.newBill.title')}</h2>
        <div className="actions">
          <button type="button" className="btn btn-print" onClick={handlePrint}>
            <Printer size={16} /> {t('pages.newBill.print')}
          </button>
        </div>
      </div>

      <form onSubmit={(e) => handleSave(false)}>
        <div className="form-row">
          <div className="form-group">
            <label>{t('pages.newBill.billNumber')}</label>
            <input
              type="text"
              value={formData.invoiceNo}
              onChange={(e) => handleInputChange('invoiceNo', e.target.value)}
              placeholder="Auto-generated"
              disabled
            />
          </div>
          <div className="form-group">
            <label>{t('pages.newBill.date')}</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
          </div>
        </div>

        <div className="customer-details">
          <h3>{t('pages.newBill.customerDetails')}</h3>
          <div className="form-row">
            <div className="form-group">
              <label>{t('pages.newBill.customerName')}</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t('pages.newBill.phoneNumber')}</label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => handleInputChange('mobile', e.target.value)}
                maxLength="10"
              />
            </div>
          </div>
          <div className="form-group">
            <label>{t('pages.newBill.address')}</label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows="2"
            />
          </div>
        </div>

        <div className="items-section">
          <div className="items-header">
            <h3>{t('pages.newBill.billItems')}</h3>
            <button type="button" className="btn btn-add" onClick={addItem}>
              <Plus size={16} /> {t('pages.newBill.addItem')}
            </button>
          </div>
          
          <div className="items-table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th width="25%">{t('pages.newBill.itemName')}</th>
                  <th width="10%">{t('pages.newBill.hsn')}</th>
                  <th width="10%">{t('pages.newBill.quantity')}</th>
                  <th width="10%">{t('pages.newBill.mrp')}</th>
                  <th width="10%">{t('pages.newBill.sellPrice')}</th>
                  <th width="10%">{t('pages.newBill.discount')}</th>
                  <th width="10%">GST %</th>
                  <th width="10%">{t('pages.newBill.amount')}</th>
                  <th width="5%"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <div className="search-container">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemSearch(index, e.target.value)}
                          onFocus={() => setShowSearchResults(true)}
                        />
                        {showSearchResults && searchResults.length > 0 && (
                          <div className="search-results">
                            {searchResults.map((result) => (
                              <div
                                key={result.id}
                                className="search-result-item"
                                onClick={() => selectItem(index, result)}
                              >
                                {result.name} (MRP: {result.mrp}, SP: {result.salePrice})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.hsn}
                        onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.mrp}
                        onChange={(e) => handleItemChange(index, 'mrp', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.salePrice}
                        onChange={(e) => handleItemChange(index, 'salePrice', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.gst}
                        onChange={(e) => handleItemChange(index, 'gst', e.target.value)}
                      />
                    </td>
                    <td>₹{item.total.toFixed(2)}</td>
                    <td>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section">
          <div className="totals-grid">
            <div className="total-row">
              <span>{t('pages.newBill.subtotal')}:</span>
              <span>₹{formData.subTotal.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>{t('pages.newBill.totalGst')}:</span>
              <span>₹{formData.totalGst.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>{t('pages.newBill.discount')}:</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.invoiceDiscount}
                onChange={(e) => handleInputChange('invoiceDiscount', e.target.value)}
                className="discount-input"
              />
            </div>
            <div className="total-row grand-total">
              <span>{t('pages.newBill.grandTotal')}:</span>
              <span>₹{formData.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>{t('pages.newBill.paymentMode')}</h3>
          <div className="form-row">
            <div className="form-group">
              <label>
                <input
                  type="radio"
                  name="paymentMode"
                  value="cash"
                  checked={formData.paymentMode === 'cash'}
                  onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                />
                {t('pages.newBill.cash')}
              </label>
              <label>
                <input
                  type="radio"
                  name="paymentMode"
                  value="card"
                  checked={formData.paymentMode === 'card'}
                  onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                />
                {t('pages.newBill.card')}
              </label>
              <label>
                <input
                  type="radio"
                  name="paymentMode"
                  value="upi"
                  checked={formData.paymentMode === 'upi'}
                  onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                />
                {t('pages.newBill.upi')}
              </label>
            </div>
            <div className="form-group">
              <label>{t('pages.newBill.receivedAmount')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.receivedAmount}
                onChange={(e) => handleInputChange('receivedAmount', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t('pages.newBill.balance')}</label>
              <input
                type="text"
                value={`₹${Math.abs(formData.balance).toFixed(2)} ${formData.balance < 0 ? t('pages.newBill.toPay') : t('pages.newBill.toReturn')}`}
                readOnly
                className={formData.balance < 0 ? 'text-danger' : 'text-success'}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>{t('pages.newBill.notes')}</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows="2"
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={isSaving}
          >
            {t('pages.newBill.save')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveAndPrint}
            disabled={isSaving}
          >
            <Printer size={16} style={{ marginRight: '8px' }} />
            {t('pages.newBill.saveAndPrint')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
