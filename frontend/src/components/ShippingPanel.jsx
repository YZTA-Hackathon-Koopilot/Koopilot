import React, { useState } from 'react';
import { getShippingStatus, getActiveShipments, updateShippingStatus } from '../services/api';
import { Truck, Search, Package, MapPin, Calendar, Clock, ChevronRight, ArrowLeft, Send, Map, CheckCircle } from 'lucide-react';
const ShippingPanel = () => {
  const [orderId, setOrderId] = useState('');
  const [shippingInfo, setShippingInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeShipments, setActiveShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  React.useEffect(() => {
    fetchActiveShipments();
  }, []);
  const fetchActiveShipments = async () => {
    setIsLoading(true);
    try {
      const data = await getActiveShipments();
      setActiveShipments(data);
    } catch (err) {
      console.error('Kargolar yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShippingStatus(orderId);
      setSelectedShipment(data);
    } catch (err) {
      setError('Sipariş bulunamadı veya bir hata oluştu.');
      setSelectedShipment(null);
    } finally {
      setIsLoading(false);
    }
  };
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const updated = await updateShippingStatus(id, newStatus);
      setSelectedShipment(updated);
      fetchActiveShipments(); 
    } catch (err) {
      alert('Durum güncellenirken bir hata oluştu.');
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      <div style={{
        backgroundColor: 'var(--white)',
        padding: '32px',
        borderRadius: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Truck color="var(--primary-mid)" /> Kargo Sorgula
        </h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-light)' }} />
            <input 
              type="text" 
              placeholder="Sipariş Numarası girin (Örn: 1, 2...)" 
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                paddingLeft: '48px',
                backgroundColor: 'var(--surface-muted)'
              }}
            />
          </div>
          <button 
            type="submit" 
            style={{
              padding: '0 24px',
              backgroundColor: 'var(--primary-mid)',
              color: 'var(--on-primary)',
              fontWeight: '600'
            }}
            disabled={isLoading}
          >
            Sorgula
          </button>
        </form>
      </div>
      {isLoading && <div style={{ textAlign: 'center', padding: '40px' }}>Kargo bilgileri getiriliyor...</div>}
      {error && (
        <div style={{
          backgroundColor: 'rgba(230, 57, 70, 0.1)',
          color: 'var(--error)',
          padding: '16px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
      {!selectedShipment ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h4 style={{ margin: 0, color: 'var(--text-light)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Aktif Sevkiyatlar ({activeShipments.length})
          </h4>
          <div style={{ display: 'grid', gap: '16px' }}>
            {activeShipments.length > 0 ? (
              activeShipments.map((shipment) => (
                <div 
                  key={shipment.order_id}
                  onClick={() => setSelectedShipment(shipment)}
                  style={{
                    backgroundColor: 'var(--white)',
                    padding: '20px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    border: '1px solid var(--border-color)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)'; }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ padding: '10px', backgroundColor: 'var(--surface-soft)', borderRadius: '12px', color: 'var(--primary-mid)' }}>
                      <Package size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700' }}>Sipariş #{shipment.order_id}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{shipment.shipping_status}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Tahmini Teslim</div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{shipment.estimated_delivery}</div>
                    </div>
                    <ChevronRight size={18} color="var(--border-color)" />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)', backgroundColor: 'var(--white)', borderRadius: '20px', border: '1px dashed var(--border-color)' }}>
                Şu an takipte olan aktif kargo bulunmuyor.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--white)',
          padding: '32px',
          borderRadius: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          border: '1px solid var(--border-color)'
        }}>
          <button 
            onClick={() => setSelectedShipment(null)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'none', 
              border: 'none', 
              color: 'var(--primary-mid)', 
              cursor: 'pointer',
              fontWeight: '600',
              padding: 0,
              width: 'fit-content'
            }}
          >
            <ArrowLeft size={16} /> Listeye Dön
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Sipariş No: #{selectedShipment.order_id}</div>
              <h2 style={{ fontSize: '24px', marginTop: '4px', color: 'var(--primary-dark)' }}>{selectedShipment.shipping_status}</h2>
            </div>
            <div style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(42, 157, 143, 0.1)',
              color: 'var(--success)',
              borderRadius: '30px',
              fontSize: '14px',
              fontWeight: '700'
            }}>
              {selectedShipment.carrier || 'Piyasa Kargo'}
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            padding: '24px',
            backgroundColor: 'var(--surface-muted)',
            borderRadius: '20px'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Calendar size={20} color="var(--primary-mid)" />
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Tahmini Teslimat</div>
                <div style={{ fontWeight: '600' }}>{selectedShipment.estimated_delivery || 'Bilinmiyor'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Clock size={20} color="var(--primary-mid)" />
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Son Güncelleme</div>
                <div style={{ fontWeight: '600' }}>{selectedShipment.updated_at}</div>
              </div>
            </div>
          </div>
          <div style={{ padding: '20px 0' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '10px', left: '0', right: '0', height: '2px', backgroundColor: '#E5E7EB', zIndex: 0 }}></div>
                <div style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  left: '0', 
                  width: selectedShipment.shipping_status === 'Teslim Edildi' ? '100%' : 
                         selectedShipment.shipping_status === 'Yolda' ? '66%' : 
                         selectedShipment.shipping_status === 'Kargoya Verildi' ? '33%' : '0%', 
                  height: '2px', 
                  backgroundColor: 'var(--primary-light)', 
                  zIndex: 0 
                }}></div>
                {[
                  { label: 'Hazırlandı', status: ['Hazırlanıyor', 'Kargoya Verildi', 'Yolda', 'Teslim Edildi'] },
                  { label: 'Kargoya Verildi', status: ['Kargoya Verildi', 'Yolda', 'Teslim Edildi'] },
                  { label: 'Yolda', status: ['Yolda', 'Teslim Edildi'] },
                  { label: 'Teslimat', status: ['Teslim Edildi'] }
                ].map((step, i) => {
                  const isActive = step.status.includes(selectedShipment.shipping_status);
                  return (
                    <div key={step.label} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '22px', 
                        height: '22px', 
                        borderRadius: '50%', 
                        backgroundColor: isActive ? 'var(--primary-light)' : 'var(--white)',
                        border: '2px solid var(--primary-light)',
                        transition: 'all 0.3s ease'
                      }}></div>
                      <span style={{ fontSize: '12px', fontWeight: isActive ? '700' : '500', color: isActive ? 'var(--primary-dark)' : 'var(--text-light)' }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
             </div>
          </div>
          {}
          <div style={{ 
            marginTop: '12px', 
            paddingTop: '24px', 
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-light)' }}>Durumu Manuel Güncelle:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <button 
                onClick={() => handleUpdateStatus(selectedShipment.order_id, 'Kargoya Verildi')}
                disabled={selectedShipment.shipping_status === 'Kargoya Verildi'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: selectedShipment.shipping_status === 'Kargoya Verildi' ? 'var(--surface-soft)' : 'var(--surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                <Send size={16} /> Kargoya Ver
              </button>
              <button 
                onClick={() => handleUpdateStatus(selectedShipment.order_id, 'Yolda')}
                disabled={selectedShipment.shipping_status === 'Yolda'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: selectedShipment.shipping_status === 'Yolda' ? 'var(--surface-soft)' : 'var(--surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                <Map size={16} /> Yola Çıkar
              </button>
              <button 
                onClick={() => handleUpdateStatus(selectedShipment.order_id, 'Teslim Edildi')}
                disabled={selectedShipment.shipping_status === 'Teslim Edildi'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: selectedShipment.shipping_status === 'Teslim Edildi' ? 'var(--surface-soft)' : 'var(--success)',
                  color: selectedShipment.shipping_status === 'Teslim Edildi' ? 'inherit' : 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px'
                }}
              >
                <CheckCircle size={16} /> Teslim Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ShippingPanel;
