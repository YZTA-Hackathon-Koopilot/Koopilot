import React, { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, MessageSquare, TrendingUp, Sparkles, Lightbulb, Zap, ShieldCheck } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getDailySummary } from '../services/api';

const COLORS = ['#52B788', '#2D6A4F', '#74C69D', '#D6B98C', '#F4A261', '#2A9D8F'];

const formatIntent = (intent) => {
  const label = intent.replace('_', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const DailySummary = () => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('daily');

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

  const multiplier = timeRange === 'daily' ? 1 : timeRange === 'monthly' ? 30 : 365;
  const labelPrefix = timeRange === 'daily' ? 'Günlük' : timeRange === 'monthly' ? '30 Günlük Projeksiyon' : 'Yıllık Projeksiyon';
  const totalMessages = summary.total_messages * multiplier;
  const lowStockCount = summary.low_stock_count;
  const chartData = Object.entries(summary.intent_distribution).map(([intent, count]) => ({
    name: formatIntent(intent),
    value: count * multiplier,
    Adet: count * multiplier
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease-out' }}>
      <div className="glass-card" style={{
        padding: '32px',
        borderRadius: '24px',
        position: 'relative',
        overflow: 'hidden',
        border: '2px solid rgba(82, 183, 136, 0.3)'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: 'var(--primary-dark)', fontSize: '28px', marginBottom: '8px' }}>Günün Özeti</h2>
          <p style={{ color: 'var(--text-dark)', opacity: 0.9, fontSize: '16px', maxWidth: '80%' }}>
            {summary.summary_text}
          </p>
        </div>
        <BarChart3 size={120} style={{
          position: 'absolute',
          right: '-20px',
          bottom: '-20px',
          opacity: 0.1,
          color: 'var(--primary-dark)'
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--surface)',
          padding: '6px',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          {[
            ['daily', 'Günlük'],
            ['monthly', '30 Günlük'],
            ['yearly', 'Yıllık']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeRange(value)}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: 700,
                backgroundColor: timeRange === value ? 'var(--primary-mid)' : 'transparent',
                color: timeRange === value ? 'var(--on-primary)' : 'var(--text-light)'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {timeRange !== 'daily' && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '14px',
          backgroundColor: 'var(--surface-muted)',
          color: 'var(--text-light)',
          border: '1px solid var(--border-color)',
          fontSize: '13px',
          fontWeight: 600
        }}>
          Bu görünüm, bugünkü mesaj dağılımından hesaplanan demo projeksiyonudur; gerçek geçmiş satış verisi iddiası taşımaz.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{
          backgroundColor: 'var(--white)',
          padding: '24px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '14px', fontWeight: 700 }}>{labelPrefix} Toplam Mesaj</span>
            <div style={{ padding: '8px', backgroundColor: 'rgba(45, 106, 79, 0.1)', borderRadius: '10px', color: 'var(--primary-mid)' }}>
              <MessageSquare size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary-dark)' }}>
              {totalMessages.toLocaleString('tr-TR')}
            </div>
            {timeRange !== 'daily' && (
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--success)', fontSize: '14px', fontWeight: 700 }}>
                <TrendingUp size={16} style={{ marginRight: '4px' }} /> Demo
              </div>
            )}
          </div>
        </div>

        <div className="glass-card" style={{
          backgroundColor: 'var(--white)',
          padding: '24px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-light)', fontSize: '14px', fontWeight: 700 }}>Anlık Stok Uyarıları</span>
            <div style={{ padding: '8px', backgroundColor: 'rgba(230, 57, 70, 0.1)', borderRadius: '10px', color: 'var(--error)' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--error)' }}>{lowStockCount}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Stok durumu her zaman anlık veriyi yansıtır.</div>
        </div>
      </div>

      <div style={{ marginTop: '8px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="var(--primary-mid)" /> AI Akıllı Analizler
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {(summary.insights || []).map((insight, index) => {
            const getIcon = () => {
              switch (insight.type) {
                case 'positive': return <ShieldCheck size={20} />;
                case 'warning': return <AlertCircle size={20} />;
                case 'success': return <Zap size={20} />;
                case 'info': return <Lightbulb size={20} />;
                default: return <Sparkles size={20} />;
              }
            };
            const getColor = () => {
              switch (insight.type) {
                case 'positive': return 'var(--success)';
                case 'warning': return 'var(--error)';
                case 'success': return 'var(--primary-mid)';
                case 'info': return 'var(--accent-earth)';
                default: return 'var(--primary-light)';
              }
            };
            return (
              <div key={index} className="glass-card" style={{
                padding: '20px',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ 
                    padding: '8px', 
                    borderRadius: '10px', 
                    backgroundColor: `${getColor()}15`, 
                    color: getColor() 
                  }}>
                    {getIcon()}
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-dark)' }}>{insight.title}</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-light)', lineHeight: 1.5 }}>
                  {insight.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card" style={{
        backgroundColor: 'var(--white)',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid var(--border-color)'
      }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={20} color="var(--primary-mid)" /> {labelPrefix} Niyet Dağılımı
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-dark)', boxShadow: 'var(--shadow-soft)' }}
                  itemStyle={{ color: 'var(--primary-mid)', fontWeight: 800 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-light)" tick={{ fill: 'var(--text-light)', fontSize: 12 }} />
                <YAxis stroke="var(--text-light)" tick={{ fill: 'var(--text-light)', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-soft)' }}
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-dark)', boxShadow: 'var(--shadow-soft)' }}
                  itemStyle={{ color: 'var(--primary-mid)', fontWeight: 800 }}
                />
                <Bar dataKey="Adet" fill="var(--primary-light)" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailySummary;
