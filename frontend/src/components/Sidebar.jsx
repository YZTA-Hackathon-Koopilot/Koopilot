import React from 'react';
import { 
  MessageSquare, 
  ShoppingCart, 
  Package, 
  Truck, 
  BarChart3, 
  Settings,
  Leaf
} from 'lucide-react';
const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'messages', label: 'Mesajlar', icon: <MessageSquare size={20} /> },
    { id: 'orders', label: 'Siparişler', icon: <ShoppingCart size={20} /> },
    { id: 'inventory', label: 'Stok Yönetimi', icon: <Package size={20} /> },
    { id: 'shipping', label: 'Kargo Takip', icon: <Truck size={20} /> },
    { id: 'summary', label: 'Günlük Özet', icon: <BarChart3 size={20} /> },
  ];
  return (
    <div style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--sidebar-bg)',
      color: 'var(--on-primary)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      height: '100%'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '48px',
        padding: '0 8px'
      }}>
        <div style={{
          backgroundColor: 'var(--primary-light)',
          padding: '8px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Leaf size={24} color="var(--primary-dark)" fill="var(--primary-dark)" />
        </div>
        <h1 style={{ color: 'var(--on-primary)', fontSize: '24px', margin: 0 }}>Koopilot</h1>
      </div>
      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: activeTab === item.id ? 'var(--primary-mid)' : 'transparent',
              color: 'var(--on-primary)',
              marginBottom: '8px',
              textAlign: 'left',
              borderRadius: '12px',
              border: 'none',
              fontSize: '16px',
              fontWeight: activeTab === item.id ? '600' : '400',
              transition: 'background-color 0.2s'
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{
        marginTop: 'auto',
        padding: '16px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        fontSize: '14px'
      }}>
        <p style={{ opacity: 0.7, marginBottom: '4px' }}>Hoş Geldiniz,</p>
        <p style={{ fontWeight: '600' }}>Kooperatif Paneli</p>
      </div>
    </div>
  );
};
export default Sidebar;
