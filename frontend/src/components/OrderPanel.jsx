import React, { useState, useEffect } from 'react';
import { getOrders, approveOrder, rejectOrder, deleteOrder } from '../services/api';
import { Check, X, User, Phone, MapPin, Calendar, ShoppingBag, Trash2 } from 'lucide-react';
const OrderPanel = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data.reverse());
    } catch (error) {
      console.error('Siparişler çekilemedi:', error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchOrders();
  }, []);
  const handleApprove = async (id) => {
    try {
      await approveOrder(id);
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.detail || 'Onaylanırken bir hata oluştu.');
    }
  };
  const handleReject = async (id) => {
    if (!window.confirm('Bu siparişi reddetmek istediğinize emin misiniz?')) return;
    try {
      await rejectOrder(id);
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.detail || 'Reddedilirken bir hata oluştu.');
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Bu siparişi kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      await deleteOrder(id);
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.detail || 'Silinirken bir hata oluştu.');
    }
  };
  if (isLoading) return <div style={{ padding: '24px' }}>Yükleniyor...</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {orders.map((order) => (
          <div key={order.id} className="glass-card" style={{
            backgroundColor: 'var(--white)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '10px',
                  backgroundColor: 'rgba(45, 106, 79, 0.1)',
                  borderRadius: '12px',
                  color: 'var(--primary-mid)'
                }}>
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '18px' }}>Sipariş #{order.id}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {new Date(order.order_date).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>
               <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  backgroundColor: order.status === 'Onaylandı' ? 'rgba(42, 157, 143, 0.1)' : 
                                   order.status === 'Reddedildi' ? 'rgba(230, 57, 70, 0.1)' : 'rgba(244, 162, 97, 0.1)',
                  color: order.status === 'Onaylandı' ? 'var(--success)' : 
                         order.status === 'Reddedildi' ? 'var(--error)' : 'var(--warning)'
                }}>
                  {order.status === 'Onaylandı' ? 'ONAYLANDI' : 
                   order.status === 'Reddedildi' ? 'REDDEDİLDİ' : 'TASLAK'}
                </div>
                <button 
                  onClick={() => handleDelete(order.id)}
                  style={{ 
                    padding: '6px', 
                    background: 'none', 
                    border: 'none', 
                    color: '#9CA3AF', 
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; e.currentTarget.style.color = 'var(--error)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}
                  title="Siparişi Sil"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px',
              padding: '16px',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: '16px',
              fontSize: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} color="var(--text-light)" />
                <span style={{ fontWeight: '500' }}>{order.customer_name || 'Bilinmiyor'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} color="var(--text-light)" />
                <span>{order.phone || 'Girilmedi'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 2' }}>
                <MapPin size={16} color="var(--text-light)" />
                <span>{order.city || 'Şehir Yok'}, {order.address || 'Adres Yok'}</span>
              </div>
            </div>
            {order.missing_info && (
              <div style={{
                fontSize: '13px',
                color: 'var(--error)',
                backgroundColor: 'rgba(230, 57, 70, 0.05)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px dashed var(--error)'
              }}>
                ⚠️ Eksik Bilgiler: {order.missing_info}
              </div>
            )}
            <div style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase' }}>
                Ürün Kalemleri
              </div>
              {order.items.length > 0 ? (
                order.items.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px',
                    padding: '8px 10px',
                    backgroundColor: 'var(--surface-muted)',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontWeight: '600' }}>{item.product_name || `Ürün #${item.product_id}`}</span>
                    <span style={{ color: 'var(--text-light)' }}>{item.quantity} {item.unit || 'adet'}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                  Henüz ürün kalemi oluşturulmadı.
                </div>
              )}
            </div>
            {order.status === 'Taslak' && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  onClick={() => handleApprove(order.id)}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--primary-mid)',
                    color: 'var(--on-primary)',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: '600'
                  }}
                >
                  <Check size={18} />
                  Siparişi Onayla
                </button>
                <button 
                  onClick={() => handleReject(order.id)}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--error)',
                    border: '1px solid var(--error)',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.05)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default OrderPanel;
