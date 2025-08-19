import React, { useState } from 'react';
import { FileText, CreditCard, Package, Plus, Eye, ChevronDown, ChevronRight, ShoppingCart, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();
  const [expandedSections, setExpandedSections] = useState({});
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'sale',
      label: t('sidebar.sale'),
      icon: <ShoppingCart size={18} />,
      type: 'expandable',
      children: [
        {
          id: 'newbill',
          label: t('sidebar.newInvoice'),
          icon: <FileText size={16} />,
          type: 'submenu',
          path: '/newbill'
        },
        {
          id: 'creditbill',
          label: t('sidebar.creditBill'),
          icon: <CreditCard size={16} />,
          type: 'submenu',
          path: '/creditbill'
        },
        {
          id: 'manageinvoices',
          label: t('sidebar.manageInvoices'),
          icon: <Search size={16} />,
          type: 'submenu',
          path: '/manageinvoices'
        }
      ]
    },
    {
      id: 'master',
      label: t('sidebar.master'),
      icon: <Package size={18} />,
      type: 'expandable',
      children: [
        {
          id: 'inventory',
          label: t('sidebar.inventory'),
          icon: <Package size={16} />,
          type: 'expandable',
          children: [
            {
              id: 'additems',
              label: t('sidebar.addItems'),
              icon: <Plus size={16} />,
              type: 'submenu',
              path: '/additems'
            },
            {
              id: 'viewitems',
              label: t('sidebar.viewItems'),
              icon: <Eye size={16} />,
              type: 'submenu',
              path: '/viewitems'
            }
          ]
        }
      ]
    }
  ];

  const handleItemClick = (item) => {
    if (item.type === 'expandable') {
      // Toggle expandable sections
      setExpandedSections(prev => ({
        ...prev,
        [item.id]: !prev[item.id]
      }));
    } else if (item.path) {
      // Navigate to the path and update active tab
      setActiveTab(item.id);
      navigate(item.path);
    }
  };

  const renderMenuItem = (item, level = 0) => {
    const isExpanded = expandedSections[item.id];
    const isActive = activeTab === item.id;
    
    return (
      <div key={item.id}>
        <div
          className={`nav-item ${item.type} ${isActive ? 'active' : ''}`}
          onClick={() => handleItemClick(item)}
          style={{
            cursor: 'pointer',
            fontWeight: level === 0 ? '600' : '500',
            color: level === 0 ? '#343a40' : '#495057',
            paddingLeft: `${20 + (level * 20)}px`,
            backgroundColor: isActive ? '#e9ecef' : 'transparent'
          }}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.type === 'expandable' && (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          )}
        </div>
        {isExpanded && item.children && (
          <div style={{ marginLeft: '10px' }}>
            {item.children.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sidebar">
      {menuItems.map(item => renderMenuItem(item))}
    </div>
  );
};

export default Sidebar;
