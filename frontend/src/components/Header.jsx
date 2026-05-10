import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, Search, AlertTriangle, Moon, Sun } from 'lucide-react';
import { getInventoryAlerts } from '../services/api';
const Header = ({ title, searchTerm, setSearchTerm, theme, setTheme }) => {
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
    <header style={{
      height: 'var(--header-height)',
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{
        minWidth: '220px',
        maxWidth: '260px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        zIndex: 2
      }}>
        <h2 style={{
          fontSize: '20px',
          margin: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis'
        }}>{title}</h2>
      </div>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'clamp(260px, 42vw, 420px)',
        zIndex: 1
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%'
        }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-light)' }} />
          <input 
            type="text" 
            placeholder="Ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: '38px',
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--text-dark)',
              border: '1px solid var(--border-color)',
              width: '100%',
              height: '40px'
            }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 2 }} ref={notificationRef}>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
          style={{
            backgroundColor: 'var(--surface-muted)',
            padding: '8px',
            color: 'var(--text-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          style={{
            backgroundColor: 'var(--surface-muted)',
            padding: '8px',
            color: 'var(--text-dark)',
            position: 'relative',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-soft)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-muted)'}
        >
          <Bell size={20} />
          {alerts.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--error)',
              borderRadius: '50%',
              border: '2px solid var(--white)'
            }}></span>
          )}
        </button>

        {showNotifications && (
          <div style={{
            position: 'absolute',
            top: '50px',
            right: '0',
            width: '320px',
            backgroundColor: 'var(--surface-elevated)',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            border: '1px solid var(--border-color)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '16px' }}>Bildirimler</h4>
              <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{alerts.length} Uyarı</span>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {alerts.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)' }}>
                  Bildirim bulunmuyor.
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'start',
                    backgroundColor: 'var(--surface-elevated)',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-muted)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-elevated)'}
                  >
                    <div style={{ padding: '8px', backgroundColor: 'rgba(230, 57, 70, 0.1)', borderRadius: '8px', color: 'var(--error)' }}>
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>Düşük Stok: {alert.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                        Kalan stok: {alert.stock} {alert.unit}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {alerts.length > 0 && (
              <div style={{ padding: '12px', textAlign: 'center', backgroundColor: 'var(--surface-muted)' }}>
                <span style={{ fontSize: '12px', color: 'var(--primary-mid)', fontWeight: '600', cursor: 'pointer' }}>Tümünü Gör</span>
              </div>
            )}
          </div>
        )}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '4px 4px 4px 12px',
          backgroundColor: 'var(--surface-muted)',
          borderRadius: '30px',
          border: '1px solid var(--border-color)'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Yönetici</span>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-dark)'
          }}>
            <User size={18} />
          </div>
        </div>
      </div>
    </header>
  );
};
export default Header;
