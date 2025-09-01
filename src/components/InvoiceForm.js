  import React, { useState, useEffect, useCallback, useRef } from 'react';
  import { useLanguage } from '../context/LanguageContext';
  import { Printer, Plus, Trash2, Barcode, Search,Scan } from 'lucide-react';
  import axios from 'axios';
  import debounce from 'lodash/debounce';
  import './InvoiceForm.css';

  import 'jspdf-autotable';
  import { generateReceipt } from '../utils/receiptGenerator';

  const API_BASE_URL = 'http://localhost:8080/api';

  const InvoiceForm = () => {
    const { t } = useLanguage();
    
    const [items, setItems] = useState([
      { id: 1, itemId: '', itemName: '', hsn: '', qty: '1', mrp: '', sellPrice: '', gst: '', discount: '', amount: '0', total: '0', availableStock: 0 }
    ]);
    
    // Initialize search-related state for each item
    const [searchTerms, setSearchTerms] = useState(['']);
    const [searchResults, setSearchResults] = useState([[]]);
    const [showSearchResults, setShowSearchResults] = useState([false]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanningRow, setScanningRow] = useState(null);
    const searchInputRefs = useRef([]);
    
    const [barcodeBuffer, setBarcodeBuffer] = useState('');
    const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeValue, setBarcodeValue] = useState('');



    // Initialize state arrays when items change
    useEffect(() => {
      if (items.length > searchTerms.length) {
        // Add empty search terms for new items
        const newSearchTerms = [...searchTerms];
        const newSearchResults = [...searchResults];
        const newShowResults = [...showSearchResults];
        
        while (newSearchTerms.length < items.length) {
          newSearchTerms.push('');
          newSearchResults.push([]);
          newShowResults.push(false);
        }
        
        setSearchTerms(newSearchTerms);
        setSearchResults(newSearchResults);
        setShowSearchResults(newShowResults);
      }
    }, [items, searchTerms, searchResults, showSearchResults]);
    
    const [selectedItem, setSelectedItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    
    // Initialize form data with default values to prevent undefined
    const [formData, setFormData] = useState({
      invoiceNo: `INV-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerId: null,
      mobile: '',
      address: '',
      paymentMode: 'cash',
      receivedAmount: '',
      invoiceDiscount: '0',
      notes: '',
      subTotal: '0.00',
      totalGst: '0.00',
      grandTotal: '0.00',
      balance: '0.00',
      customerId: null
    });

    // Debounced search function
    const debouncedSearch = useCallback(
      debounce(async (term, index) => {
        if (!term.trim()) {
          const updatedSearchResults = [...searchResults];
          updatedSearchResults[index] = [];
          setSearchResults(updatedSearchResults);
          return;
        }
        
        try {
          console.log('Making API call with search term:', term);
          const response = await axios.get(`${API_BASE_URL}/items/search`, {
            params: { q: term }  
          });
          
          console.log('Search results:', response.data);
          const updatedSearchResults = [...searchResults];
          updatedSearchResults[index] = response.data;
          setSearchResults(updatedSearchResults);
        } catch (error) {
          console.error('Error searching items:', error);
          const updatedSearchResults = [...searchResults];
          updatedSearchResults[index] = [];
          setSearchResults(updatedSearchResults);
        }
      }, 300),
      [searchResults, setSearchResults]
    );

    // Clean up debounce on unmount
    useEffect(() => {
      return () => {
        debouncedSearch.cancel();
        if (window.barcodeTimer) {
          clearTimeout(window.barcodeTimer);
        }
      };
    }, [debouncedSearch]);

    const handleSearch = useCallback(async (term, index) => {
      if (!term.trim()) {
        const updatedSearchResults = [...searchResults];
        updatedSearchResults[index] = [];
        setSearchResults(updatedSearchResults);
        return;
      }
    
      try {
        const response = await axios.get(`${API_BASE_URL}/items/search`, {
          params: { q: term }
        });
        
        const updatedSearchResults = [...searchResults];
        updatedSearchResults[index] = response.data || [];
        setSearchResults(updatedSearchResults);
    
        // Show results if there are any
        if (response.data?.length > 0) {
          const updatedShowResults = [...showSearchResults];
          updatedShowResults[index] = true;
          setShowSearchResults(updatedShowResults);
        }
      } catch (error) {
        console.error('Error searching items:', error);
        const updatedSearchResults = [...searchResults];
        updatedSearchResults[index] = [];
        setSearchResults(updatedSearchResults);
      }
    }, [searchResults, showSearchResults]);
    
    // Handle search input change
    const handleSearchChange = (e, index) => {
      const value = e.target.value;
      const newSearchTerms = [...searchTerms];
      newSearchTerms[index] = value;
      setSearchTerms(newSearchTerms);
      
      // Only search if 2+ characters
      if (value.trim().length >= 2) {
        handleSearch(value.trim(), index);
      } else {
        const updatedSearchResults = [...searchResults];
        updatedSearchResults[index] = [];
        setSearchResults(updatedSearchResults);
        setShowSearchResults(prev => {
          const newShowResults = [...prev];
          newShowResults[index] = false;
          return newShowResults;
        });
      }
    };

    // Handle item selection from search results
    const handleItemSelect = (item, index) => {
      // Set the search term for the current row
      const updatedSearchTerms = [...searchTerms];
      updatedSearchTerms[index] = item.itemName;
      setSearchTerms(updatedSearchTerms);
      
      // Calculate amount and total with GST
      const qty = 1;
      const sellPrice = parseFloat(item.sellPrice) || 0;
      const gstRate = parseFloat(item.gst) || 0;
      const amount = (sellPrice * qty).toFixed(2);
      const gstAmount = (amount * gstRate / 100).toFixed(2);
      const total = (parseFloat(amount) + parseFloat(gstAmount)).toFixed(2);
      
      // Update the current item in the items array
      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        itemName: item.itemName || '',
        mrp: (item.mrp || 0).toString(),
        sellPrice: sellPrice.toString(),
        qty: qty.toString(),
        gst: gstRate.toString(),
        discount: '0',
        itemId: item.id ? item.id.toString() : null,
        availableStock: item.currentStock || 0,
        unit: item.unit || 'PCS',
        amount: amount,
        total: total
      };
      
      setItems(updatedItems);
      
      // Hide search results for this row
      const updatedShowResults = [...showSearchResults];
      updatedShowResults[index] = false;
      setShowSearchResults(updatedShowResults);
      
      // Recalculate totals
      calculateTotals();
    };


    // Convert string values to numbers for calculations with better handling of edge cases
    const getNumericValue = (value) => {
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      
      // Handle string numbers with commas or other non-numeric characters
      if (typeof value === 'string') {
        // Remove any non-numeric characters except decimal point and minus sign
        const numericString = value.replace(/[^0-9.-]/g, '');
        const num = parseFloat(numericString);
        return isNaN(num) ? 0 : num;
      }
      
      // Handle Big.js objects
      if (value && typeof value === 'object' && 'toNumber' in value) {
        return value.toNumber();
      }
      
      // Handle regular numbers
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };

    // Calculate totals when items or form data changes
    // 1. Memoize calculateTotals with useCallback
    const calculateTotals = useCallback(() => {
      // Calculate subtotal (sum of all item amounts)
      const subTotal = items.reduce((sum, item) => {
        return sum + parseFloat(item.amount || 0);
      }, 0);
    
      // Calculate total GST (sum of all item totals - subtotal)
      const totalGst = items.reduce((sum, item) => {
        return sum + (parseFloat(item.total || 0) - parseFloat(item.amount || 0));
      }, 0);
    
      // Calculate grand total (subtotal + GST - invoice discount)
      const invoiceDiscount = parseFloat(formData.invoiceDiscount || 0);
      const grandTotal = (subTotal + totalGst) * (1 - invoiceDiscount / 100);
      
      setFormData(prev => ({
        ...prev,
        subTotal: subTotal.toFixed(2),
        totalGst: totalGst.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        balance: (parseFloat(prev.receivedAmount || 0) - grandTotal).toFixed(2)
      }));
    }, [items, formData.invoiceDiscount, formData.receivedAmount]);

// 2. Call calculateTotals in useEffect
useEffect(() => {
  calculateTotals();
}, [calculateTotals]);

    // Close search results when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (event.target.closest('.search-container') === null) {
          setShowSearchResults(showSearchResults.map(() => false));
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showSearchResults]);

    const addItem = () => {
      const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
      setItems([...items, { id: newId, itemId: '', itemName: '', hsn: '', qty: '1', mrp: '', sellPrice: '', gst: '', discount: '', amount: '0', total: '0', availableStock: 0 }]);
    };

    const removeItem = (index) => {
      if (items.length > 1) {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
        const newSearchTerms = [...searchTerms];
        newSearchTerms.splice(index, 1);
        setSearchTerms(newSearchTerms);
        const newShowResults = [...showSearchResults];
        newShowResults.splice(index, 1);
        setShowSearchResults(newShowResults);
        const newSearchResults = [...searchResults];
        newSearchResults.splice(index, 1);
        setSearchResults(newSearchResults);
      }
    };

    const handleItemChange = (index, field, value) => {
      const newItems = [...items];
      
      // Handle numeric fields
      if (['qty', 'discount', 'gst', 'mrp', 'sellPrice', 'amount', 'total'].includes(field)) {
        // Only allow numbers, decimal point, and empty string
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
          newItems[index][field] = value;
        }
      } else {
        newItems[index][field] = value;
      }
    
      // Calculate amount and total when relevant fields change
      if (['qty', 'sellPrice', 'discount', 'gst'].includes(field)) {
        const qty = parseFloat(newItems[index].qty || 0);
        const sellPrice = parseFloat(newItems[index].sellPrice || 0);
        const discount = parseFloat(newItems[index].discount || 0);
        const gst = parseFloat(newItems[index].gst || 0);
    
        // Calculate amount (price after discount)
        const amount = (sellPrice * qty) * (1 - discount / 100);
        newItems[index].amount = amount.toFixed(2);
    
        // Calculate total (amount + GST)
        const total = amount * (1 + gst / 100);
        newItems[index].total = total.toFixed(2);
      }
      
      // Validate stock quantity
      if (field === 'qty') {
        const availableStock = getNumericValue(newItems[index].availableStock);
        const qty = getNumericValue(value);
        if (qty > availableStock) {
          newItems[index].qty = availableStock.toString();
        }
      }
      
      setItems(newItems);
    };
    

    // Update handleInputChange to properly handle numeric fields and empty values
    const handleInputChange = (field, value) => {
      // For numeric fields, ensure we never set undefined or null
      if (field === 'receivedAmount' || field === 'invoiceDiscount') {
        // Allow empty string or valid number
        if (value === '' || !isNaN(parseFloat(value))) {
          setFormData(prev => ({
            ...prev,
            [field]: value === '' ? '' : parseFloat(value).toString()
          }));
        }
      } else {
        // For non-numeric fields
        setFormData(prev => ({
          ...prev,
          [field]: value || '' // Ensure we never set undefined
        }));
      }
    };

    const toggleBarcodeScanning = (index) => {
      if (isScanning && scanningRow === index) {
        setIsScanning(false);
        setScanningRow(null);
      } else {
        setIsScanning(true);
        setScanningRow(index);
        // Focus the input when starting to scan
        setTimeout(() => {
          const input = searchInputRefs.current[index];
          if (input) {
            input.focus();
            input.select();
          }
        }, 100);
      }
    };
    
    const handleBarcodeScan = async (barcode, index) => {
      if (!barcode || !isScanning || scanningRow !== index) return;
      
      console.log('Processing barcode:', barcode);
      setIsProcessingBarcode(true);
      
      try {
        const cleanBarcode = barcode.trim();
        const response = await axios.get(`http://localhost:8080/api/items/barcode/${encodeURIComponent(cleanBarcode)}`);
        
        if (response.data) {
          const item = response.data;
          setItems(prevItems => {
            const newItems = [...prevItems];
            newItems[index] = {
              ...(newItems[index] || {}),
              id: index + 1,
              itemId: item.id,
              itemName: item.itemName || item.name,
              name: item.itemName || item.name,
              hsn: item.hsn || '',
              mrp: item.mrp,
              sellPrice: item.sellPrice,
              price: item.sellPrice,
              gst: item.gst || '',
              amount: item.sellPrice,
              total: (item.sellPrice * 1).toFixed(2),
              availableStock: item.currentStock || 0,
              unit: item.unit || 'PCS',
              quantity: 1
            };
            return newItems;
          });
    
          // Update search terms to show the item name
          const updatedSearchTerms = [...searchTerms];
          updatedSearchTerms[index] = item.itemName || item.name;
          setSearchTerms(updatedSearchTerms);
        }
      } catch (error) {
        console.error('Error scanning barcode:', error);
        if (error.response?.status === 404) {
          alert(`No item found with barcode: ${barcode}`);
        }
      } finally {
        setIsProcessingBarcode(false);
        setIsScanning(false);
        setScanningRow(null);
        setBarcodeValue('');
      }
    };
    
    const searchByBarcode = async (barcode, index) => {
      try {
        console.log('Searching for barcode:', barcode);
        const response = await axios.get(`http://localhost:8080/api/items/barcode/${encodeURIComponent(barcode)}`);
        
        if (response.data) {
          console.log('Item found:', response.data);
          handleItemSelect(response.data, index);
        } else {
          console.log('No item found for barcode:', barcode);
          // Clear the search term for this row
          const updatedSearchTerms = [...searchTerms];
          updatedSearchTerms[index] = '';
          setSearchTerms(updatedSearchTerms);
          
          // Show error message
          alert('No item found with this barcode');
        }
      } catch (error) {
        console.error('Error searching by barcode:', error);
        
        // Clear the search term for this row
        const updatedSearchTerms = [...searchTerms];
        updatedSearchTerms[index] = '';
        setSearchTerms(updatedSearchTerms);
        
        // Check if it's a 404 error (item not found)
        if (error.response && error.response.status === 404) {
          console.log('No item found for barcode (404)');
          alert('No item found with this barcode');
        } else {
          console.error('Error details:', error.response || error.message);
          alert('Error searching for barcode. Please try again.');
        }
      } finally {
        // Always turn off scanning mode after search
        setIsScanning(false);
        setScanningRow(null);
      }
    };

    const validateForm = () => {
      if (isProcessingBarcode) {
        return false; // Prevent form submission during barcode processing
      }
    
      if (items.length === 0) {
        alert('Please add at least one item');
        return false;
      }
    
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item?.itemName || !item.quantity || !item.price) {
          return false;
        }
      }
      return true;
    };

    const resetForm = () => {
      setItems([{ 
        id: 1, 
        itemId: '', 
        itemName: '', 
        hsn: '', 
        qty: '1', 
        mrp: '', 
        sellPrice: '', 
        discount: '0', 
        gst: '0', 
        amount: '0', 
        total: '0', 
        availableStock: 0 
      }]);
      
      setFormData(prev => ({
        ...prev,
        customerName: '',
        mobile: '',
        address: '',
        customerId: null, 
        paymentMode: 'cash',
        receivedAmount: '',
        balance: '0.00',
        invoiceDiscount: '0',
        subTotal: '0.00',
        totalGst: '0.00',
        grandTotal: '0.00'
      }));
      
      setSearchTerms(['']);
    };
    
    
    const handleSave = async (shouldPrint = false) => {
      try {
        console.log('Starting save and print process...');
        setIsSaving(true);
        
        // Generate a bill number
        const billNumber = `INV-${Date.now().toString().slice(-6)}`;
        
        const billData = {
          // Required fields from error
          billNumber: billNumber,
          type: 'SALE', // Assuming this is a sale invoice
          billDate: new Date().toISOString(),
          subtotal: parseFloat(formData.subTotal || 0),
          taxAmount: parseFloat(formData.totalGst || 0),
          discountAmount: parseFloat(formData.invoiceDiscount || 0),
          
          // Existing fields
          customerName: formData.customerName || 'Walk-in Customer',
          phoneNumber: formData.mobile || '',
          address: formData.address || '',  
          customerId: formData.customerId ? Number(formData.customerId) : null,
          paidAmount: parseFloat(formData.receivedAmount || 0),  
          paymentMode: formData.paymentMode || 'cash',
          subTotal: parseFloat(formData.subTotal || 0),
          totalGst: parseFloat(formData.totalGst || 0),
          grandTotal: parseFloat(formData.grandTotal || 0),
          receivedAmount: parseFloat(formData.receivedAmount || 0),
          balance: parseFloat(formData.balance || 0),
          items: items.map(item => ({
            itemId: item.itemId,
            itemName: item.itemName,
            mrp: parseFloat(item.mrp || 0),
            sellPrice: parseFloat(item.sellPrice || 0),
            price: parseFloat(item.sellPrice || 0), // Added price field
            quantity: parseFloat(item.qty || 0),
            gst: parseFloat(item.gst || 0),
            discount: parseFloat(item.discount || 0),
            amount: parseFloat(item.amount || 0),
            total: parseFloat(item.total || 0),
            unit: item.unit || 'PCS'
          }))
        };
    
        console.log('Saving bill data:', JSON.stringify(billData, null, 2));
        
        // Make API call to save the bill
        const response = await axios.post('http://localhost:8080/api/bills', billData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
    
        console.log('Save successful:', response.data);
        
        if (shouldPrint) {
          await handlePrint(response.data);
        } else {
          alert('Bill saved successfully!');
        }
    
        resetForm();
        return response.data;
        
      } catch (error) {
        console.error('Error saving bill:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: {
            url: error.config?.url,
            data: error.config?.data,
            headers: error.config?.headers
          }
        });
        
        const errorMessage = error.response?.data?.message || error.message || 'Failed to save bill. Please try again.';
        alert(`Error: ${errorMessage}`);
        return null;
      } finally {
        setIsSaving(false);
      }
    };

    const handleSaveAndPrint = async () => {
      try {
        console.log('Starting save and print process...');
        // First save the bill
        const savedBill = await handleSave(true);
        
        if (savedBill) {
          console.log('Bill saved successfully, generating PDF...');
          // Use the saved bill data to ensure we have the latest information
          await handlePrint(savedBill);
        } else {
          console.log('Save was not successful, not generating PDF');
        }
      } catch (error) {
        console.error('Error in save and print:', error);
        alert('Failed to complete save and print. Please try again.');
      }
    };

    const handlePrint = async (savedBill = null) => {
      try {
        const billData = savedBill || formData;
        const itemsToPrint = savedBill?.items || items;
        
        // Format data for receipt generator
        const receiptData = {
          billNumber: billData.billNumber || `INV-${Date.now()}`,
          date: new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          cashierName: billData.cashierName || 'Cashier',
          items: itemsToPrint.map(item => ({
            name: item.itemName || 'Item',
            quantity: item.qty || 1,
            rate: item.sellPrice || 0,
            amount: item.total || 0
          })),
          subtotal: billData.subtotal || 0,
          discount: billData.discountAmount || 0,
          discountPercent: billData.discountPercent || 0,
          total: billData.grandTotal || 0,
          paymentMethod: billData.paymentMethod || 'Cash',
          amountPaid: billData.amountPaid || 0,
          change: billData.change || 0
        };
    
        // Use the receipt generator
        generateReceipt(receiptData);
        
      } catch (error) {
        console.error('Error generating receipt:', error);
        alert('Failed to generate receipt. Please try again.');
      }
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
                value={formData.invoiceNo|| ""}
                onChange={(e) => handleInputChange('invoiceNo', e.target.value)}
                placeholder="Auto-generated"
                disabled
              />
            </div>
            <div className="form-group">
              <label>{t('pages.newBill.date')}</label>
              <input
                type="date"
                value={formData.date|| ""}
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
                  value={formData.customerName|| ""}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('pages.newBill.phoneNumber')}</label>
                <input
                  type="text"
                  value={formData.mobile || ""}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  maxLength="10"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Customer ID</label>
              <input
                type="text"
                value={formData.customerId || ""}
                onChange={(e) => handleInputChange('customerId', e.target.value)}
                placeholder="Enter customer ID"
              />
            </div>
            <div className="form-group">
              <label>{t('pages.newBill.address')}</label>
              <textarea
                value={formData.address|| ""}
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
                      <div className="search-container" style={{ position: 'relative' }}>
    <div className="search-input-container">
      <Search size={16} style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#6c757d',
        pointerEvents: 'none'
      }} />
      <input
        type="text"
        ref={el => searchInputRefs.current[index] = el}
        value={isScanning && scanningRow === index ? barcodeValue : (searchTerms[index] || '')}
        onChange={(e) => {
          const value = e.target.value;
          if (isScanning && scanningRow === index) {
            setBarcodeValue(value);
            if (value.length >= 8) {
              handleBarcodeScan(value.trim(), index);
            }
          } else {
            const newSearchTerms = [...searchTerms];
            newSearchTerms[index] = value;
            setSearchTerms(newSearchTerms);
            if (value.trim().length >= 2) {
              handleSearch(value.trim(), index);
            } else {
              const updatedSearchResults = [...searchResults];
              updatedSearchResults[index] = [];
              setSearchResults(updatedSearchResults);
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (isScanning && scanningRow === index) {
              const barcode = barcodeValue.trim();
              if (barcode.length >= 6) {
                handleBarcodeScan(barcode, index);
              }
            } else if (searchResults[index]?.[0]) {
              handleItemSelect(searchResults[index][0], index);
            }
          }
        }}
      onFocus={() => {
        const updatedShowResults = [...showSearchResults];
        updatedShowResults[index] = true;
        setShowSearchResults(updatedShowResults);
      }}
      onBlur={() => {
        setTimeout(() => {
          const updatedShowResults = [...showSearchResults];
          updatedShowResults[index] = false;
          setShowSearchResults(updatedShowResults);
        }, 200);
      }}
      placeholder={isScanning && scanningRow === index ? 'Scan barcode...' : 'Type to search items...'}
      className="form-control search-input"
      style={{
        paddingLeft: '40px',
        paddingRight: '40px',
        height: '40px',
        border: isScanning && scanningRow === index 
          ? '2px solid #dc3545' 
          : showSearchResults[index] && searchResults[index]?.length > 0 
            ? '1px solid #80bdff' 
            : '1px solid #ced4da',
        boxShadow: isScanning && scanningRow === index 
          ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' 
          : showSearchResults[index] && searchResults[index]?.length > 0
            ? '0 0 0 0.2rem rgba(0, 123, 255, 0.25)'
            : 'none',
        transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
      }}
    />
      <button
        type="button"
        onClick={() => toggleBarcodeScanning(index)}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: isScanning && scanningRow === index ? '#dc3545' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isScanning && scanningRow === index ? 'white' : '#6c757d',
          transition: 'all 0.2s ease'
        }}
        title={isScanning && scanningRow === index ? 'Stop Scanning' : 'Scan Barcode'}
      >
        <Barcode size={18} />
      </button>
    </div>
    {isScanning && scanningRow === index && (
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        background: '#dc3545',
        color: 'white',
        padding: '4px 8px',
        fontSize: '12px',
        borderRadius: '0 0 4px 4px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <Scan size={12} />
        <span>Scanning mode active - scan a barcode</span>
      </div>
    )}
    {showSearchResults[index] && searchResults[index]?.length > 0 && (
      <ul className="search-results">
        {searchResults[index].map((result) => (
          <li 
            key={result.id}
            className="search-result-item"
            onMouseDown={(e) => {
              e.preventDefault();
              handleItemSelect(result, index);
            }}
          >
            {result.itemName} ({result.barcode || 'No barcode'})
          </li>
        ))}
      </ul>
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
                          <div className="quantity-control">
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => {
                                const newItems = [...items];
                                const currentQty = parseFloat(newItems[index].qty) || 0;
                                newItems[index].qty = (currentQty - 1 > 0 ? currentQty - 1 : 1).toString();
                                setItems(newItems);
                              }}
                              disabled={!item.itemId}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.availableStock || 1}
                              value={item.qty}
                              onChange={(e) => {
                                const value = e.target.value;
                                const availableStock = parseFloat(item.availableStock) || 0;
                              let newQty = value === '' ? '1' : Math.max(1, parseInt(value) || 1);
                              
                              if (newQty > availableStock) {
                                alert(`Only ${availableStock} items available in stock`);
                                newQty = availableStock;
                              }
                              
                              const newItems = [...items];
                              newItems[index].qty = newQty.toString();
                              
                              // Recalculate total
                              if (newItems[index].sellPrice) {
                                const sellPrice = parseFloat(newItems[index].sellPrice) || 0;
                                newItems[index].amount = (sellPrice * newQty).toFixed(2);
                                newItems[index].total = (sellPrice * newQty).toFixed(2);
                              }
                              
                              setItems(newItems);
                            }}
                            className="form-control qty-input"
                            disabled={!item.itemId}
                          />
                          <button 
                            type="button" 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                              const newItems = [...items];
                              const currentQty = parseFloat(newItems[index].qty) || 0;
                              const availableStock = parseFloat(newItems[index].availableStock) || 0;
                              
                              if (currentQty >= availableStock) {
                                alert(`Only ${availableStock} items available in stock`);
                                return;
                              }
                              
                              const newQty = currentQty + 1;
                              newItems[index].qty = newQty.toString();
                              
                              // Recalculate total
                              if (newItems[index].sellPrice) {
                                const sellPrice = parseFloat(newItems[index].sellPrice) || 0;
                                newItems[index].amount = (sellPrice * newQty).toFixed(2);
                                newItems[index].total = (sellPrice * newQty).toFixed(2);
                              }
                              
                              setItems(newItems);
                            }}
                            disabled={!item.itemId || parseFloat(item.qty || 0) >= parseFloat(item.availableStock || 0)}
                          >
                            +
                          </button>
                          {parseFloat(item.qty || 0) > parseFloat(item.availableStock || 0) && (
                            <span className="text-danger ms-2">
                              Only {item.availableStock} available
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.mrp === '0' ? '' : item.mrp}
                          onChange={(e) => {
                            // Allow numbers and single decimal point
                            const value = e.target.value.replace(/[^0-9.]/g, '')
                              .replace(/(\..*)\./g, '$1');
                            handleItemChange(index, 'mrp', value || '0');
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.sellPrice === '0' ? '' : item.sellPrice}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '')
                              .replace(/(\..*)\./g, '$1');
                            handleItemChange(index, 'sellPrice', value || '0');
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.discount === '0' ? '' : item.discount}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '')
                              .replace(/(\..*)\./g, '$1');
                            handleItemChange(index, 'discount', value || '0');
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.gst === '0' ? '' : item.gst}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '')
                              .replace(/(\..*)\./g, '$1');
                            handleItemChange(index, 'gst', value || '0');
                          }}
                        />
                      </td>
                      <td>₹{item.total}</td>
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
                <span>₹{formData.subTotal}</span>
              </div>
              <div className="total-row">
                <span>{t('pages.newBill.totalGst')}:</span>
                <span>₹{formData.totalGst}</span>
              </div>
              <div className="total-row">
                <span>{t('pages.newBill.discount')}:</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.invoiceDiscount === 0 || formData.invoiceDiscount === '' ? '' : formData.invoiceDiscount}
                  onChange={(e) => handleInputChange('invoiceDiscount', e.target.value)}
                  className="discount-input"
                />
              </div>
              <div className="total-row grand-total">
                <span>{t('pages.newBill.grandTotal')}:</span>
                <span>₹{formData.grandTotal}</span>
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
                  value={formData.receivedAmount === 0 || formData.receivedAmount === '' ? '' : formData.receivedAmount}
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
              value={formData.notes || ""}
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

        {/* Print Section */}
        <div id="print-section" style={{ display: 'none' }}>
          <div className="print-only">
            <div className="invoice-header">
              <h2>Tax Invoice</h2>
              <div>Invoice #: {formData.invoiceNo}</div>
              <div>Date: {new Date(formData.date).toLocaleDateString()}</div>
            </div>
            
            <div className="invoice-details">
              <div><strong>Customer:</strong> {formData.customerName || 'Walk-in Customer'}</div>
              {formData.mobile && <div><strong>Mobile:</strong> {formData.mobile}</div>}
              {formData.address && <div><strong>Address:</strong> {formData.address}</div>}
              <div><strong>Payment Mode:</strong> {formData.paymentMode || 'Cash'}</div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th className="text-right">Price</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter(item => item.itemId)
                  .map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.itemName}</td>
                      <td className="text-right">₹{parseFloat(item.sellPrice || 0).toFixed(2)}</td>
                      <td className="text-center">{item.qty}</td>
                      <td className="text-right">₹{(parseFloat(item.sellPrice || 0) * parseFloat(item.qty || 1)).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan="4" className="text-right">Sub Total:</td>
                  <td className="text-right">₹{formData.subTotal || '0.00'}</td>
                </tr>
                {parseFloat(formData.totalGst || 0) > 0 && (
                  <tr>
                    <td colSpan="4" className="text-right">GST:</td>
                    <td className="text-right">₹{formData.totalGst || '0.00'}</td>
                  </tr>
                )}
                {parseFloat(formData.invoiceDiscount || 0) > 0 && (
                  <tr>
                    <td colSpan="4" class="text-right">Discount:</td>
                    <td class="text-right">-₹{formData.invoiceDiscount || '0.00'}</td>
                  </tr>
                )}
                <tr className="total-row">
                  <td colSpan="4" className="text-right">Grand Total:</td>
                  <td className="text-right">₹{formData.grandTotal || '0.00'}</td>
                </tr>
                <tr>
                  <td colSpan="4" className="text-right">Amount Paid:</td>
                  <td className="text-right">₹{formData.receivedAmount || '0.00'}</td>
                </tr>
                <tr className="total-row">
                  <td colSpan="4" className="text-right">
                    {formData.balance >= 0 ? 'Balance Due:' : 'Change:'}
                  </td>
                  <td className="text-right">
                    ₹{Math.abs(parseFloat(formData.balance || 0)).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
            
            <div className="invoice-footer">
              <div>Thank you for your business!</div>
              <div>For any queries, please contact: [Your Contact Info]</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  export default InvoiceForm;
