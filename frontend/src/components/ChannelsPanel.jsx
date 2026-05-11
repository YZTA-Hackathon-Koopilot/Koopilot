import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, ExternalLink, MessageCircle, Send, Smartphone, XCircle } from 'lucide-react';
import { getIntegrationChannels } from '../services/api';

const fallbackChannels = {
  whatsapp: {
    name: 'WhatsApp Business API',
    live: false,
    label: 'Canlı bağlantı yok',
    honest_note: 'Şu anda gerçek WhatsApp hesabı bağlı değil. Web panelindeki mesaj akışı test/simülasyon amaçlıdır; canlı WhatsApp mesajı alıp göndermez.',
    webhook_url: '/integrations/whatsapp/webhook',
    required_env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN'],
    implemented: ['Webhook doğrulama endpointi', 'Gelen mesajı AI analiz hattına aktarma', 'Token varsa cevap gönderme adaptörü']
  },
  telegram: {
    name: 'Telegram Bot API',
    live: false,
    label: 'Token tanımlı değil',
    honest_note: 'Telegram canlı kanal demosu için TELEGRAM_BOT_TOKEN tanımlanmalı.',
    webhook_url: '/integrations/telegram/webhook',
    expected_webhook_url: 'https://koopilot-backend.onrender.com/integrations/telegram/webhook',
    required_env: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'PUBLIC_BACKEND_URL'],
    implemented: ['Webhook ile gerçek Telegram mesajı alma', 'Gemini AI analiz hattına aktarma', 'Kullanıcıya Telegram üzerinden cevap gönderme']
  },
  web_panel: {
    name: 'Web Panel Test Akışı',
    live: true,
    label: 'Çalışıyor',
    honest_note: 'Mesajlar web panelinden manuel girilir; AI analiz, sipariş taslağı ve stok kontrolü gerçek backend üzerinde çalışır.',
    endpoint: '/ai/analyze-message'
  }
};

const statusStyle = (isLive) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 10px',
  borderRadius: '999px',
  backgroundColor: isLive ? 'rgba(42, 157, 143, 0.12)' : 'rgba(244, 162, 97, 0.14)',
  color: isLive ? 'var(--success)' : 'var(--warning)',
  fontSize: '12px',
  fontWeight: 800
});

const ChannelCard = ({ title, channel, icon, tone }) => (
  <section style={{
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    boxShadow: 'var(--shadow-soft)',
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          backgroundColor: tone,
          color: 'var(--primary-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{title}</h3>
          <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>{channel.name}</div>
        </div>
      </div>
      <span style={statusStyle(channel.live)}>
        {channel.live ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
        {channel.label}
      </span>
    </div>



    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '10px'
    }}>
      {(channel.implemented || []).map((item) => (
        <div key={item} style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          padding: '10px',
          borderRadius: '12px',
          backgroundColor: 'var(--surface-muted)',
          color: 'var(--text-dark)',
          fontSize: '13px'
        }}>
          <CheckCircle2 size={15} color="var(--success)" />
          {item}
        </div>
      ))}
    </div>

    <div style={{
      padding: '12px',
      borderRadius: '12px',
      backgroundColor: 'var(--surface-muted)',
      border: '1px solid var(--border-color)',
      fontSize: '13px',
      color: 'var(--text-light)'
    }}>
      Endpoint: <code style={{ color: 'var(--text-dark)' }}>{channel.webhook_url || channel.endpoint}</code>
    </div>

    {channel.required_env && (
      <div>
        <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px' }}>Canlıya almak için gerekli ortam değişkenleri</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {channel.required_env.map((envName) => (
            <code key={envName} style={{
              padding: '6px 8px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-soft)',
              color: 'var(--text-dark)',
              fontSize: '12px'
            }}>
              {envName}
            </code>
          ))}
        </div>
      </div>
    )}

    {(channel.bot_username || channel.expected_webhook_url || channel.pending_update_count !== undefined || channel.last_error_message) && (
      <div style={{
        display: 'grid',
        gap: '8px',
        padding: '12px',
        borderRadius: '12px',
        backgroundColor: 'var(--surface-muted)',
        border: '1px solid var(--border-color)',
        fontSize: '13px'
      }}>
        {channel.bot_username && (
          <div><strong>Bot:</strong> @{channel.bot_username}</div>
        )}
        {channel.expected_webhook_url && (
          <div style={{ wordBreak: 'break-word' }}><strong>Beklenen webhook:</strong> {channel.expected_webhook_url}</div>
        )}
        {channel.pending_update_count !== undefined && channel.pending_update_count !== null && (
          <div><strong>Bekleyen update:</strong> {channel.pending_update_count}</div>
        )}
        {channel.last_error_message && (
          <div style={{ color: 'var(--error)' }}><strong>Son Telegram hatası:</strong> {channel.last_error_message}</div>
        )}
      </div>
    )}
  </section>
);

const ChannelsPanel = () => {
  const [channels, setChannels] = useState(fallbackChannels);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const data = await getIntegrationChannels();
        setChannels(data);
      } catch (err) {
        setError('Kanal durumu canlı backendden alınamadı; yedek durum bilgisi gösteriliyor.');
      }
    };

    fetchChannels();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-soft)',
        padding: '22px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px' }}>Kanal Bağlantıları</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--text-light)', lineHeight: 1.6 }}>
              Koopilot'un desteklediği tüm aktif ve entegre edilebilir iletişim kanallarının durumunu buradan takip edebilirsiniz.
            </p>
          </div>
          <span style={{
            ...statusStyle(false),
            backgroundColor: 'rgba(230, 57, 70, 0.1)',
            color: 'var(--error)'
          }}>
            <XCircle size={14} />
            WhatsApp canlı değil
          </span>
        </div>
        {error && (
          <div style={{
            marginTop: '14px',
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(244, 162, 97, 0.12)',
            color: 'var(--warning)',
            fontSize: '13px',
            fontWeight: 700
          }}>
            {error}
          </div>
        )}
      </section>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '18px'
      }}>
        <ChannelCard
          title="WhatsApp"
          channel={channels.whatsapp || fallbackChannels.whatsapp}
          icon={<Smartphone size={22} />}
          tone="rgba(42, 157, 143, 0.13)"
        />
        <ChannelCard
          title="Telegram"
          channel={channels.telegram || fallbackChannels.telegram}
          icon={<Send size={22} />}
          tone="rgba(82, 183, 136, 0.16)"
        />
        <ChannelCard
          title="Web Panel"
          channel={channels.web_panel || fallbackChannels.web_panel}
          icon={<MessageCircle size={22} />}
          tone="rgba(27, 67, 50, 0.12)"
        />
      </div>


    </div>
  );
};

export default ChannelsPanel;
