import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations/translations';
import { getDisplayText } from '../utils/textUtils';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';

const AddItems = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    purchasePrice: '',
    mrp: '',
    sellPrice: '',
    minSellPrice: '',
    currentStock: '',
    minStockLevel: '',
    unit: 'pieces'
  });
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const calculateStockValue = () => {
    const stock = parseFloat(formData.currentStock) || 0;
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    return (stock * purchasePrice).toFixed(2);
  };

  const isLowStock = () => {
    const currentStock = parseFloat(formData.currentStock) || 0;
    const minStock = parseFloat(formData.minStockLevel) || 0;
    return currentStock > 0 && minStock > 0 && currentStock <= minStock;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['itemName', 'purchasePrice', 'mrp', 'sellPrice', 'currentStock', 'minStockLevel'];
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = t('pages.addItems.required');
      }
    });

    // Validate price logic
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const mrp = parseFloat(formData.mrp) || 0;
    const sellPrice = parseFloat(formData.sellPrice) || 0;
    const minSellPrice = parseFloat(formData.minSellPrice) || 0;

    if (purchasePrice > 0 && sellPrice > 0 && sellPrice < purchasePrice) {
      newErrors.sellPrice = t('pages.addItems.sellPriceError');
    }

    if (mrp > 0 && sellPrice > 0 && sellPrice > mrp) {
      newErrors.sellPrice = t('pages.addItems.sellPriceErrorMrp');
    }

    if (minSellPrice > 0 && sellPrice > 0 && minSellPrice > sellPrice) {
      newErrors.minSellPrice = t('pages.addItems.minSellPriceError');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const response = await fetch('http://localhost:8080/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemName: formData.itemName,
            category: formData.category,
            purchasePrice: parseFloat(formData.purchasePrice),
            mrp: parseFloat(formData.mrp),
            sellPrice: parseFloat(formData.sellPrice),
            minSellPrice: formData.minSellPrice ? parseFloat(formData.minSellPrice) : null,
            currentStock: parseInt(formData.currentStock),
            minStockLevel: parseInt(formData.minStockLevel),
            unit: formData.unit
          })
        });

        if (response.ok) {
          console.log('Item added successfully');
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
          
          // Reset form
          setFormData({
            itemName: '',
            category: '',
            purchasePrice: '',
            mrp: '',
            sellPrice: '',
            minSellPrice: '',
            currentStock: '',
            minStockLevel: '',
            unit: 'pieces'
          });
        } else {
          const errorText = await response.text();
          console.error('Failed to add item:', errorText);
          alert('Failed to add item: ' + errorText);
        }
      } catch (error) {
        console.error('Error adding item:', error);
        alert('Error connecting to server. Please check if backend is running.');
      }
    }
  };

  const handleReset = () => {
    setFormData({
      itemName: '',
      category: '',
      purchasePrice: '',
      mrp: '',
      sellPrice: '',
      minSellPrice: '',
      currentStock: '',
      minStockLevel: '',
      unit: 'pieces'
    });
    setErrors({});
  };

  return (
    <div className="content-container">
      <h2 className="page-title">
        <Package size={28} style={{ marginRight: '10px' }} />
        {t('pages.addItems.title')}
      </h2>
      
      {showSuccess && (
        <div className="success-message">
          <CheckCircle size={20} />
          {t('pages.addItems.itemAddedSuccess')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-item-form">
        <div className="form-grid">
          {/* Item Name */}
          <div className="form-group">
            <label>{t('pages.addItems.itemName')} *</label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleInputChange}
              className={errors.itemName ? 'error' : ''}
              placeholder={t('pages.addItems.itemNamePlaceholder')}
            />
            {errors.itemName && <span className="error-text">{errors.itemName}</span>}
          </div>

          {/* Category */}
          <div className="form-group">
            <label>{t('pages.addItems.category')}</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
            >
              <option value="">{t('pages.addItems.categoryPlaceholder')}</option>
              <option value="groceries">{t('pages.addItems.categoryGroceries')}</option>
              <option value="beverages">{t('pages.addItems.categoryBeverages')}</option>
              <option value="snacks">{t('pages.addItems.categorySnacks')}</option>
              <option value="household">{t('pages.addItems.categoryHousehold')}</option>
              <option value="personal_care">{t('pages.addItems.categoryPersonalCare')}</option>
            </select>
          </div>

          {/* Purchase Price */}
          <div className="form-group">
            <label>{t('pages.addItems.purchasePrice')} *</label>
            <input
              type="number"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleInputChange}
              className={errors.purchasePrice ? 'error' : ''}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.purchasePrice && <span className="error-text">{errors.purchasePrice}</span>}
          </div>

          {/* MRP */}
          <div className="form-group">
            <label>{t('pages.addItems.mrp')} *</label>
            <input
              type="number"
              name="mrp"
              value={formData.mrp}
              onChange={handleInputChange}
              className={errors.mrp ? 'error' : ''}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.mrp && <span className="error-text">{errors.mrp}</span>}
          </div>

          {/* Sell Price */}
          <div className="form-group">
            <label>{t('pages.addItems.sellPrice')} *</label>
            <input
              type="number"
              name="sellPrice"
              value={formData.sellPrice}
              onChange={handleInputChange}
              className={errors.sellPrice ? 'error' : ''}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.sellPrice && <span className="error-text">{errors.sellPrice}</span>}
          </div>

          {/* Min Sell Price */}
          <div className="form-group">
            <label>{t('pages.addItems.minSellPrice')}</label>
            <input
              type="number"
              name="minSellPrice"
              value={formData.minSellPrice}
              onChange={handleInputChange}
              className={errors.minSellPrice ? 'error' : ''}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.minSellPrice && <span className="error-text">{errors.minSellPrice}</span>}
          </div>

          {/* Current Stock */}
          <div className="form-group">
            <label>{t('pages.addItems.currentStock')} *</label>
            <div className="stock-input-group">
              <input
                type="number"
                name="currentStock"
                value={formData.currentStock}
                onChange={handleInputChange}
                className={`${errors.currentStock ? 'error' : ''} ${isLowStock() ? 'low-stock' : ''}`}
                placeholder="0"
                step="1"
                min="0"
              />
              {isLowStock() && (
                <div className="low-stock-indicator">
                  <AlertTriangle size={16} />
                  <span>{t('pages.addItems.lowStockWarning')}</span>
                </div>
              )}
            </div>
            {errors.currentStock && <span className="error-text">{errors.currentStock}</span>}
          </div>

          {/* Min Stock Level */}
          <div className="form-group">
            <label>{t('pages.addItems.minStockLevel')} *</label>
            <input
              type="number"
              name="minStockLevel"
              value={formData.minStockLevel}
              onChange={handleInputChange}
              className={errors.minStockLevel ? 'error' : ''}
              placeholder="0"
              step="1"
              min="0"
            />
            {errors.minStockLevel && <span className="error-text">{errors.minStockLevel}</span>}
          </div>

          {/* Unit */}
          <div className="form-group">
            <label>{t('pages.addItems.unit')}</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
            >
              <option value="pieces">{t('pages.addItems.unitPieces')}</option>
              <option value="kg">{t('pages.addItems.unitKg')}</option>
              <option value="grams">{t('pages.addItems.unitGrams')}</option>
              <option value="liters">{t('pages.addItems.unitLiters')}</option>
              <option value="ml">{t('pages.addItems.unitMl')}</option>
              <option value="packets">{t('pages.addItems.unitPackets')}</option>
            </select>
          </div>

          {/* Stock Value (Calculated) */}
          <div className="form-group">
            <label>{t('pages.addItems.stockValue')}</label>
            <div className="calculated-field">
              ₹{calculateStockValue()}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {t('pages.addItems.addItem')}
          </button>
          <button type="button" onClick={handleReset} className="btn-secondary">
            {t('pages.addItems.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddItems;
