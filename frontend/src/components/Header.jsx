import { useState, useEffect, useRef } from 'react';
import { Bell, User, Search, AlertTriangle, Moon, Sun } from 'lucide-react';
import { getInventoryAlerts } from '../services/api';
const Header = ({ title, searchTerm, setSearchTerm, theme, setTheme, currentUser, onOpenProfile, onOpenInventory }) => {
  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getInventoryAlerts();
        setAlerts(data);
      } catch (error) {
        console.error('Bildirimler alınamadı:', error);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="header">
      <div className="header-title-container">
        <h2 className="header-title">{title}</h2>
      </div>
      <div className="header-search">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
      <div className="header-actions" ref={notificationRef}>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
          className="theme-toggle"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className={`notification-trigger ${alerts.length > 0 ? 'has-alerts' : ''}`}
        >
          <Bell size={20} />
          {alerts.length > 0 && <span className="notification-dot"></span>}
        </button>

        {showNotifications && (
          <div className="notifications-dropdown">
            <div className="dropdown-header">
              <h4>Bildirimler</h4>
              <span className="alert-count">{alerts.length} Uyarı</span>
            </div>
            <div className="notifications-list">
              {alerts.length === 0 ? (
                <div className="no-notifications">
                  Bildirim bulunmuyor.
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className="notification-item">
                    <div className="notification-icon">
                      <AlertTriangle size={16} />
                    </div>
                    <div className="notification-content">
                      <div className="notification-text">Düşük Stok: {alert.name}</div>
                      <div className="notification-subtext">
                        Kalan stok: {alert.stock} {alert.unit}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {alerts.length > 0 && (
              <div className="dropdown-footer">
                <span onClick={onOpenInventory}>Tümünü Gör</span>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setShowNotifications(false);
            onOpenProfile?.();
          }}
          className="user-profile-trigger"
          title="Hesabım sayfasını aç"
        >
          <span className="user-profile-name">
            {currentUser?.name || currentUser?.role || 'Hesabım'}
          </span>
          <div className="user-profile-avatar">
            <User size={18} />
          </div>
        </button>
      </div>
    </header>
  );
};
export default Header;
