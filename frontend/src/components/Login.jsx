import React, { useState } from 'react';
import { Leaf, Lock, LogIn, Mail, User, UserPlus } from 'lucide-react';

const demoUser = {
  id: 'demo',
  name: 'Demo Kullanıcı',
  email: 'demo@koopilot.local',
  password: 'demo123',
  role: 'Yönetici'
};

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem('koopilot_users')) || [];
  } catch {
    return [];
  }
};

const Login = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const ensureDemoUser = () => {
    const users = readUsers();
    const exists = users.some((user) => user.email === demoUser.email);
    if (!exists) {
      localStorage.setItem('koopilot_users', JSON.stringify([...users, demoUser]));
    }
    onLogin(demoUser);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    const users = readUsers();

    if (isLoginMode) {
      const user = users.find((item) => item.email === formData.email && item.password === formData.password);
      if (user) {
        onLogin(user);
        return;
      }
      setError('E-posta veya şifre hatalı. Demo ile devam edebilir ya da yeni kayıt oluşturabilirsin.');
      return;
    }

    if (!formData.name || !formData.email || !formData.password) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (users.find((item) => item.email === formData.email)) {
      setError('Bu e-posta adresi zaten sisteme kayıtlı.');
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: 'Personel'
    };

    localStorage.setItem('koopilot_users', JSON.stringify([...users, newUser]));
    onLogin(newUser);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--bg-cream) 0%, var(--surface-soft) 100%)',
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px',
        borderRadius: '24px',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
            backgroundColor: 'var(--primary-light)',
            padding: '16px',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <Leaf size={40} color="var(--primary-dark)" fill="var(--primary-dark)" />
          </div>
          <h1 style={{ margin: '0 0 8px', color: 'var(--primary-dark)', fontSize: '28px', textAlign: 'center' }}>Koopilot</h1>
          <p style={{ margin: 0, color: 'var(--text-light)', fontSize: '16px', textAlign: 'center' }}>
            Kooperatif Personel Portalı
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(230, 57, 70, 0.1)',
            color: 'var(--error)',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center',
            border: '1px solid rgba(230, 57, 70, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLoginMode && (
            <div style={{ position: 'relative' }}>
              <User size={20} color="var(--text-light)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Ad Soyad"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px' }}
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail size={20} color="var(--text-light)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="email"
              placeholder="E-posta Adresi"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              required
              style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={20} color="var(--text-light)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="password"
              placeholder="Şifre"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              required
              style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px' }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '16px',
              marginTop: '8px',
              backgroundColor: 'var(--primary-mid)',
              color: 'var(--on-primary)',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: 700,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(45, 106, 79, 0.2)'
            }}
          >
            {isLoginMode ? <><LogIn size={20} /> Giriş Yap</> : <><UserPlus size={20} /> Kayıt Ol</>}
          </button>
        </form>

        <button
          type="button"
          onClick={ensureDemoUser}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '14px',
            backgroundColor: 'var(--surface-muted)',
            color: 'var(--text-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            fontWeight: 700
          }}
        >
          Demo ile Devam Et
        </button>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-mid)',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'underline'
            }}
          >
            {isLoginMode ? 'Personel hesabınız yok mu? Yeni kayıt oluşturun.' : 'Zaten hesabınız var mı? Giriş yapın.'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
