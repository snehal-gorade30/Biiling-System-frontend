import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import InvoiceForm from './components/InvoiceForm';
import CreditBill from './components/CreditBill';
import AddItems from './components/AddItems';
import ViewItems from './components/ViewItems';
import ManageInvoices from './components/ManageInvoices';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('newbill');

  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Header />
          <div className="app-body">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<InvoiceForm />} />
                <Route path="/newbill" element={<InvoiceForm />} />
                <Route path="/creditbill" element={<CreditBill />} />
                <Route path="/manageinvoices" element={<ManageInvoices />} />
                <Route path="/additems" element={<AddItems />} />
                <Route path="/viewitems" element={<ViewItems />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
