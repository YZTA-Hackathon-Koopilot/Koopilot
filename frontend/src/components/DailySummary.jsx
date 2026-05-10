import React, { useState, useEffect } from 'react';
import { getDailySummary } from '../services/api';
import { BarChart3, MessageSquare, AlertCircle, Calendar } from 'lucide-react';
const DailySummary = () => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getDailySummary();
        setSummary(data);
      } catch (error) {
        console.error('Özet verisi çekilemedi:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, []);
  if (isLoading) return <div style={{ padding: '24px' }}>Yükleniyor...</div>;
  if (!summary) return <div style={{ padding: '24px' }}>Veri bulunamadı.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{
        backgroundColor: 'var(--primary-dark)',
        color: 'var(--on-primary)',
        padding: '32px',
        borderRadius: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: 'var(--on-primary)', fontSize: '28px', marginBottom: '8px' }}>Günün Özeti 🌿</h2>
          <p style={{ opacity: 0.8, fontSize: '16px' }}>{summary.summary_text}</p>
        </div>
        <BarChart3 size={120} style={{
          position: 'absolute',
          right: '-20px',
          bottom: '-20px',
          opacity: 0.1,
          color: 'var(--on-primary)'
        }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div style={{
          backgroundColor: 'var(--white)',
          padding: '24px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '14px' }}>Toplam Mesaj</span>
            <div style={{ padding: '8px', backgroundColor: 'rgba(45, 106, 79, 0.1)', borderRadius: '10px', color: 'var(--primary-mid)' }}>
              <MessageSquare size={20} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{summary.total_messages}</div>
        </div>
        <div style={{
          backgroundColor: 'var(--white)',
          padding: '24px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '14px' }}>Stok Uyarıları</span>
            <div style={{ padding: '8px', backgroundColor: 'rgba(230, 57, 70, 0.1)', borderRadius: '10px', color: 'var(--error)' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{summary.low_stock_count}</div>
        </div>
      </div>
      <div style={{
        backgroundColor: 'var(--white)',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid var(--border-color)'
      }}>
        <h3 style={{ marginBottom: '20px' }}>Niyet Dağılımı</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(summary.intent_distribution).map(([intent, count]) => {
            const percentage = (count / summary.total_messages) * 100;
            return (
              <div key={intent} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                    {intent.replace('_', ' ')}
                  </span>
                  <span>{count} mesaj</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--surface-soft)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: 'var(--primary-light)',
                    borderRadius: '4px'
                  }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default DailySummary;