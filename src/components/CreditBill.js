import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { format } from 'date-fns';
import 'react-toastify/dist/ReactToastify.css';
import './CreditBill.css';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = 'http://localhost:8080/api/credit-bills';

const CreditBill = () => {
  const { t } = useLanguage();
  const [creditBills, setCreditBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'CASH'
  });

  useEffect(() => {
    const fetchCreditBills = async () => {
      try {
        const response = await axios.get(API_URL);
        setCreditBills(response.data);
      } catch (error) {
        console.error('Error fetching credit bills:', error);
        toast.error('Failed to load credit bills');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreditBills();
  }, []); // Empty dependency array means this runs once on mount

  const handlePaymentClick = (bill) => {
    setSelectedBill(bill);
    const pendingAmount = bill.totalAmount - (bill.paidAmount || 0);
    setPaymentData({
      amount: pendingAmount.toString(),
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'CASH'
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const paymentAmount = parseFloat(paymentData.amount);
      const paymentDto = {
        amount: paymentAmount,
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod
      };
      
      await axios.post(`${API_URL}/${selectedBill.id}/payments`, paymentDto);
      
      // Update the local state to reflect the payment without another API call
      setCreditBills(prevBills => 
        prevBills.map(bill => 
          bill.id === selectedBill.id
            ? {
                ...bill,
                paidAmount: (bill.paidAmount || 0) + paymentAmount
              }
            : bill
        )
      );
      
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const filteredBills = creditBills.filter(bill => 
    bill.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.phoneNumber?.includes(searchTerm) ||
    bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="credit-bill-container">
      <h2>{t('pages.creditBill.title')}</h2>
      <input
        type="text"
        placeholder={t('pages.creditBill.searchPlaceholder')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />

      <table className="credit-bill-table">
        <thead>
          <tr>
            <th>{t('pages.creditBill.billNumber')}</th>
            <th>{t('pages.creditBill.customerName')}</th>
            <th>{t('pages.creditBill.phoneNumber')}</th>
            <th>{t('pages.creditBill.totalAmount')}</th>
            <th>{t('pages.creditBill.paidAmount')}</th>
            <th>{t('pages.creditBill.pendingAmount')}</th>
            <th>{t('pages.creditBill.billDate')}</th>
            <th>{t('pages.creditBill.dueDate')}</th>
            <th>{t('pages.creditBill.status')}</th>
            <th>{t('pages.creditBill.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredBills.map((bill) => {
            return (
              <tr key={bill.id}>
                <td>{bill.billNumber}</td>
                <td>{bill.customerName || 'N/A'}</td>
                <td>{bill.phoneNumber || 'N/A'}</td>
                <td>₹{bill.totalAmount?.toFixed(2) || '0.00'}</td>
                <td>₹{(bill.paidAmount || 0).toFixed(2)}</td>
                <td>₹{((bill.totalAmount || 0) - (bill.paidAmount || 0)).toFixed(2)}</td>
                <td>{bill.billDate ? format(new Date(bill.billDate), 'dd/MM/yyyy') : 'N/A'}</td>
                <td>{bill.dueDate ? format(new Date(bill.dueDate), 'dd/MM/yyyy') : 'N/A'}</td>
                <td>
                  <span className={`status-badge ${((bill.totalAmount || 0) - (bill.paidAmount || 0)) <= 0 ? 'paid' : 'pending'}`}>
                    {((bill.totalAmount || 0) - (bill.paidAmount || 0)) <= 0 ? t('status.paid') : t('status.pending')}
                  </span>
                </td>
                <td>
                  {((bill.totalAmount || 0) - (bill.paidAmount || 0)) > 0 && (
                    <button 
                      onClick={() => handlePaymentClick(bill)}
                      className="pay-button"
                    >
                      {t('pages.creditBill.recordPayment')}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showPaymentModal && selectedBill && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{t('pages.creditBill.recordPayment')}</h3>
            <form onSubmit={handlePaymentSubmit}>
              <div className="form-group">
                <label>{t('pages.creditBill.amount')}</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                  required
                  step="0.01"
                  min="0.01"
                  max={paymentData.amount}
                />
              </div>
              <div className="form-group">
                <label>{t('pages.creditBill.paymentDate')}</label>
                <input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({...paymentData, paymentDate: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('pages.creditBill.paymentMethod')}</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                  required
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowPaymentModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="primary">
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditBill;
