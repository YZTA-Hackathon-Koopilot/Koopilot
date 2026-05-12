import {
  Truck, 
  BarChart3, 
  Settings,
  LogOut,
  User,
  Calendar,
  Wheat,
  Trees,
  Bot,
} from 'lucide-react';
import logoUrl from '../assets/logo.png';
const Sidebar = ({ activeTab, setActiveTab, currentUser, onLogout }) => {
  const menuItems = [
    { id: 'messages', label: 'Operasyon Asistanı', icon: <Bot size={20} /> },
    { id: 'orders', label: 'Siparişler', icon: <Wheat size={20} /> },
    { id: 'inventory', label: 'Stok Yönetimi', icon: <Trees size={20} /> },
    { id: 'shipping', label: 'Kargo Takip', icon: <Truck size={20} /> },
    { id: 'summary', label: 'Günlük Özet', icon: <BarChart3 size={20} /> },
    { id: 'calendar', label: 'Takvim', icon: <Calendar size={20} /> },
    { id: 'settings', label: 'Ayarlar', icon: <Settings size={20} /> },
  ];
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <img src={logoUrl} alt="Koopilot" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
        </div>
        <div className="brand-text">
          <h1 className="sidebar-brand-text">Koopilot</h1>
        </div>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
          >
            {item.icon}
            <span className="sidebar-item-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="sidebar-footer-user"
          title="Profil ve ayarları aç"
        >
          <span className="user-avatar">
            <User size={17} />
          </span>
          <span className="user-info">
            <span className="user-welcome">Hoş geldiniz</span>
            <span className="user-name">
              {currentUser?.name || 'Kooperatif Paneli'}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="logout-button"
          title="Çıkış yap"
          aria-label="Çıkış yap"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};
export default Sidebar;
