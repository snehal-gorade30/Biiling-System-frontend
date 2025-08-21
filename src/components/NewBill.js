import React, { useState, useEffect, useRef } from 'react';
import { FileText, Search, Plus, Minus, User, Printer, MessageCircle, CreditCard, Trash2, ShoppingCart, Barcode } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations/translations';
import { getDisplayText } from '../utils/textUtils';
import ReceiptGenerator from './ReceiptGenerator';
import { jsPDF } from 'jspdf';
import { generateReceipt } from '../utils/receiptGenerator';

const NewBill = () => {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [showCustomerInput, setShowCustomerInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const searchInputRef = useRef(null);
  let barcodeBuffer = '';
  let barcodeTimeout = null;

  // Search products
  const searchProducts = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`http://localhost:8080/api/items/search?q=${encodeURIComponent(term)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search products');
      }
      
      const data = await response.json();
      // Transform the response to match what the component expects
      const formattedResults = data.map(item => ({
        id: item.id,
        itemName: item.itemName,
        mrp: item.mrp,
        sellPrice: item.sellPrice,
        currentStock: item.currentStock,
        unit: item.unit || 'pcs'
      }));
      
      setSearchResults(formattedResults);
    } catch (err) {
      console.error('Error searching products:', err);
      setSearchResults([]);
      setMessage(getDisplayText(translations.pages.newBill.searchError, language));
    } finally {
      setLoading(false);
    }
  };

  // Handle item selection from search results
  const handleItemSelect = (item) => {
    // Check if item is already in cart
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      // If item exists, update quantity if stock allows
      const newQty = existingItem.quantity + 1;
      if (newQty <= item.currentStock) {
        updateQuantity(item.id, newQty);
      } else {
        setMessage(getDisplayText(translations.pages.newBill.insufficientStock, language));
      }
    } else {
      // Add new item to cart with default quantity 1
      if (item.currentStock > 0) {
        addToCart(item, 1, item.sellPrice);
      } else {
        setMessage(getDisplayText(translations.pages.newBill.outOfStock, language));
      }
    }
    
    setSearchTerm('');
    setSearchResults([]);
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle barcode scanner input
  useEffect(() => {
    const handleBarcodeInput = async (e) => {
      if (!isScanning || e.target === searchInputRef.current) return;
      e.preventDefault();
      
      barcodeBuffer += e.key;
      clearTimeout(barcodeTimeout);
      
      barcodeTimeout = setTimeout(async () => {
        if (barcodeBuffer.length >= 3) {
          console.log('Processing barcode:', barcodeBuffer);
          await handleBarcodeScan(barcodeBuffer);
        }
        barcodeBuffer = '';
      }, 100);
    };
  
    window.addEventListener('keydown', handleBarcodeInput);
    return () => {
      window.removeEventListener('keydown', handleBarcodeInput);
      clearTimeout(barcodeTimeout);
    };
  }, [isScanning]);

  // Handle barcode scan
  const handleBarcodeScan = async (barcode) => {
    try {
      setLoading(true);
      setMessage('');
      
      // Call your API to search by barcode
      const response = await fetch(`http://localhost:8080/api/items/barcode/${barcode.trim()}`);
      
      if (response.ok) {
        const item = await response.json();
        
        if (item) {
          // Format the item to match your cart item structure
          const cartItem = {
            id: item.id,
            itemName: item.itemName,
            itemCode: item.itemCode,
            mrp: item.mrp,
            sellPrice: item.sellPrice,
            purchasePrice: item.purchasePrice,
            currentStock: item.currentStock,
            unit: item.unit || 'pcs',
            quantity: 1,
            total: item.sellPrice * 1 // Default quantity 1
          };
          
          // Check if item already exists in cart
          const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
          
          if (existingItemIndex >= 0) {
            // Update quantity if item exists
            const updatedCart = [...cart];
            const newQty = updatedCart[existingItemIndex].quantity + 1;
            
            // Check stock availability
            if (newQty <= item.currentStock) {
              updatedCart[existingItemIndex].quantity = newQty;
              updatedCart[existingItemIndex].total = newQty * item.sellPrice;
              setCart(updatedCart);
              
              // Show success message with translation
              setMessage(
                getDisplayText(
                  translations.pages.newBill.itemUpdated, 
                  language,
                  { itemName: item.itemName, quantity: newQty }
                )
              );
              setTimeout(() => setMessage(''), 2000);
            } else {
              setMessage(getDisplayText(translations.pages.newBill.insufficientStock, language));
            }
          } else {
            // Add new item to cart
            if (item.currentStock > 0) {
              setCart([...cart, cartItem]);
              
              // Show success message with translation
              setMessage(
                getDisplayText(
                  translations.pages.newBill.itemAdded, 
                  language,
                  { itemName: item.itemName }
                )
              );
              setTimeout(() => setMessage(''), 2000);
            } else {
              setMessage(getDisplayText(translations.pages.newBill.outOfStock, language));
            }
          }
        } else {
          // Item not found, search by barcode
          setSearchTerm(barcode);
          searchProducts(barcode);
        }
      } else {
        // Handle API error
        const error = await response.json();
        setMessage(error.message || 'Error processing barcode');
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      setMessage('Error processing barcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle barcode scanning mode
  const toggleBarcodeScanning = () => {
    const newState = !isScanning;
    setIsScanning(newState);
    if (newState) {
      setMessage('Barcode scanning mode: ON - Scan a barcode');
      document.activeElement.blur();
    } else {
      setMessage('Barcode scanning mode: OFF');
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
    setTimeout(() => setMessage(''), 3000);
  };

  // Add item to cart
  const addToCart = (item, quantity = 1, customPrice = null) => {
    const price = customPrice || item.sellPrice;
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);

    if (existingItemIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += quantity;
      updatedCart[existingItemIndex].total = updatedCart[existingItemIndex].quantity * updatedCart[existingItemIndex].price;
      setCart(updatedCart);
    } else {
      const cartItem = {
        id: item.id,
        itemName: item.itemName,
        mrp: item.mrp,
        sellPrice: item.sellPrice,
        price: price,
        quantity: quantity,
        total: price * quantity,
        unit: item.unit,
        maxStock: item.currentStock
      };
      setCart([...cart, cartItem]);
    }

    setSearchTerm('');
    setSearchResults([]);
  };

  // Update quantity in cart
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const updatedCart = cart.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
        : item
    );
    setCart(updatedCart);
  };

  // Update price in cart
  const updatePrice = (itemId, newPrice) => {
    const updatedCart = cart.map(item => 
      item.id === itemId 
        ? { ...item, price: newPrice, total: item.quantity * newPrice }
        : item
    );
    setCart(updatedCart);
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setPhoneNumber('');
    setAddress('');
    setShowCustomerInput(false);
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subtotal;

  // Save bill functions
  const saveBill = async (type = 'cash', shouldGenerateReceipt = false) => {
    if (cart.length === 0) {
      setMessage('Please add items to the cart first');
      return;
    }

    try {
      setLoading(true);
      
      // Calculate tax and discount (set to 0 for now, can be enhanced later)
      const taxAmount = 0;
      const discountAmount = 0;
      const finalTotal = subtotal + taxAmount - discountAmount;
      
      // Prepare the bill data in the format expected by backend
      const billData = {
        billNumber: `BILL-${Date.now()}`,
        customerName: customerName || 'Walk-in Customer',
        phoneNumber: phoneNumber || '',
        address: address || '',
        items: cart.map(item => ({
          itemId: item.id,
          itemName: item.itemName,
          mrp: parseFloat(item.mrp),
          sellPrice: parseFloat(item.sellPrice || item.price),
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
          total: parseFloat(item.total),
          unit: item.unit || 'PCS'
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        grandTotal: parseFloat(finalTotal.toFixed(2)),
        type: type.toUpperCase(),
        billDate: new Date().toISOString().slice(0, 19)
      };

      // First save the bill
      const billResponse = await fetch('http://localhost:8080/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billData),
      });

      if (!billResponse.ok) {
        const errorText = await billResponse.text();
        throw new Error(`Failed to save bill: ${errorText}`);
      }

      // If bill is saved successfully, update stock
      const itemQuantities = cart.map(item => ({
        itemId: item.id,
        quantity: item.quantity
      }));

      const stockResponse = await fetch('http://localhost:8080/api/items/update-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemQuantities),
      });

      if (!stockResponse.ok) {
        const error = await stockResponse.text();
        throw new Error(`Failed to update stock: ${error}`);
      }

      // Show success message
      setMessage(`${getDisplayText(translations.pages.newBill.billSaved, language)} - ${billData.billNumber}`);
      
      // Generate thermal receipt if requested
      if (shouldGenerateReceipt) {
        console.log('Preparing receipt data...');
        const receiptData = {
          billNumber: billData.billNumber.split('-')[1], // Get just the number part after BILL-
          cashierName: 'Cashier',
          items: cart.map(item => ({
            name: item.itemName,
            quantity: item.quantity,
            rate: item.price,
            amount: item.total,
            unit: item.unit || 'pcs'
          })),
          subtotal: subtotal,
          discount: 0,
          discountPercent: 0,
          total: grandTotal,
          paymentMethod: type === 'cash' ? 'Cash' : type === 'credit' ? 'Credit' : type,
          amountPaid: grandTotal,
          change: 0,
          date: new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        };
        
        console.log('Receipt data:', receiptData);
        
        try {
          console.log('Generating receipt...');
          generateReceipt(receiptData);
          console.log('Receipt generation completed');
        } catch (error) {
          console.error('Error generating receipt:', error);
        }
      }
      
      // Only clear cart for cash payments
      if (type === 'cash') {
        clearCart();
      }
      
      return true;
      
    } catch (err) {
      console.error('Error saving bill:', err);
      setMessage('Error saving bill: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle save and print
  const handleSaveAndPrint = async () => {
    const success = await saveBill('cash', true);
    if (!success) {
      setMessage('Failed to save bill. Receipt not generated.');
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div className="newbill-container">
      <div className="page-header">
        <FileText size={24} />
        <div>
          <h1>{getDisplayText(translations.pages.newBill.title, language)}</h1>
          <p>{getDisplayText(translations.pages.newBill.description, language)}</p>
        </div>
      </div>

      <div className="newbill-content">
        {/* Left Panel - Product Search & Cart */}
        <div className="left-panel">
          {/* Customer Section */}
          <div className="customer-section">
            {!showCustomerInput ? (
              <button 
                className="add-customer-btn"
                onClick={() => setShowCustomerInput(true)}
              >
                <User size={16} />
                {getDisplayText(translations.pages.newBill.addCustomer, language)}
              </button>
            ) : (
              <div className="customer-input">
                <div className="customer-fields">
                  <input
                    type="text"
                    placeholder={getDisplayText(translations.pages.newBill.customerName, language)}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="customer-field-input"
                  />
                  <input
                    type="tel"
                    placeholder={getDisplayText(translations.pages.newBill.phoneNumber, language)}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="customer-field-input"
                  />
                  <textarea
                    placeholder={getDisplayText(translations.pages.newBill.address, language)}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="customer-field-input address-input"
                    rows="2"
                  />
                </div>
                <button onClick={() => setShowCustomerInput(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Search and Barcode Section */}
          <div className="search-container">
            <div className="search-input-container">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchProducts(searchTerm)}
                placeholder={getDisplayText(translations.pages.newBill.searchProduct, language)}
                className="search-input"
              />
              <button
                type="button"
                onClick={toggleBarcodeScanning}
                className={`barcode-scan-btn ${isScanning ? 'scanning' : ''}`}
                title={isScanning ? 'Stop Barcode Scan' : 'Start Barcode Scan'}
              >
                <Barcode size={18} />
                {isScanning && <span className="scan-indicator"></span>}
              </button>
            </div>
            {isScanning && (
              <div className="scan-mode-indicator">
                <span className="blink">🔴</span> {getDisplayText(translations.pages.newBill.scanModeActive || 'Scan Mode Active', language)}
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((item) => (
                <div 
                  key={item.id} 
                  className="search-result-item"
                  onClick={() => handleItemSelect(item)}
                >
                  <div className="item-name">{item.itemName}</div>
                  <div className="item-details">
                    <span>MRP: ₹{item.mrp}</span>
                    <span>Price: ₹{item.sellPrice}</span>
                    <span>Stock: {item.currentStock} {item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Cart Items */}
          <div className="cart-section">
            <div className="cart-header">
              <h3>
                <ShoppingCart size={20} />
                {getDisplayText(translations.pages.newBill.billItems, language)} ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button onClick={clearCart} className="clear-cart-btn">
                  <Trash2 size={16} />
                  {getDisplayText(translations.pages.newBill.clearCart, language)}
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="empty-cart">{getDisplayText(translations.pages.newBill.noItemsInCart, language)}</p>
            ) : (
              <div className="cart-items">
                {cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="item-details">
                      <h4>{item.itemName}</h4>
                      <div className="item-prices">
                        <span className="mrp">MRP: {formatCurrency(item.mrp)}</span>
                        <span className="sell-price">Sell: {formatCurrency(item.sellPrice)}</span>
                      </div>
                      <p>{item.unit}</p>
                    </div>
                    
                    <div className="quantity-controls">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="qty-btn minus"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="qty-btn plus"
                        disabled={item.quantity >= item.maxStock}
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    <div className="price-controls">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                        className="price-input"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div className="item-total">
                      {formatCurrency(item.total)}
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="remove-btn"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Bill Summary & Actions */}
        <div className="right-panel">
          <div className="bill-summary">
            <h3>Bill Summary</h3>
            <div className="bill-header">
              <div className="bill-date">
                <strong>{getDisplayText(translations.pages.newBill.date, language)}: {new Date().toLocaleDateString()}</strong>
              </div>
            </div>
            {(customerName || phoneNumber || address) && (
              <div className="customer-info">
                {customerName && <div><strong>Customer: {customerName}</strong></div>}
                {phoneNumber && <div>Phone: {phoneNumber}</div>}
                {address && <div>Address: {address}</div>}
              </div>
            )}
            
            <div className="totals">
              <div className="total-row">
                <span>{getDisplayText(translations.pages.newBill.subtotal, language)}:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="total-row grand-total">
                <span>{getDisplayText(translations.pages.newBill.grandTotal, language)}:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                onClick={handleSaveAndPrint}
                className="btn btn-primary"
                disabled={cart.length === 0 || loading}
              >
                <Printer size={16} />
                {getDisplayText(translations.pages.newBill.saveAndPrint, language)}
              </button>

              <button
                onClick={() => saveBill('whatsapp')}
                className="btn btn-success"
                disabled={cart.length === 0 || loading}
              >
                <MessageCircle size={16} />
                {getDisplayText(translations.pages.newBill.whatsapp, language)}
              </button>

              <button
                onClick={() => saveBill('credit')}
                className="btn btn-warning"
                disabled={cart.length === 0 || loading}
              >
                <CreditCard size={16} />
                {getDisplayText(translations.pages.newBill.saveAsUdhaar, language)}
              </button>
            </div>

            {message && (
              <div className="message">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .newbill-container {
          padding: 20px;
          max-width: 1400px;
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
        }

        .newbill-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 30px;
        }

        .left-panel {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .right-panel {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          height: fit-content;
          position: sticky;
          top: 20px;
        }

        .customer-section {
          margin-bottom: 20px;
        }

        .add-customer-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #f8f9fa;
          border: 2px dashed #dee2e6;
          border-radius: 6px;
          cursor: pointer;
          color: #6c757d;
          font-size: 14px;
          width: 100%;
        }

        .add-customer-btn:hover {
          background: #e9ecef;
          border-color: #adb5bd;
        }

        .customer-input {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .customer-fields {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .customer-field-input {
          padding: 10px;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-size: 14px;
        }

        .address-input {
          resize: vertical;
          min-height: 60px;
        }

        .search-section {
          margin-bottom: 30px;
        }

        .search-container {
          position: relative;
          margin: 15px 0;
          width: 100%;
        }

        .search-input-container {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
          z-index: 2;
        }

        .search-input {
          width: 100%;
          padding: 12px 50px 12px 45px;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          font-size: 16px;
          height: 48px;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }

        .barcode-scan-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: #f8f9fa;
          border: 2px solid #dee2e6;
          border-radius: 6px;
          padding: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: all 0.2s ease;
        }

        .barcode-scan-btn:hover {
          background: #e9ecef;
          border-color: #ced4da;
        }

        .barcode-scan-btn.scanning {
          background: #dc3545;
          border-color: #dc3545;
          color: white;
          animation: pulse 1.5s infinite;
        }

        .scan-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: white;
          margin-left: 5px;
          animation: blink 1s infinite;
        }

        .scan-mode-indicator {
          margin-top: 8px;
          padding: 8px 12px;
          background: #dc3545;
          color: white;
          border-radius: 6px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeIn 0.3s ease;
        }

        .cart-section {
          flex: 1;
        }

        .cart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .cart-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: #343a40;
        }

        .clear-cart-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .clear-cart-btn:hover {
          background: #c82333;
        }

        .empty-cart {
          text-align: center;
          color: #6c757d;
          padding: 40px;
          font-style: italic;
        }

        .cart-items {
          max-height: 400px;
          overflow-y: auto;
        }

        .cart-item {
          display: grid;
          grid-template-columns: 2fr 120px 80px 80px 40px;
          gap: 15px;
          align-items: center;
          padding: 15px;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          margin-bottom: 10px;
          background: #f8f9fa;
        }

        .item-details h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 500;
        }

        .item-prices {
          display: flex;
          gap: 10px;
          margin: 4px 0;
        }

        .item-prices .mrp {
          font-size: 11px;
          color: #dc3545;
          background: #ffebee;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .item-prices .sell-price {
          font-size: 11px;
          color: #28a745;
          background: #e8f5e8;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .item-details p {
          margin: 0;
          font-size: 12px;
          color: #6c757d;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qty-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: bold;
        }

        .qty-btn.minus {
          background: #dc3545;
          color: white;
        }

        .qty-btn.plus {
          background: #28a745;
          color: white;
        }

        .qty-btn:hover {
          opacity: 0.8;
        }

        .qty-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .quantity {
          font-weight: bold;
          min-width: 20px;
          text-align: center;
        }

        .price-input {
          width: 70px;
          padding: 6px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          text-align: right;
          font-size: 14px;
        }

        .item-total {
          font-weight: bold;
          text-align: right;
          color: #28a745;
        }

        .remove-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .remove-btn:hover {
          background: #c82333;
        }

        .bill-summary h3 {
          margin: 0 0 20px 0;
          color: #343a40;
        }

        .bill-header {
          margin-bottom: 15px;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }

        .bill-date {
          font-size: 14px;
          color: #495057;
        }

        .customer-info {
          margin-bottom: 20px;
          padding: 12px;
          background: #e7f3ff;
          border-radius: 6px;
          border-left: 4px solid #007bff;
        }

        .customer-info div {
          margin-bottom: 4px;
          font-size: 14px;
        }

        .customer-info div:last-child {
          margin-bottom: 0;
        }

        .totals {
          margin-bottom: 30px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f8f9fa;
        }

        .grand-total {
          font-weight: bold;
          font-size: 1.1em;
          color: #28a745;
          border-bottom: 2px solid #28a745;
          margin-top: 10px;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-success {
          background: #25d366;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background: #1da851;
        }

        .btn-warning {
          background: #ffc107;
          color: #212529;
        }

        .btn-warning:hover:not(:disabled) {
          background: #e0a800;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .message {
          margin-top: 15px;
          padding: 10px;
          background: #d4edda;
          color: #155724;
          border-radius: 6px;
          font-size: 14px;
        }

        .error {
          background: #f8d7da;
          color: #721c24;
        }

        .loading-text, .no-results {
          text-align: center;
          color: #6c757d;
          padding: 20px;
          font-style: italic;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1024px) {
          .newbill-content {
            grid-template-columns: 1fr;
          }
          
          .right-panel {
            position: static;
          }
          
          .cart-item {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .quantity-controls {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default NewBill;
