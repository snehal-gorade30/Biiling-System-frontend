import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Package, AlertTriangle, CheckCircle, Printer, Barcode } from 'lucide-react';
import { createReceipt, printReceipt } from '../utils/thermalPrinter';

const AddItems = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    itemName: '',
    barcode: null,
    category: 'groceries',
    purchasePrice: '',
    mrp: '',
    sellPrice: '',
    minSellPrice: '',
    currentStock: '',
    minStockLevel: '5',
    unit: 'pieces'
  });
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const barcodeInputRef = useRef(null);
  let barcodeBuffer = '';
  let barcodeTimeout = null;

  // Initialize form with default values
  const resetForm = () => ({
    itemName: '',
    barcode: null,
    category: 'groceries',
    purchasePrice: '',
    mrp: '',
    sellPrice: '',
    minSellPrice: '',
    currentStock: '',
    minStockLevel: '5',
    unit: 'pieces'
  });

  // Handle barcode scanner input
  useEffect(() => {
    const handleBarcodeInput = (e) => {
      if (e.target === barcodeInputRef.current) return; // Skip if typing in barcode input
      
      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        // Process the barcode
        handleBarcodeScan(barcodeBuffer);
        barcodeBuffer = '';
        clearTimeout(barcodeTimeout);
      } else if (e.key.length === 1) {
        // Add to buffer and set timeout to clear it
        barcodeBuffer += e.key;
        clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(() => {
          barcodeBuffer = '';
        }, 100); // Small delay to detect end of barcode
      }
    };

    if (isScanning) {
      window.addEventListener('keydown', handleBarcodeInput);
    }

    return () => {
      window.removeEventListener('keydown', handleBarcodeInput);
      clearTimeout(barcodeTimeout);
    };
  }, [isScanning]);

  // Handle barcode scan
  const handleBarcodeScan = async (barcode) => {
    // Ensure barcode is a string and trim whitespace
    const barcodeStr = typeof barcode === 'string' 
      ? barcode.trim() 
      : barcode?.toString()?.trim() || '';
    
    // If barcode is empty, don't proceed
    if (!barcodeStr) {
      setFormData(prev => ({
        ...prev,
        barcode: null
      }));
      return;
    }

    try {
      const response = await fetch(`/api/items/barcode/${encodeURIComponent(barcodeStr)}`);
      
      if (response.ok) {
        const existingItem = await response.json();
        // Auto-fill form with existing item data
        setFormData(prev => ({
          ...prev,
          itemName: existingItem.itemName || '',
          barcode: existingItem.barcode ? String(existingItem.barcode) : barcodeStr,
          category: existingItem.category || 'groceries',
          purchasePrice: existingItem.purchasePrice || '',
          mrp: existingItem.mrp || '',
          sellPrice: existingItem.sellPrice || '',
          minSellPrice: existingItem.minSellPrice || '',
          currentStock: existingItem.currentStock || '',
          minStockLevel: existingItem.minStockLevel || '5',
          unit: existingItem.unit || 'pieces'
        }));
      } else {
        // Item not found, just set the barcode
        setFormData(prev => ({
          ...prev,
          barcode: barcodeStr
        }));
      }
    } catch (error) {
      console.error('Error checking barcode:', error);
      // Still set the barcode even if there's an error
      setFormData(prev => ({
        ...prev,
        barcode: barcodeStr
      }));
    }
  };

  // Toggle barcode scanning mode
  const toggleBarcodeScanning = () => {
    setIsScanning(!isScanning);
    if (!isScanning && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

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
    const { name, value, type, inputMode } = e.target;
    
    // Special handling for barcode to ensure it's always a string
    if (name === 'barcode') {
      setFormData(prev => ({
        ...prev,
        [name]: value || ''
      }));
      return;
    }
    
    // For other fields, use the existing logic
    const sanitizedValue = value === undefined || value === null ? '' : String(value);
    
    // Handle numeric inputs
    if ((type === 'text' && (inputMode === 'decimal' || inputMode === 'numeric')) || 
        name === 'purchasePrice' || 
        name === 'mrp' || 
        name === 'sellPrice' || 
        name === 'minSellPrice' || 
        name === 'currentStock' || 
        name === 'minStockLevel') {
      
      // Only allow numbers and decimal point
      let numericValue = sanitizedValue === '' ? '' : String(sanitizedValue).replace(/[^0-9.]/g, '');
      
      // Prevent multiple decimal points
      const decimalCount = (numericValue.match(/\./g) || []).length;
      if (decimalCount > 1) {
        const parts = numericValue.split('.');
        numericValue = parts[0] + '.' + parts.slice(1).join('');
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      
      // Clear any existing error for this field
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: sanitizedValue
      }));
      
      // Clear any existing error for this field
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = {};
    if (!formData.itemName.trim()) validationErrors.itemName = 'Item name is required';
    if (!formData.purchasePrice) validationErrors.purchasePrice = 'Purchase price is required';
    if (!formData.mrp) validationErrors.mrp = 'MRP is required';
    if (!formData.sellPrice) validationErrors.sellPrice = 'Sell price is required';
    if (formData.minSellPrice && parseFloat(formData.minSellPrice) > parseFloat(formData.sellPrice)) {
      validationErrors.minSellPrice = 'Min sell price cannot be greater than sell price';
    }
    if (!formData.currentStock && formData.currentStock !== 0) validationErrors.currentStock = 'Current stock is required';
    if (!formData.minStockLevel) validationErrors.minStockLevel = 'Min stock level is required';
    if (!formData.unit) validationErrors.unit = 'Unit is required';
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    try {
      // Format the data to match the backend DTO
      const itemData = {
        itemName: formData.itemName.trim(),
        barcode: formData.barcode === null ? null : formData.barcode.trim(),
        category: formData.category,
        purchasePrice: parseFloat(formData.purchasePrice),
        mrp: parseFloat(formData.mrp),
        sellPrice: parseFloat(formData.sellPrice),
        minSellPrice: formData.minSellPrice ? parseFloat(formData.minSellPrice) : null,
        currentStock: parseInt(formData.currentStock, 10),
        minStockLevel: parseInt(formData.minStockLevel, 10),
        unit: formData.unit
      };
      
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save item');
      }
      
      // Show success message and reset form
      setShowSuccess(true);
      setFormData(resetForm());
      setErrors({});
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error saving item:', error);
      setErrors({ submit: error.message });
    }
  };

  const handleReset = () => {
    setFormData(resetForm());
    setErrors({});
  };

  const handlePrint = async () => {
    try {
      // Format the current date and time
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const formattedTime = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Create a receipt with all item details
      const receipt = createReceipt({
        header: 'ITEM DETAILS',
        items: [{
          name: formData.itemName || 'New Item',
          quantity: 1,
          price: parseFloat(formData.sellPrice) || 0
        }],
        details: [
          `Category: ${formData.category || '-'}`,
          `Purchase Price: ₹${formData.purchasePrice || '0.00'}`,
          `MRP: ₹${formData.mrp || '0.00'}`,
          `Sell Price: ₹${formData.sellPrice || '0.00'}`,
          `Min Sell Price: ₹${formData.minSellPrice || '0.00'}`,
          `Current Stock: ${formData.currentStock || '0'} ${formData.unit || 'units'}`,
          `Min Stock Level: ${formData.minStockLevel || '0'}`,
          `Stock Value: ₹${calculateStockValue()}`
        ],
        subtotal: parseFloat(formData.sellPrice) || 0,
        tax: 0,
        total: parseFloat(formData.sellPrice) || 0,
        footer: 'Thank you for using our system!',
        date: `${formattedDate} ${formattedTime}`
      });

      // Print the receipt
      const success = await printReceipt(receipt);
      
      if (!success) {
        console.error('Failed to print receipt');
        // Fallback to browser print
        window.print();
      }
    } catch (error) {
      console.error('Print error:', error);
      // Fallback to browser print
      window.print();
    }
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Barcode Field */}
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pages.addItems.barcode')}
            </label>
            <div className="flex">
              <input
                type="text"
                name="barcode"
                ref={barcodeInputRef}
                value={formData.barcode === null ? '' : formData.barcode}
                onChange={handleInputChange}
                className={`w-full p-2 border rounded-l ${errors.barcode ? 'border-red-500' : 'border-gray-300'} ${
                  isScanning ? 'ring-2 ring-blue-500' : ''
                }`}
                placeholder={t('pages.addItems.scanOrEnterBarcode')}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={toggleBarcodeScanning}
                className={`px-4 py-2 rounded-r transition-colors ${
                  isScanning 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                title={isScanning ? t('pages.addItems.stopScanning') : t('pages.addItems.startScanning')}
              >
                <Barcode className="h-5 w-5" />
              </button>
            </div>
            {errors.barcode && (
              <p className="mt-1 text-sm text-red-600">{errors.barcode}</p>
            )}
            {isScanning && (
              <p className="mt-1 text-sm text-blue-600 flex items-center">
                <Barcode className="mr-1 h-4 w-4 animate-pulse" />
                {t('pages.addItems.scanningModeActive')}
              </p>
            )}
          </div>
        </div>

        {/* Item Name */}
        <div className="form-group">
          <label>{t('pages.addItems.itemName')} *</label>
          <input
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleInputChange}
            className={errors.itemName ? 'error' : ''}
            placeholder={String(t('pages.addItems.itemNamePlaceholder', true))}
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
            <option value="groceries">{t('pages.addItems.categoryGroceries', true)}</option>
            <option value="beverages">{t('pages.addItems.categoryBeverages', true)}</option>
            <option value="snacks">{t('pages.addItems.categorySnacks', true)}</option>
            <option value="household">{t('pages.addItems.categoryHousehold', true)}</option>
            <option value="personal_care">{t('pages.addItems.categoryPersonalCare', true)}</option>
          </select>
        </div>

        {/* Purchase Price */}
        <div className="form-group">
          <label>{t('pages.addItems.purchasePrice')} *</label>
          <input
            type="text"
            inputMode="decimal"
            name="purchasePrice"
            value={formData.purchasePrice}
            onChange={handleInputChange}
            className={errors.purchasePrice ? 'error' : ''}
            placeholder="0.00"
          />
          {errors.purchasePrice && <span className="error-text">{errors.purchasePrice}</span>}
        </div>

        {/* MRP */}
        <div className="form-group">
          <label>{t('pages.addItems.mrp')} *</label>
          <input
            type="text"
            inputMode="decimal"
            name="mrp"
            value={formData.mrp}
            onChange={handleInputChange}
            className={errors.mrp ? 'error' : ''}
            placeholder="0.00"
          />
          {errors.mrp && <span className="error-text">{errors.mrp}</span>}
        </div>

        {/* Sell Price */}
        <div className="form-group">
          <label>{t('pages.addItems.sellPrice')} *</label>
          <input
            type="text"
            inputMode="decimal"
            name="sellPrice"
            value={formData.sellPrice}
            onChange={handleInputChange}
            className={errors.sellPrice ? 'error' : ''}
            placeholder="0.00"
          />
          {errors.sellPrice && <span className="error-text">{errors.sellPrice}</span>}
        </div>

        {/* Min Sell Price */}
        <div className="form-group">
          <label>{t('pages.addItems.minSellPrice')}</label>
          <input
            type="text"
            inputMode="decimal"
            name="minSellPrice"
            value={formData.minSellPrice}
            onChange={handleInputChange}
            className={errors.minSellPrice ? 'error' : ''}
            placeholder="0.00"
          />
          {errors.minSellPrice && <span className="error-text">{errors.minSellPrice}</span>}
        </div>

        {/* Current Stock */}
        <div className="form-group">
          <label>{t('pages.addItems.currentStock')} *</label>
          <div className="stock-input-group">
            <input
              type="text"
              inputMode="numeric"
              name="currentStock"
              value={formData.currentStock}
              onChange={handleInputChange}
              className={`${errors.currentStock ? 'error' : ''} ${isLowStock() ? 'low-stock' : ''}`}
              placeholder="0"
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
            type="text"
            inputMode="numeric"
            name="minStockLevel"
            value={formData.minStockLevel}
            onChange={handleInputChange}
            className={errors.minStockLevel ? 'error' : ''}
            placeholder="5"
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
            <option value="pieces">{t('pages.addItems.unitPieces', true)}</option>
            <option value="kg">{t('pages.addItems.unitKg', true)}</option>
            <option value="grams">{t('pages.addItems.unitGrams', true)}</option>
            <option value="liters">{t('pages.addItems.unitLiters', true)}</option>
            <option value="ml">{t('pages.addItems.unitMl', true)}</option>
            <option value="packets">{t('pages.addItems.unitPackets', true)}</option>
          </select>
        </div>

        {/* Stock Value (Calculated) */}
        <div className="form-group">
          <label>{t('pages.addItems.stockValue')}</label>
          <div className="calculated-field">
            ₹{calculateStockValue()}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            <CheckCircle size={16} style={{ marginRight: '8px' }} />
            {t('pages.addItems.addItem')}
          </button>
          <button type="button" onClick={handleReset} className="btn-secondary">
            {t('pages.addItems.cancel')}
          </button>
          <button 
            type="button" 
            onClick={handlePrint} 
            className="btn-secondary"
            title="Print item details"
          >
            <Printer size={16} style={{ marginRight: '8px' }} />
            {t('general.print')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddItems;
