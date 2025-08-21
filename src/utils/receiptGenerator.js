import { jsPDF } from 'jspdf';

/**
 * Generates a PDF receipt formatted for thermal printers (80mm width)
 * @param {Object} orderData - The order data
 * @param {string} orderData.billNumber - The bill number
 * @param {string} orderData.date - The date of the order
 * @param {string} orderData.cashierName - The name of the cashier
 * @param {Array} orderData.items - The list of items in the order
 * @param {number} orderData.subtotal - The subtotal of the order
 * @param {number} orderData.discount - The discount amount
 * @param {number} orderData.total - The total amount of the order
 * @param {string} orderData.paymentMethod - The payment method
 * @param {number} orderData.amountPaid - The amount paid
 * @param {number} orderData.change - The change amount
 */
export const generateReceipt = (orderData) => {
  // Create a new PDF with 80mm width (standard receipt width)
  console.log('Creating new PDF document...');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 297] // 80mm width, variable height
  });
  console.log('PDF document created');

  // Set font to monospace for consistent alignment
  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  console.log('Font set to courier');

  // Store current Y position
  let yPos = 5;
  const lineHeight = 5;
  const leftMargin = 2;
  const maxWidth = 76; // 80mm - margins

  // Add header
  doc.setFontSize(12);
  doc.setFont('courier', 'bold');
  doc.text('   *** GROCERY MART ***', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
  yPos += lineHeight;
  
  doc.setFontSize(10);
  doc.setFont('courier', 'normal');
  doc.text('123 Market Road, Pune', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
  yPos += lineHeight;
  doc.text('Ph: +91-8149491025', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
  yPos += lineHeight;
  
  // Add divider
  doc.line(leftMargin, yPos, maxWidth - leftMargin, yPos);
  yPos += lineHeight;

  // Add bill info
const billNoText = `Bill: ${orderData.billNumber.slice(-6)}`; // Show only last 6 digits of bill number
doc.text(billNoText, leftMargin, yPos);

// Format date to include year (DD MMM YY)
const formattedDate = new Date(orderData.date).toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: '2-digit'
});

// Position date with minimal spacing
const billNoWidth = doc.getTextWidth(billNoText);
doc.text(`Date: ${formattedDate}`, leftMargin + billNoWidth + 3, yPos);  // Reduced padding to 3

// Add cashier on the next line for better readability
yPos += lineHeight;
doc.text(`Cashier: ${orderData.cashierName}`, leftMargin, yPos);
yPos += lineHeight;
  
  // Add divider
  doc.line(leftMargin, yPos, maxWidth - leftMargin, yPos);
  yPos += lineHeight;

  // Add items header
  doc.setFont('courier', 'bold');
  doc.text('Item'.padEnd(16) + 'Qty   Rate   Amt', leftMargin, yPos);
  yPos += lineHeight;
  
  // Add divider
  doc.line(leftMargin, yPos, maxWidth - leftMargin, yPos);
  yPos += lineHeight;

  // Add items
  doc.setFont('courier', 'normal');
  orderData.items.forEach(item => {
    // Format item name to fit in 16 chars
    let itemName = item.name;
    if (itemName.length > 16) {
      itemName = itemName.substring(0, 16);
    }
    itemName = itemName.padEnd(16);
    
    // Format quantity, rate, and amount
    const qty = item.quantity.toString().padStart(3);
    const rate = parseFloat(item.rate).toFixed(2).padStart(7);
    const amount = parseFloat(item.amount).toFixed(2).padStart(7);
    
    doc.text(`${itemName}${qty}${rate}${amount}`, leftMargin, yPos);
    yPos += lineHeight;
  });

  // Add divider
  doc.line(leftMargin, yPos, maxWidth - leftMargin, yPos);
  yPos += lineHeight;

  // Add totals
  doc.text(`Subtotal${orderData.subtotal.toFixed(2).padStart(28)}`, leftMargin, yPos);
  yPos += lineHeight;
  
  if (orderData.discount > 0) {
    const discountPercent = orderData.discountPercent || 5; // Default to 5% if not provided
    doc.text(`Discount @${discountPercent}%${(orderData.discount * -1).toFixed(2).padStart(18)}`, leftMargin, yPos);
    yPos += lineHeight;
  }
  
  // Add divider
  doc.line(leftMargin, yPos, maxWidth - leftMargin, yPos);
  yPos += lineHeight;
  
  doc.setFont('courier', 'bold');
  doc.text(`TOTAL${orderData.total.toFixed(2).padStart(31)}`, leftMargin, yPos);
  yPos += lineHeight;
  
  // Add divider
  doc.line(leftMargin, yPos, maxWidth - leftMargin, yPos);
  yPos += lineHeight;
  
  // Payment info
  doc.setFont('courier', 'normal');
  doc.text(`Paid (${orderData.paymentMethod})${orderData.amountPaid.toFixed(2).padStart(20)}`, leftMargin, yPos);
  yPos += lineHeight;
  
  doc.text(`Change${orderData.change.toFixed(2).padStart(29)}`, leftMargin, yPos);
  yPos += lineHeight;
  
  // Add divider
  doc.line(leftMargin, yPos, maxWidth - leftMargin, yPos);
  yPos += lineHeight;
  
  // Final saving
  doc.text(`Final Saving :${orderData.discount.toFixed(2).padStart(24)}`, leftMargin, yPos);
  yPos += lineHeight + 2;
  
  // Add divider
  doc.line(leftMargin, yPos, maxWidth - leftMargin, yPos);
  yPos += lineHeight;
  
  // Footer
  doc.setFont('courier', 'bold');
  doc.text('   Thank You for Shopping!', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
  yPos += lineHeight;
  doc.text('     Visit Again - Stay Safe', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
  yPos += lineHeight;
  
  // Final divider
  doc.line(leftMargin, yPos, maxWidth - leftMargin, yPos);

  // Save the PDF
  console.log('Saving PDF...');
  try {
    doc.save(`receipt-${orderData.billNumber}.pdf`);
    console.log('PDF saved successfully');
  } catch (error) {
    console.error('Error saving PDF:', error);
  }
};