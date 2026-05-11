import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MessagePanel from './components/MessagePanel';
import OrderPanel from './components/OrderPanel';
import InventoryPanel from './components/InventoryPanel';
import ShippingPanel from './components/ShippingPanel';
import DailySummary from './components/DailySummary';
import ChannelsPanel from './components/ChannelsPanel';
import CalendarPanel from './components/CalendarPanel';
import Login from './components/Login';
import SettingsPanel from './components/SettingsPanel';
import { getCurrentUser, logoutUser, setAuthToken } from './services/api';

const initialChatMessages = [
  { id: 1, type: 'ai', text: 'Merhaba! Ben Koopilot. Sipariş, stok veya kargo ile ilgili size nasıl yardımcı olabilirim? 🌿' }
];

const createSessionId = () => `session_${Math.random().toString(36).substr(2, 9)}`;

const getUserStorageKey = (user) => {
  const rawKey = user?.email || user?.id || 'guest';
  return rawKey.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
};

const getChatStorageKeys = (user) => {
  const userKey = getUserStorageKey(user);
  return {
    currentChat: `koopilot_${userKey}_current_chat`,
    currentSession: `koopilot_${userKey}_current_session`,
    history: `koopilot_${userKey}_chat_history`
  };
};

const readStoredJson = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const savedAuthToken = localStorage.getItem('koopilot_auth_token');
  const [activeTab, setActiveTab] = useState('messages');
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('koopilot_theme') || 'light');
  const [authChecking, setAuthChecking] = useState(Boolean(savedAuthToken));
  const [currentUser, setCurrentUser] = useState(() => {
    return savedAuthToken ? readStoredJson('koopilot_current_user', null) : null;
  });
  const [chatMessages, setChatMessages] = useState(() => {
    return readStoredJson(getChatStorageKeys(currentUser).currentChat, initialChatMessages);
  });
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(() => localStorage.getItem(getChatStorageKeys(currentUser).currentSession) || createSessionId());
  const [chatHistory, setChatHistory] = useState(() => {
    return readStoredJson(getChatStorageKeys(currentUser).history, []);
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('koopilot_current_user', JSON.stringify(currentUser));
      return;
    }
    localStorage.removeItem('koopilot_current_user');
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('koopilot_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!currentUser) return;

    const storageKeys = getChatStorageKeys(currentUser);
    localStorage.setItem(storageKeys.currentChat, JSON.stringify(chatMessages));
    localStorage.setItem(storageKeys.currentSession, chatSessionId);
    if (chatMessages.length <= 1) return;

    const firstUserMessage = chatMessages.find((message) => message.type === 'user')?.text || 'Yeni sohbet';
    const historyItem = {
      id: chatSessionId,
      title: firstUserMessage.slice(0, 48),
      updatedAt: new Date().toISOString(),
      messages: chatMessages
    };

    setChatHistory((prev) => {
      const next = [historyItem, ...prev.filter((item) => item.id !== chatSessionId)].slice(0, 12);
      localStorage.setItem(storageKeys.history, JSON.stringify(next));
      return next;
    });
  }, [chatMessages, chatSessionId, currentUser]);

  const loadChatStateForUser = (user) => {
    const storageKeys = getChatStorageKeys(user);
    setChatMessages(readStoredJson(storageKeys.currentChat, initialChatMessages));
    setChatSessionId(localStorage.getItem(storageKeys.currentSession) || createSessionId());
    setChatHistory(readStoredJson(storageKeys.history, []));
    setChatLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('koopilot_auth_token');
    if (!token) {
      setAuthChecking(false);
      return;
    }

    setAuthToken(token);
    getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
        loadChatStateForUser(user);
      })
      .catch(() => {
        localStorage.removeItem('koopilot_auth_token');
        localStorage.removeItem('koopilot_current_user');
        setAuthToken(null);
        setCurrentUser(null);
      })
      .finally(() => setAuthChecking(false));
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    loadChatStateForUser(user);
    setActiveTab('messages');
  };

  const handleLogout = () => {
    void logoutUser().catch(() => {});
    localStorage.removeItem('koopilot_auth_token');
    localStorage.removeItem('koopilot_current_user');
    setAuthToken(null);
    setCurrentUser(null);
    setChatMessages(initialChatMessages);
    setChatSessionId(createSessionId());
    setChatHistory([]);
    setChatLoading(false);
    setActiveTab('messages');
  };

  const handleNewChat = () => {
    setChatSessionId(createSessionId());
    setChatMessages(initialChatMessages);
  };

  const handleLoadChat = (historyItem) => {
    setChatSessionId(historyItem.id);
    setChatMessages(historyItem.messages);
    setActiveTab('messages');
  };

  const handleDeleteChat = (historyId) => {
    const storageKeys = getChatStorageKeys(currentUser);
    setChatHistory((prev) => {
      const next = prev.filter((item) => item.id !== historyId);
      localStorage.setItem(storageKeys.history, JSON.stringify(next));
      return next;
    });
    if (historyId === chatSessionId) {
      handleNewChat();
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'messages':
        return (
          <MessagePanel
            messages={chatMessages}
            setMessages={setChatMessages}
            isLoading={chatLoading}
            setIsLoading={setChatLoading}
            sessionId={chatSessionId}
            chatHistory={chatHistory}
            onNewChat={handleNewChat}
            onLoadChat={handleLoadChat}
            onDeleteChat={handleDeleteChat}
          />
        );
      case 'orders':
        return <OrderPanel />;
      case 'inventory':
        return <InventoryPanel searchTerm={searchTerm} />;
      case 'summary':
        return <DailySummary />;
      case 'shipping':
        return <ShippingPanel />;
      case 'channels':
        return <ChannelsPanel />;
      case 'calendar':
        return <CalendarPanel />;
      case 'settings':
        return <SettingsPanel currentUser={currentUser} onUserUpdate={setCurrentUser} onLogout={handleLogout} />;
      default:
        return (
          <MessagePanel
            messages={chatMessages}
            setMessages={setChatMessages}
            isLoading={chatLoading}
            setIsLoading={setChatLoading}
            sessionId={chatSessionId}
            chatHistory={chatHistory}
            onNewChat={handleNewChat}
            onLoadChat={handleLoadChat}
            onDeleteChat={handleDeleteChat}
          />
        );
    }
  };
  const getTitle = () => {
    const titles = {
      messages: 'Mesaj Analizi & AI Ajan',
      orders: 'Sipariş Yönetimi',
      inventory: 'Stok ve Envanter',
      shipping: 'Kargo Takibi',
      channels: 'Kanal Bağlantıları',
      summary: 'Günlük Operasyon Özeti',
      calendar: 'Takvim & Görev Takibi',
      settings: 'Hesabım & Güvenlik'
    };
    return titles[activeTab] || 'Dashboard';
  };

  if (authChecking) {
    return <div className="auth-loading">Koopilot oturumu kontrol ediliyor...</div>;
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} theme={theme} setTheme={setTheme} />;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <div className="main-container">
        <Header 
          title={getTitle()} 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          theme={theme}
          setTheme={setTheme}
          currentUser={currentUser}
          onOpenProfile={() => setActiveTab('settings')}
          onOpenInventory={() => setActiveTab('inventory')}
        />
        <main className="content-area">
          <div key={activeTab} className="page-transition">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
export default App;
