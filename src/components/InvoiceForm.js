  import React, { useState, useEffect, useCallback } from 'react';
  import { useLanguage } from '../context/LanguageContext';
  import { Printer, Plus, Trash2 } from 'lucide-react';
  import axios from 'axios';
  import debounce from 'lodash/debounce';
  import Big from 'big.js';
  import './InvoiceForm.css';
  import { jsPDF } from 'jspdf';
  import 'jspdf-autotable';
  import autoTable from 'jspdf-autotable';

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
      mobile: '',
      address: '',
      paymentMode: 'cash',
      receivedAmount: '',
      invoiceDiscount: '0',
      notes: '',
      subTotal: '0.00',
      totalGst: '0.00',
      grandTotal: '0.00',
      balance: '0.00'
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
      };
    }, [debouncedSearch]);

    // Handle search input change
    const handleSearchChange = (e, index) => {
      const value = e.target.value;
      const updatedSearchTerms = [...searchTerms];
      updatedSearchTerms[index] = value;
      setSearchTerms(updatedSearchTerms);
      
      // Clear selected item if user starts typing again
      if (selectedItem && value !== selectedItem.itemName) {
        setSelectedItem(null);
      }
      
      if (value.trim()) {
        const updatedShowResults = [...showSearchResults];
        updatedShowResults[index] = true;
        setShowSearchResults(updatedShowResults);
        debouncedSearch(value, index);
      } else {
        const updatedShowResults = [...showSearchResults];
        updatedShowResults[index] = false;
        setShowSearchResults(updatedShowResults);
        const updatedSearchResults = [...searchResults];
        updatedSearchResults[index] = [];
        setSearchResults(updatedSearchResults);
      }
    };

    // Handle item selection from search results
    const handleItemSelect = (item, index) => {
      // Set the search term for the current row
      const updatedSearchTerms = [...searchTerms];
      updatedSearchTerms[index] = item.itemName;
      setSearchTerms(updatedSearchTerms);
      
      // Update the current item in the items array
      const updatedItems = [...items];
      
      updatedItems[index] = {
        ...updatedItems[index],
        itemName: item.itemName,
        mrp: item.mrp.toString(),
        sellPrice: item.sellPrice.toString(),
        qty: '1',
        gst: item.gst ? item.gst.toString() : '0',
        discount: '0',
        itemId: item.id,
        availableStock: item.currentStock,
        amount: item.sellPrice.toString(),
        total: item.sellPrice.toString()
      };
      
      setItems(updatedItems);
      
      // Hide search results for this row
      const updatedShowResults = [...showSearchResults];
      updatedShowResults[index] = false;
      setShowSearchResults(updatedShowResults);
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
    useEffect(() => {
      const calculateTotals = () => {
        const updatedItems = items.map(item => {
          const qty = getNumericValue(item.qty);
          const sellPrice = getNumericValue(item.sellPrice);
          const discount = getNumericValue(item.discount);
          const gst = getNumericValue(item.gst);
          
          const amount = (sellPrice * qty) - (discount * qty);
          const gstAmount = (amount * gst) / 100;
          const total = amount + gstAmount;
          
          return { 
            ...item,
            amount: amount.toFixed(2),
            total: total.toFixed(2)
          };
        });

        const subTotal = updatedItems.reduce((sum, item) => 
          sum + getNumericValue(item.amount), 0);
        
        const totalGst = updatedItems.reduce((sum, item) => 
          sum + (getNumericValue(item.total) - getNumericValue(item.amount)), 0);
        
        const grandTotal = subTotal + totalGst;
        
        // Only update items if they've actually changed
        if (JSON.stringify(updatedItems) !== JSON.stringify(items)) {
          setItems(updatedItems);
        }
        
        // Only update form data if values have actually changed
        setFormData(prev => {
          const newFormData = {
            ...prev,
            subTotal: subTotal.toFixed(2),
            totalGst: totalGst.toFixed(2),
            grandTotal: grandTotal.toFixed(2),
            balance: (getNumericValue(prev.receivedAmount) - grandTotal).toFixed(2)
          };
          
          // Only update if values have changed
          return JSON.stringify(prev) !== JSON.stringify(newFormData) ? newFormData : prev;
        });
      };

      calculateTotals();
    }, [items, formData.receivedAmount]);

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

    const handleSave = async (shouldPrint = false) => {
      try {
        setIsSaving(true);
        
        // Validate required fields
        if (!formData.customerName) {
          alert('Customer name is required');
          return false;
        }
    
        // Validate items
        if (items.length === 0) {
          alert('Please add at least one item to the invoice');
          return false;
        }
    
        // Validate payment
        const grandTotal = parseFloat(formData.grandTotal) || 0;
        const receivedAmount = parseFloat(formData.receivedAmount) || 0;
        
        if (formData.paymentMode === 'cash' && receivedAmount < grandTotal) {
          if (!window.confirm('Received amount is less than grand total. Are you sure you want to continue?')) {
            return false;
          }
        }

        // Generate a unique bill number using timestamp and random number
        const generateUniqueBillNumber = () => {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          return `INV-${timestamp}-${random}`;
        };
    
        // Prepare bill data
        const billData = {
            billNumber: formData.invoiceNo || generateUniqueBillNumber(),
            customerName: formData.customerName || '',
            phoneNumber: formData.mobile || '',
            address: formData.address || '',
            type: formData.paymentMode === 'credit' ? 'CREDIT' : 'CASH',
            date: new Date().toISOString(),
            subtotal: (formData.subTotal || 0).toString(),
            grandTotal: (grandTotal || 0).toString(),
            items: items.map(item => ({
              itemId: item.itemId ? parseInt(item.itemId) : null,
              itemName: item.itemName || '',
              mrp: (item.mrp || 0).toString(),
              sellPrice: (item.sellPrice || 0).toString(),
              price: (item.sellPrice || 0).toString(),
              quantity: parseInt(item.qty) || 1,
              total: (item.amount || 0).toString(),
              unit: item.unit || 'PCS'
            }))
          };
        
        console.log('Sending bill data to server:', JSON.stringify(billData, null, 2));
        
        const response = await axios.post(`${API_BASE_URL}/bills`, billData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Server response:', response.data);
        
        if (response.data && response.data.id) {
          alert('Bill saved successfully!');
          return shouldPrint ? response.data : true;
        } else {
          console.error('Unexpected response format:', response.data);
          alert('Failed to save bill: Unexpected response from server');
          return false;
        }
      } catch (error) {
        console.error('Error saving bill:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        const errorMessage = error.response?.data?.message || 
                            error.message || 
                            'Failed to save bill. Please check console for details.';
        alert(`Error: ${errorMessage}`);
        return false;
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
        
        // Initialize jsPDF with proper configuration
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Set initial font
        doc.setFont('helvetica');
        doc.setFontSize(10);
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let yPos = 20;
    
        // Shop Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('Your Shop Name', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
    
        // Shop Details
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Shop Address Line 1', pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
        doc.text('City, State - Pincode', pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
        doc.text('GSTIN: 12ABCDE3456F7Z8 | Phone: +91 9876543210', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
    
        // Invoice Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('TAX INVOICE', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
    
        // Invoice Details
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Invoice #: ${billData.invoiceNo || 'N/A'}`, margin, yPos);
        doc.text(`Date: ${new Date(billData.date).toLocaleDateString('en-IN')}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 10;
    
        // Customer Details
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 5;
        doc.text(`Name: ${billData.customerName || 'Walk-in Customer'}`, margin + 10, yPos);
        yPos += 5;
        doc.text(`Phone: ${billData.mobile || 'N/A'}`, margin + 10, yPos);
        yPos += 5;
        doc.text(`Address: ${billData.address || 'N/A'}`, margin + 10, yPos);
        yPos += 10;
    
        // Items Table
        const tableColumn = [
          'Sr',
          'Item Name',
          'HSN',
          'Qty',
          'Rate (₹)',
          'GST %',
          'Amount (₹)'
        ];
        
        const tableRows = itemsToPrint.map((item, index) => [
          index + 1,
          item.itemName || 'N/A',
          item.hsn || 'N/A',
          item.qty || 0,
          parseFloat(item.sellPrice || 0).toFixed(2),
          item.gst ? `${item.gst}%` : '0%',
          parseFloat(item.amount || 0).toFixed(2)
        ]);
    
        // Add table to PDF
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: yPos,
          margin: { left: margin, right: margin },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2
          },
          columnStyles: {
            0: { cellWidth: 10 }, // Sr No
            1: { cellWidth: 50 }, // Item Name
            2: { cellWidth: 20 }, // HSN
            3: { cellWidth: 15 }, // Qty
            4: { cellWidth: 25 }, // Rate
            5: { cellWidth: 20 }, // GST %
            6: { cellWidth: 25 }  // Amount
          },
          didDrawPage: function(data) {
            // Footer
            doc.setFontSize(8);
            doc.text('Thank you for your business!', pageWidth / 2, doc.internal.pageSize.height - 20, { align: 'center' });
            doc.text('For any queries, please contact: +91 9876543210', pageWidth / 2, doc.internal.pageSize.height - 15, { align: 'center' });
          }
        });
    
        // Calculate totals
        const subtotal = itemsToPrint.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const totalGst = itemsToPrint.reduce((sum, item) => {
          if (item.gst && item.amount) {
            const gstPercentage = parseFloat(item.gst) || 0;
            const itemAmount = parseFloat(item.amount) || 0;
            return sum + (itemAmount * gstPercentage / 100);
          }
          return sum;
        }, 0);
        
        const discount = parseFloat(billData.invoiceDiscount) || 0;
        const grandTotal = subtotal + totalGst - discount;
        const receivedAmount = parseFloat(billData.receivedAmount) || 0;
        const balance = receivedAmount - grandTotal;
    
        // Add totals section
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Sub Total:', pageWidth - 60, finalY);
        doc.text(`₹${subtotal.toFixed(2)}`, pageWidth - margin, finalY, { align: 'right' });
        
        doc.text('GST:', pageWidth - 60, finalY + 5);
        doc.text(`₹${totalGst.toFixed(2)}`, pageWidth - margin, finalY + 5, { align: 'right' });
        
        if (discount > 0) {
          doc.text('Discount:', pageWidth - 60, finalY + 10);
          doc.text(`-₹${discount.toFixed(2)}`, pageWidth - margin, finalY + 10, { align: 'right' });
        }
        
        doc.setFontSize(12);
        doc.text('Grand Total:', pageWidth - 60, finalY + 20);
        doc.text(`₹${grandTotal.toFixed(2)}`, pageWidth - margin, finalY + 20, { align: 'right' });
        
        // Payment Information
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Payment Mode:', margin, finalY + 30);
        doc.text(billData.paymentMode ? billData.paymentMode.charAt(0).toUpperCase() + billData.paymentMode.slice(1) : 'Cash', 
                 margin + 30, finalY + 30);
        
        if (receivedAmount > 0) {
          doc.text('Amount Received:', pageWidth - 100, finalY + 30);
          doc.text(`₹${receivedAmount.toFixed(2)}`, pageWidth - margin, finalY + 30, { align: 'right' });
          
          if (balance > 0) {
            doc.text('Change:', pageWidth - 100, finalY + 35);
            doc.text(`₹${balance.toFixed(2)}`, pageWidth - margin, finalY + 35, { align: 'right' });
          }
        }
    
        // Add notes if available
        if (billData.notes) {
          doc.text('Notes:', margin, finalY + 45);
          doc.text(billData.notes, margin + 15, finalY + 50, { maxWidth: pageWidth - (2 * margin) });
        }
    
        // Save the PDF
        doc.save(`invoice_${billData.invoiceNo || 'temp'}.pdf`);
        
      } catch (error) {
        console.error('Error in handlePrint:', {
          error: error.message,
          stack: error.stack,
          formData: JSON.stringify(formData, null, 2),
          items: JSON.stringify(items, null, 2)
        });
        alert('Failed to generate PDF. Please check console for details.');
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
                        <div className="search-container">
                          <input
                            type="text"
                            value={searchTerms[index] || ''}
                            onChange={(e) => handleSearchChange(e, index)}
                            onFocus={() => {
                              const updatedShowResults = [...showSearchResults];
                              updatedShowResults[index] = true;
                              setShowSearchResults(updatedShowResults);
                            }}
                            onBlur={() => {
                              // Small delay to allow click events to fire before hiding results
                              setTimeout(() => {
                                const updatedShowResults = [...showSearchResults];
                                updatedShowResults[index] = false;
                                setShowSearchResults(updatedShowResults);
                              }, 200);
                            }}
                            placeholder="Type to search items..."
                            className="form-control"
                          />
                          {showSearchResults[index] && searchResults[index]?.length > 0 && (
                            <ul className="search-results">
                              {searchResults[index].map((result) => (
                                <li 
                                  key={result.id}
                                  className="search-result-item"
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent input blur before click
                                    handleItemSelect(result, index);
                                  }}
                                >
                                  {result.itemName}
                                  <span className="item-details">
                                    MRP: ₹{result.mrp} | SP: ₹{result.sellPrice} | Stock: {result.currentStock}
                                  </span>
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
