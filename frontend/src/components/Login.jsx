import React, { useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, Leaf, Lock, LogIn, Mail, MessageSquare, PackageCheck, Send, Truck, User, UserPlus } from 'lucide-react';

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
    <div className="login-hero-shell">
      <div className="login-scene" aria-hidden="true">
        <div className="login-scene-rail rail-one" />
        <div className="login-scene-rail rail-two" />
        <div className="login-scene-card scene-message">
          <div className="scene-card-kicker"><MessageSquare size={14} /> Gelen Mesaj</div>
          <p>2 domates salçası ve 1 nar ekşisi istiyorum.</p>
          <span>Telegram kanalı</span>
        </div>
        <div className="login-scene-card scene-agent">
          <div className="scene-agent-icon"><Bot size={22} /></div>
          <div>
            <div className="scene-card-kicker">AI Analiz</div>
            <p>Sipariş niyeti algılandı. Ürünler katalogla eşleşti.</p>
          </div>
        </div>
        <div className="login-scene-card scene-order">
          <div className="scene-card-kicker"><PackageCheck size={14} /> Sipariş Taslağı</div>
          <div className="scene-product-row"><span>Domates Salçası</span><strong>2 kavanoz</strong></div>
          <div className="scene-product-row"><span>Nar Ekşisi</span><strong>1 şişe</strong></div>
          <div className="scene-status"><CheckCircle2 size={15} /> Stok uygun</div>
        </div>
        <div className="login-scene-card scene-reply">
          <div className="scene-card-kicker"><Send size={14} /> Yanıt Taslağı</div>
          <p>Ad, telefon ve açık adresinizi paylaşabilir misiniz?</p>
        </div>
        <div className="login-scene-card scene-shipping">
          <Truck size={18} />
          <span>Kargo soruları aynı akışta cevaplanır.</span>
        </div>
      </div>

      <main className="login-hero-content">
        <section className="login-copy" aria-label="Koopilot tanıtım">
          <div className="login-brand-mark">
            <span><Leaf size={24} fill="currentColor" /></span>
            Koopilot
          </div>
          <h1>Kooperatifler için sakin, akıllı operasyon asistanı.</h1>
          <p className="login-lead">
            Müşteri mesajlarını sipariş taslağına, stok kontrolüne ve kargo yanıtına dönüştüren AI destekli panel.
          </p>
          <div className="login-signal-row">
            <span><MessageSquare size={16} /> Mesaj analizi</span>
            <span><PackageCheck size={16} /> Stok kontrolü</span>
            <span><Truck size={16} /> Kargo takibi</span>
          </div>
          <div className="login-hero-actions">
            <button type="button" className="login-hero-primary" onClick={ensureDemoUser}>
              Demo’ya Başla <ArrowRight size={18} />
            </button>
            <a className="login-hero-secondary" href="https://t.me/koopilot_bot" target="_blank" rel="noreferrer">
              Telegram Botunu Dene
            </a>
          </div>
        </section>

        <section className="login-access-card glass-card" aria-label="Koopilot giriş">
          <div className="login-panel-header">
            <div>
              <h2>{isLoginMode ? 'Personel Girişi' : 'Yeni Personel'}</h2>
              <p>{isLoginMode ? 'Demo hesabı kullanabilir veya kayıtlı hesabınızla girebilirsiniz.' : 'Yerel demo hesabınızı oluşturun.'}</p>
            </div>
            <div className="login-panel-mark"><Leaf size={20} fill="currentColor" /></div>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {!isLoginMode && (
              <label className="login-field">
                <User size={19} />
                <input
                  type="text"
                  placeholder="Ad Soyad"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                />
              </label>
            )}

            <label className="login-field">
              <Mail size={19} />
              <input
                type="email"
                placeholder="E-posta Adresi"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                required
              />
            </label>

            <label className="login-field">
              <Lock size={19} />
              <input
                type="password"
                placeholder="Şifre"
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                required
              />
            </label>

            <button type="submit" className="login-submit">
              {isLoginMode ? <><LogIn size={19} /> Giriş Yap</> : <><UserPlus size={19} /> Kayıt Ol</>}
            </button>
          </form>

          <button type="button" onClick={ensureDemoUser} className="login-demo-button">
            Demo ile Devam Et
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
            }}
            className="login-mode-button"
          >
            {isLoginMode ? 'Personel hesabınız yok mu? Yeni kayıt oluşturun.' : 'Zaten hesabınız var mı? Giriş yapın.'}
          </button>
        </section>
      </main>
    </div>
  );
};

export default Login;
