import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle, ShoppingBag, History, Plus, Trash2, X } from 'lucide-react';
import { analyzeMessage } from '../services/api';
const MessagePanel = ({ messages, setMessages, isLoading, setIsLoading, sessionId, chatHistory, onNewChat, onLoadChat, onDeleteChat }) => {
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const data = await analyzeMessage(input, sessionId);
      const aiMsg = { 
        id: Date.now() + 1, 
        type: 'ai', 
        text: data.ai_analysis.ai_reply_draft,
        orderData: data.created_order,
        warnings: data.warnings
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        type: 'ai', 
        text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', 
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--surface)',
      borderRadius: '24px',
      boxShadow: 'var(--shadow-soft)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Koopilot Ajan</h3>
          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            Oturum: {sessionId.replace('session_', '').slice(0, 8)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            style={{
              height: '38px',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--text-dark)',
              border: '1px solid var(--border-color)',
              fontWeight: '600'
            }}
          >
            <History size={16} />
            Geçmiş
          </button>
          <button
            type="button"
            onClick={onNewChat}
            style={{
              height: '38px',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--primary-mid)',
              color: 'var(--on-primary)',
              fontWeight: '600'
            }}
          >
            <Plus size={16} />
            Yeni Sohbet
          </button>
        </div>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexDirection: msg.type === 'user' ? 'row-reverse' : 'row'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: msg.type === 'user' ? 'var(--accent-earth)' : 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: msg.type === 'user' ? 'var(--on-primary)' : 'var(--primary-dark)'
              }}>
                {msg.type === 'user' ? <User size={16} /> : <Bot size={18} />}
              </div>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-light)' }}>
                {msg.type === 'user' ? 'Müşteri' : 'Koopilot'}
              </span>
            </div>
            <div style={{
              maxWidth: '80%',
              padding: '16px',
              borderRadius: msg.type === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              backgroundColor: msg.type === 'user' ? 'var(--primary-mid)' : 'var(--message-ai-bg)',
              color: msg.type === 'user' ? 'var(--on-primary)' : 'var(--text-dark)',
              fontSize: '15px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.text}
              {}
              {msg.warnings && msg.warnings.length > 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  backgroundColor: 'rgba(230, 57, 70, 0.1)',
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '8px',
                  color: 'var(--error)',
                  fontSize: '13px'
                }}>
                  <AlertCircle size={16} />
                  <div>{msg.warnings.join(', ')}</div>
                </div>
              )}
              {}
              {msg.orderData && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: 'var(--surface-elevated)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShoppingBag size={18} color="var(--success)" />
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>Sipariş Taslağı Oluşturuldu</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>ID: #{msg.orderData.order_id}</div>
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    backgroundColor: 'rgba(42, 157, 143, 0.1)',
                    color: 'var(--success)',
                    fontSize: '12px',
                    fontWeight: '600',
                    borderRadius: '6px'
                  }}>
                    TASLAK
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-light)' }}>
            <Bot size={18} />
            <span style={{ fontSize: '14px', fontStyle: 'italic' }}>Koopilot düşünüyor...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {}
      <form onSubmit={handleSend} style={{
        padding: '24px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        gap: '12px'
      }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Müşteri mesajını buraya yazın..."
          style={{
            flex: 1,
            height: '48px',
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-dark)'
          }}
          disabled={isLoading}
        />
        <button 
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            backgroundColor: 'var(--primary-mid)',
            color: 'var(--on-primary)',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoading || !input.trim() ? 0.6 : 1
          }}
        >
          <Send size={20} />
        </button>
      </form>
      {showHistory && (
        <div
          className="history-overlay"
          onClick={() => setShowHistory(false)}
        >
          <aside
            className="history-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{
              padding: '20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Sohbet Geçmişi</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{chatHistory.length} kayıt</div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--surface-muted)',
                  color: 'var(--text-dark)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chatHistory.length === 0 ? (
                <div style={{
                  padding: '28px',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-light)',
                  textAlign: 'center',
                  fontSize: '14px'
                }}>
                  Kayıtlı sohbet yok.
                </div>
              ) : (
                chatHistory.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px',
                      border: item.id === sessionId ? '1px solid var(--primary-light)' : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      backgroundColor: item.id === sessionId ? 'rgba(82, 183, 136, 0.12)' : 'var(--surface-muted)',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onLoadChat(item);
                        setShowHistory(false);
                      }}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        color: 'var(--text-dark)',
                        textAlign: 'left',
                        padding: 0,
                        border: 'none'
                      }}
                    >
                      <div style={{ fontWeight: '700', marginBottom: '4px' }}>{item.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                        {new Date(item.updatedAt).toLocaleString('tr-TR')} · {item.messages.length} mesaj
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteChat(item.id)}
                      title="Sohbeti sil"
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent',
                        color: 'var(--text-light)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
export default MessagePanel;
