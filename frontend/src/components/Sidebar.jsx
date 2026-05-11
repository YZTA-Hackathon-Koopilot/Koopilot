import React from 'react';
import { 
  MessageSquare, 
  ShoppingCart, 
  Package, 
  Truck, 
  BarChart3, 
  RadioTower,
  LogOut,
  User,
  Calendar,
  Leaf,
  Wheat,
  Trees,
  Sprout
} from 'lucide-react';
const Sidebar = ({ activeTab, setActiveTab, currentUser, onLogout }) => {
  const menuItems = [
    { id: 'messages', label: 'Mesajlar', icon: <Sprout size={20} /> },
    { id: 'orders', label: 'Siparişler', icon: <Wheat size={20} /> },
    { id: 'inventory', label: 'Stok Yönetimi', icon: <Trees size={20} /> },
    { id: 'shipping', label: 'Kargo Takip', icon: <Truck size={20} /> },
    { id: 'channels', label: 'Kanallar', icon: <RadioTower size={20} /> },
    { id: 'summary', label: 'Günlük Özet', icon: <BarChart3 size={20} /> },
    { id: 'calendar', label: 'Takvim', icon: <Calendar size={20} /> },
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
            className="sidebar-nav-item"
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
        padding: '10px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          title="Profil sayfasını aç"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px',
            backgroundColor: 'transparent',
            color: 'var(--sidebar-text)',
            borderRadius: '10px',
            textAlign: 'left'
          }}
        >
          <span style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(82, 183, 136, 0.2)',
            color: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <User size={17} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '11px', opacity: 0.65, lineHeight: 1.2 }}>Hoş geldiniz</span>
            <span style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 800,
              color: 'var(--primary-light)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {currentUser?.name || 'Kooperatif Paneli'}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          title="Çıkış yap"
          aria-label="Çıkış yap"
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: 'rgba(230, 57, 70, 0.1)',
            color: 'var(--error)',
            border: '1px solid rgba(230, 57, 70, 0.2)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};
export default Sidebar;
