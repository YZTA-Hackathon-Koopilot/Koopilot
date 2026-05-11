import React from 'react';
import { 
  MessageSquare, 
  ShoppingCart, 
  Package, 
  Truck, 
  BarChart3, 
  RadioTower,
  Settings,
  Calendar,
  Leaf
} from 'lucide-react';
const Sidebar = ({ activeTab, setActiveTab, currentUser, onLogout }) => {
  const menuItems = [
    { id: 'messages', label: 'Mesajlar', icon: <MessageSquare size={20} /> },
    { id: 'orders', label: 'Siparişler', icon: <ShoppingCart size={20} /> },
    { id: 'inventory', label: 'Stok Yönetimi', icon: <Package size={20} /> },
    { id: 'shipping', label: 'Kargo Takip', icon: <Truck size={20} /> },
    { id: 'channels', label: 'Kanallar', icon: <RadioTower size={20} /> },
    { id: 'summary', label: 'Günlük Özet', icon: <BarChart3 size={20} /> },
    { id: 'calendar', label: 'Takvim', icon: <Calendar size={20} /> },
    { id: 'settings', label: 'Hesabım', icon: <Settings size={20} /> },
  ];
  return (
    <div style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--sidebar-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--glass-border)',
      color: 'var(--sidebar-text)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      height: '100%',
      position: 'relative',
      zIndex: 10
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
        <h1 style={{ color: 'var(--sidebar-text)', fontSize: '24px', margin: 0 }}>Koopilot</h1>
      </div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
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
              color: 'var(--sidebar-text)',
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
        marginTop: '16px',
        padding: '16px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        fontSize: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div>
          <p style={{ opacity: 0.7, marginBottom: '4px' }}>Hoş Geldiniz,</p>
          <p style={{ fontWeight: '700', color: 'var(--primary-light)' }}>{currentUser?.name || 'Kooperatif Paneli'}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(230, 57, 70, 0.1)',
            color: 'var(--error)',
            border: '1px solid rgba(230, 57, 70, 0.2)',
            borderRadius: '10px',
            fontWeight: '700',
            textAlign: 'center'
          }}
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};
export default Sidebar;
