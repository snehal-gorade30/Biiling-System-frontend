/**
 * Formats text for thermal printer
 * @param {string} text - Text to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted text
 */
export const formatForThermalPrinter = (text, options = {}) => {
  const {
    align = 'left',    // 'left', 'center', 'right'
    bold = false,
    doubleHeight = false,
    doubleWidth = false,
    underline = false,
    newLine = true,
    separator = false
  } = options;

  let result = '';
  
  // Alignment
  if (align === 'center') {
    result += '\x1B\x61\x01'; // Center align
  } else if (align === 'right') {
    result += '\x1B\x61\x02'; // Right align
  } else {
    result += '\x1B\x61\x00'; // Left align (default)
  }

  // Text formatting
  if (bold) result += '\x1B\x45\x01'; // Bold on
  if (doubleHeight) result += '\x1B\x21\x10'; // Double height
  if (doubleWidth) result += '\x1B\x21\x20'; // Double width
  if (underline) result += '\x1B\x2D\x01'; // Underline on

  // Add the text
  result += text;

  // Reset formatting
  if (underline) result += '\x1B\x2D\x00'; // Underline off
  if (bold) result += '\x1B\x45\x00'; // Bold off
  if (doubleHeight || doubleWidth) result += '\x1B\x21\x00'; // Normal size

  // Add separator if needed
  if (separator) {
    result += '\n' + '-'.repeat(32) + '\n';
  }

  // Add newline if needed
  if (newLine) result += '\n';

  return result;
};

/**
 * Creates a thermal printer receipt
 * @param {Object} data - Receipt data
 * @returns {string} - Formatted receipt
 */
export const createReceipt = (data) => {
  const {
    header = 'RECEIPT',
    items = [],
    details = [],
    subtotal = 0,
    tax = 0,
    total = 0,
    footer = 'Thank you for your business!',
    date = new Date().toLocaleString()
  } = data;

  let receipt = '';

  // Initialize printer
  receipt += '\x1B\x40'; // Initialize printer
  
  // Header
  receipt += formatForThermalPrinter(header, { align: 'center', bold: true, doubleHeight: true });
  receipt += formatForThermalPrinter('', { separator: true });
  
  // Date and Time
  receipt += formatForThermalPrinter(date, { align: 'center' });
  receipt += formatForThermalPrinter('', { separator: true });
  
  // Item details
  if (details && details.length > 0) {
    details.forEach(detail => {
      receipt += formatForThermalPrinter(detail, { align: 'left' });
    });
    receipt += formatForThermalPrinter('', { separator: true });
  }
  
  // Items list
  if (items.length > 0) {
    receipt += formatForThermalPrinter('ITEM', { align: 'left', bold: true });
    receipt += formatForThermalPrinter('QTY  PRICE   TOTAL', { align: 'right' });
    receipt += formatForThermalPrinter('', { separator: true });
    
    items.forEach(item => {
      const name = (item.name || '').substring(0, 20); // Limit name length
      const qty = String(item.quantity || 1).padStart(3, ' ');
      const price = parseFloat(item.price || 0).toFixed(2).padStart(8, ' ');
      const total = ((item.quantity || 1) * (item.price || 0)).toFixed(2).padStart(8, ' ');
      
      receipt += `${name}\n`;
      receipt += `    ${qty} x ${price} = ${total}\n`;
    });
    
    // Totals
    receipt += formatForThermalPrinter('', { separator: true });
    receipt += formatForThermalPrinter(`Subtotal: ${parseFloat(subtotal).toFixed(2).padStart(10, ' ')}`, { align: 'right' });
    receipt += formatForThermalPrinter(`Tax: ${parseFloat(tax).toFixed(2).padStart(10, ' ')}`, { align: 'right' });
    receipt += formatForThermalPrinter('', { separator: true });
    receipt += formatForThermalPrinter(`TOTAL: ${parseFloat(total).toFixed(2).padStart(10, ' ')}`, { align: 'right', bold: true });
  }
  
  // Footer
  receipt += formatForThermalPrinter('', { separator: true });
  receipt += formatForThermalPrinter(footer, { align: 'center' });
  
  // Add some space before cutting
  receipt += '\n\n\n\n';
  
  // Cut paper (partial cut with 5mm feed)
  receipt += '\x1D\x56\x41\x05';
  
  return receipt;
};

/**
 * Sends data to printer
 * @param {string} printerData - Formatted printer data
 * @returns {Promise<boolean>} - Whether printing was successful
 */
export const printReceipt = async (printerData) => {
  try {
    // For web apps, we can use the browser's print dialog
    // For actual thermal printers, you would need a printer-specific solution
    const printWindow = window.open('', '_blank');
    
    // Create a simple HTML document with monospace font
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          @media print {
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0;
              padding: 0;
            }
            .receipt {
              width: 100%;
              max-width: 80mm;
              margin: 0 auto;
              padding: 5mm;
              white-space: pre-line;
              word-break: break-all;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">${printerData.replace(/\n/g, '<br>')}</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 100);
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    return true;
  } catch (error) {
    console.error('Printing error:', error);
    return false;
  }
};
