import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { toDisplayText } from '../utils/display';
import { NotificationContext } from './NotificationContextValue';

const TYPE_META = {
  success: {
    icon: <CheckCircle2 size={18} />,
    title: 'İşlem tamamlandı',
  },
  error: {
    icon: <XCircle size={18} />,
    title: 'İşlem başarısız',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    title: 'Dikkat gerekiyor',
  },
  info: {
    icon: <Info size={18} />,
    title: 'Bilgilendirme',
  },
};

const normalizeNotification = (notification) => {
  const raw =
    typeof notification === 'string'
      ? { message: notification }
      : notification || {};
  const type = TYPE_META[raw.type] ? raw.type : 'info';
  return {
    id: raw.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    title: toDisplayText(raw.title, TYPE_META[type].title),
    message: toDisplayText(raw.message, ''),
    duration: Number(raw.duration ?? 4600),
  };
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [confirmation, setConfirmation] = useState(null);

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (notification) => {
      const next = normalizeNotification(notification);
      setNotifications((current) => [next, ...current].slice(0, 5));

      if (next.duration > 0) {
        window.setTimeout(() => dismiss(next.id), next.duration);
      }

      return next.id;
    },
    [dismiss],
  );

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setConfirmation({
        type: TYPE_META[options.type] ? options.type : 'warning',
        title: toDisplayText(options.title, 'İşlemi onayla'),
        message: toDisplayText(options.message, ''),
        confirmText: toDisplayText(options.confirmText, 'Onayla'),
        cancelText: toDisplayText(options.cancelText, 'Vazgeç'),
        resolve,
      });
    });
  }, []);

  const closeConfirmation = useCallback(
    (result) => {
      setConfirmation((current) => {
        current?.resolve(result);
        return null;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ notify, confirm, dismiss }),
    [confirm, dismiss, notify],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="app-toast-viewport" aria-live="polite" aria-atomic="true">
        {notifications.map((notification) => {
          const meta = TYPE_META[notification.type] || TYPE_META.info;
          return (
            <div
              key={notification.id}
              className={`app-toast app-toast-${notification.type}`}
              role="status"
            >
              <div className="app-toast-icon">{meta.icon}</div>
              <div className="app-toast-body">
                <div className="app-toast-title">{notification.title}</div>
                {notification.message && (
                  <div className="app-toast-message">{notification.message}</div>
                )}
              </div>
              <button
                type="button"
                className="app-toast-close"
                onClick={() => dismiss(notification.id)}
                aria-label="Bildirimi kapat"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {confirmation && (
        <div className="app-confirm-overlay" role="presentation">
          <div
            className={`app-confirm-card app-confirm-${confirmation.type}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-confirm-title"
          >
            <div className="app-confirm-icon">
              {TYPE_META[confirmation.type]?.icon || TYPE_META.warning.icon}
            </div>
            <div className="app-confirm-content">
              <h3 id="app-confirm-title">{confirmation.title}</h3>
              {confirmation.message && <p>{confirmation.message}</p>}
            </div>
            <div className="app-confirm-actions">
              <button
                type="button"
                className="app-confirm-cancel"
                onClick={() => closeConfirmation(false)}
              >
                {confirmation.cancelText}
              </button>
              <button
                type="button"
                className="app-confirm-submit"
                onClick={() => closeConfirmation(true)}
              >
                {confirmation.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
