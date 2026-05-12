import { useEffect, useState } from 'react';
import {
  BellRing,
  CheckCircle,
  KeyRound,
  LogOut,
  Moon,
  Palette,
  RadioTower,
  Save,
  Settings,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import ChannelsPanel from './ChannelsPanel';
import { changePassword, updateProfile } from '../services/api';
import { getApiErrorMessage } from '../utils/display';

const settingSections = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'security', label: 'Güvenlik', icon: ShieldCheck },
  { id: 'appearance', label: 'Görünüm', icon: Palette },
  { id: 'developer', label: 'Geliştirici', icon: RadioTower },
];

const fieldStyle = {
  padding: '16px',
  backgroundColor: 'var(--surface)',
  borderRadius: '12px',
  color: 'var(--text-dark)',
  fontWeight: 600,
  border: '1px solid var(--border-color)',
};

const SettingsPanel = ({ currentUser, onUserUpdate, onLogout, theme, setTheme, initialSection = 'profile' }) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProfileData({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
    });
  }, [currentUser]);

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    if (!profileData.name.trim() || !profileData.email.trim()) {
      setProfileErrorMsg('Ad soyad ve e-posta alanları boş bırakılamaz.');
      return;
    }

    setIsProfileSaving(true);
    try {
      const updatedUser = await updateProfile(profileData.name, profileData.email);
      onUserUpdate?.(updatedUser);
      setProfileSuccessMsg('Profil bilgileriniz güncellendi.');
    } catch (apiError) {
      setProfileErrorMsg(getApiErrorMessage(apiError, 'Profil güncellenemedi.'));
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentUser?.email) {
      setErrorMsg('Oturum bilgisi bulunamadı.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMsg('Yeni şifreler eşleşmiyor.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setErrorMsg('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      onUserUpdate?.(updatedUser);
      setSuccessMsg('Şifreniz başarıyla güncellendi.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (apiError) {
      setErrorMsg(getApiErrorMessage(apiError, 'Şifre güncellenemedi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderProfile = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
      <section className="glass-card" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-dark)' }}>Profil Bilgileri</h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-light)', fontSize: '14px' }}>
            Panel içinde AI asistanın personeli tanıması için kullanılan hesap bilgileri.
          </p>
        </div>

        {profileErrorMsg && (
          <div style={{ backgroundColor: 'rgba(230, 57, 70, 0.1)', color: 'var(--error)', padding: '12px', borderRadius: '12px', fontSize: '14px' }}>
            {profileErrorMsg}
          </div>
        )}

        {profileSuccessMsg && (
          <div style={{ backgroundColor: 'rgba(82, 183, 136, 0.1)', color: 'var(--success)', padding: '12px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} /> {profileSuccessMsg}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-light)', marginBottom: '8px' }}>Ad Soyad</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(event) => setProfileData({ ...profileData, name: event.target.value })}
              required
              minLength={2}
              maxLength={80}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-light)', marginBottom: '8px' }}>E-posta Adresi</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(event) => setProfileData({ ...profileData, email: event.target.value })}
              required
              maxLength={120}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px' }}
            />
          </div>
          <button type="submit" disabled={isProfileSaving} style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'var(--primary-mid)',
            color: 'var(--on-primary)',
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            opacity: isProfileSaving ? 0.7 : 1,
          }}>
            <Save size={18} /> {isProfileSaving ? 'Kaydediliyor...' : 'Profili Kaydet'}
          </button>
        </form>

        <div>
          <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-light)', marginBottom: '8px' }}>Rol / Yetki</label>
          <div style={{ ...fieldStyle, color: 'var(--primary-mid)', fontWeight: 800 }}>
            {currentUser?.role || 'Personel'}
          </div>
        </div>
      </section>

      <section className="glass-card" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '22px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-dark)' }}>Oturum</h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-light)', lineHeight: 1.6 }}>
            Bu cihazdaki aktif oturumu kapatır. Lokal sohbet geçmişi kullanıcı hesabına göre ayrı tutulmaya devam eder.
          </p>
        </div>
        <button
          onClick={onLogout}
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(230, 57, 70, 0.1)',
            color: 'var(--error)',
            border: '1px solid rgba(230, 57, 70, 0.2)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <LogOut size={20} />
          {currentUser?.email === 'demo@koopilot.local' ? 'Demodan Çık' : 'Oturumu Kapat'}
        </button>
      </section>
    </div>
  );

  const renderSecurity = () => (
    <section className="glass-card" style={{ padding: '28px', borderRadius: '24px', maxWidth: '720px' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <KeyRound size={20} /> Şifre Değiştir
      </h3>
      <p style={{ margin: '0 0 22px', color: 'var(--text-light)', lineHeight: 1.6 }}>
        Hesap güvenliği için en az 6 karakterli yeni bir şifre belirleyin.
      </p>

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(230, 57, 70, 0.1)', color: 'var(--error)', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: 'rgba(82, 183, 136, 0.1)', color: 'var(--success)', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input
          type="password"
          placeholder="Mevcut Şifre"
          value={passwordData.currentPassword}
          onChange={(event) => setPasswordData({ ...passwordData, currentPassword: event.target.value })}
          required
          style={{ width: '100%', padding: '14px 16px', borderRadius: '12px' }}
        />
        <input
          type="password"
          placeholder="Yeni Şifre"
          value={passwordData.newPassword}
          onChange={(event) => setPasswordData({ ...passwordData, newPassword: event.target.value })}
          required
          style={{ width: '100%', padding: '14px 16px', borderRadius: '12px' }}
        />
        <input
          type="password"
          placeholder="Yeni Şifre (Tekrar)"
          value={passwordData.confirmPassword}
          onChange={(event) => setPasswordData({ ...passwordData, confirmPassword: event.target.value })}
          required
          style={{ width: '100%', padding: '14px 16px', borderRadius: '12px' }}
        />

        <button type="submit" disabled={isSaving} style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'var(--primary-mid)',
          color: 'var(--on-primary)',
          fontWeight: 800,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '8px',
          opacity: isSaving ? 0.7 : 1,
        }}>
          <Save size={18} /> {isSaving ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
        </button>
      </form>
    </section>
  );

  const renderAppearance = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
      <section className="glass-card" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-dark)' }}>Tema</h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-light)', lineHeight: 1.6 }}>
            Panel görünümü bu cihazda saklanır.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { id: 'light', label: 'Açık', icon: Sun },
            { id: 'dark', label: 'Koyu', icon: Moon },
          ].map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  border: isActive ? '1px solid var(--primary-light)' : '1px solid var(--border-color)',
                  backgroundColor: isActive ? 'rgba(82, 183, 136, 0.14)' : 'var(--surface)',
                  color: isActive ? 'var(--primary-dark)' : 'var(--text-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontWeight: 800,
                }}
              >
                <Icon size={18} />
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-card" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BellRing size={20} /> Bildirimler
        </h3>
        <div style={{
          padding: '14px',
          borderRadius: '14px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-dark)',
          lineHeight: 1.6,
        }}>
          Düşük stok bildirimleri ve yeni operasyon uyarıları uygulama içinde aktif olarak gösterilir.
        </div>
        <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.6 }}>
          Tarayıcı sistem bildirimi kullanılmaz; uyarılar Koopilot panelinin kendi bildirim alanında görünür.
        </p>
      </section>
    </div>
  );

  const renderDeveloper = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-dark)' }}>Geliştirici Ayarları</h3>
        <p style={{ margin: '8px 0 0', color: 'var(--text-light)', lineHeight: 1.6 }}>
          Canlı kanal bağlantıları, webhook durumu ve gerekli ortam değişkenleri bu bölümde tutulur.
        </p>
      </section>
      <ChannelsPanel />
    </div>
  );

  const renderActiveSection = () => {
    if (activeSection === 'security') return renderSecurity();
    if (activeSection === 'appearance') return renderAppearance();
    if (activeSection === 'developer') return renderDeveloper();
    return renderProfile();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <div>
        <h2 style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} /> Ayarlar
        </h2>
        <p style={{ margin: '8px 0 0', color: 'var(--text-light)' }}>
          Hesap, görünüm, güvenlik ve geliştirici bağlantılarını tek yerden yönetin.
        </p>
      </div>

      <div className="glass-card" style={{
        padding: '10px',
        borderRadius: '18px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '8px',
      }}>
        {settingSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              style={{
                minHeight: '44px',
                borderRadius: '12px',
                border: isActive ? '1px solid var(--primary-light)' : '1px solid transparent',
                backgroundColor: isActive ? 'var(--primary-mid)' : 'transparent',
                color: isActive ? 'var(--on-primary)' : 'var(--text-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 800,
              }}
            >
              <Icon size={17} />
              {section.label}
            </button>
          );
        })}
      </div>

      {renderActiveSection()}
    </div>
  );
};

export default SettingsPanel;
