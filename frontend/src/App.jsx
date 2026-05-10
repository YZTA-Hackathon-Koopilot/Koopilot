import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MessagePanel from './components/MessagePanel';
import OrderPanel from './components/OrderPanel';
import InventoryPanel from './components/InventoryPanel';
import ShippingPanel from './components/ShippingPanel';
import DailySummary from './components/DailySummary';

const initialChatMessages = [
  { id: 1, type: 'ai', text: 'Merhaba! Ben Koopilot. Sipariş, stok veya kargo ile ilgili size nasıl yardımcı olabilirim? 🌿' }
];

const createSessionId = () => `session_${Math.random().toString(36).substr(2, 9)}`;

const readStoredJson = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('messages');
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('koopilot_theme') || 'light');
  const [chatMessages, setChatMessages] = useState(() => {
    return readStoredJson('koopilot_current_chat', initialChatMessages);
  });
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(() => localStorage.getItem('koopilot_current_session') || createSessionId());
  const [chatHistory, setChatHistory] = useState(() => {
    return readStoredJson('koopilot_chat_history', []);
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('koopilot_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('koopilot_current_chat', JSON.stringify(chatMessages));
    localStorage.setItem('koopilot_current_session', chatSessionId);
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
      localStorage.setItem('koopilot_chat_history', JSON.stringify(next));
      return next;
    });
  }, [chatMessages, chatSessionId]);

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
    setChatHistory((prev) => {
      const next = prev.filter((item) => item.id !== historyId);
      localStorage.setItem('koopilot_chat_history', JSON.stringify(next));
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
      summary: 'Günlük Operasyon Özeti'
    };
    return titles[activeTab] || 'Dashboard';
  };
  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-container">
        <Header 
          title={getTitle()} 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          theme={theme}
          setTheme={setTheme}
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
