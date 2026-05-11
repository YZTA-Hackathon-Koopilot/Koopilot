import React, { useState } from 'react';
import { CheckCircle, KeyRound, Save, User } from 'lucide-react';

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem('koopilot_users')) || [];
  } catch {
    return [];
  }
};

const SettingsPanel = ({ currentUser, onUserUpdate }) => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChangePassword = (event) => {
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

    const users = readUsers();
    const userIndex = users.findIndex((user) => user.email === currentUser.email);

    if (userIndex === -1) {
      setErrorMsg('Kullanıcı bulunamadı.');
      return;
    }

    if (users[userIndex].password !== passwordData.currentPassword) {
      setErrorMsg('Mevcut şifrenizi yanlış girdiniz.');
      return;
    }

    const updatedUser = { ...users[userIndex], password: passwordData.newPassword };
    users[userIndex] = updatedUser;
    localStorage.setItem('koopilot_users', JSON.stringify(users));
    onUserUpdate?.(updatedUser);

    setSuccessMsg('Şifreniz başarıyla güncellendi.');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <User size={28} /> Hesabım
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
          <h3 style={{ margin: '0 0 24px', fontSize: '18px', color: 'var(--text-dark)' }}>Profil Bilgileri</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-light)', marginBottom: '8px' }}>Ad Soyad</label>
              <div style={{ padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '12px', color: 'var(--text-dark)', fontWeight: 600 }}>
                {currentUser?.name || 'Bilinmiyor'}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-light)', marginBottom: '8px' }}>E-posta Adresi</label>
              <div style={{ padding: '16px', backgroundColor: 'var(--surface)', borderRadius: '12px', color: 'var(--text-dark)', fontWeight: 600 }}>
                {currentUser?.email || 'Bilinmiyor'}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-light)', marginBottom: '8px' }}>Rol / Yetki</label>
              <div style={{ padding: '16px', backgroundColor: 'rgba(45, 106, 79, 0.1)', borderRadius: '12px', color: 'var(--primary-mid)', fontWeight: 800 }}>
                {currentUser?.role || 'Personel'}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
          <h3 style={{ margin: '0 0 24px', fontSize: '18px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} /> Şifre Değiştir
          </h3>

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

            <button type="submit" style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-mid)',
              color: 'var(--on-primary)',
              fontWeight: 800,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px'
            }}>
              <Save size={18} /> Şifreyi Güncelle
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
