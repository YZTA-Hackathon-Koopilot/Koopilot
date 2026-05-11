import { useState, useEffect, useRef } from "react";
import { FaGithub, FaTelegramPlane } from "react-icons/fa";
import {
  Leaf,
  Lock,
  LogIn,
  Mail,
  MessageSquare,
  PackageCheck,
  Sun,
  Moon,
  Truck,
  User,
  UserPlus,
} from "lucide-react";
import {
  loginDemoUser,
  loginUser,
  registerUser,
  setAuthToken,
} from "../services/api";
import logoUrl from "../assets/logo.png";

const teamLinks = [
  { name: "Kaan", href: "https://github.com/kkaan1907" },
  { name: "Zeynep", href: "https://github.com/search?q=Zeynep&type=users" },
  { name: "Muhammed", href: "https://github.com/muhammedkoseoglu" },
];

const ParticleNetwork = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let mouse = { x: null, y: null, radius: 160 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        this.color = `rgba(82, 183, 136, ${Math.random() * 0.5 + 0.2})`; 
      }
      update() {
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
        
        this.x += this.speedX;
        this.y += this.speedY;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      let numberOfParticles = (canvas.width * canvas.height) / 10000;
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
      }
    };

    const connect = () => {
      let maxDistance = 140;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          let dx = particles[a].x - particles[b].x;
          let dy = particles[a].y - particles[b].y;
          let distance = dx * dx + dy * dy;
          
          if (distance < maxDistance * maxDistance) {
            let opacity = 1 - (distance / (maxDistance * maxDistance));
            ctx.strokeStyle = `rgba(82, 183, 136, ${opacity * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
        
        if (mouse.x != null && mouse.y != null) {
            let dx = particles[a].x - mouse.x;
            let dy = particles[a].y - mouse.y;
            let distance = dx * dx + dy * dy;
            
            if (distance < mouse.radius * mouse.radius) {
                let opacity = 1 - (distance / (mouse.radius * mouse.radius));
                ctx.strokeStyle = `rgba(82, 183, 136, ${opacity * 0.6})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(particles[a].x, particles[a].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      connect();
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
};

const Login = ({ onLogin, theme, setTheme }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const getApiError = (apiError, fallback) => {
    return apiError?.response?.data?.detail || fallback;
  };

  const completeLogin = (authResponse) => {
    localStorage.setItem("koopilot_auth_token", authResponse.access_token);
    setAuthToken(authResponse.access_token);
    onLogin(authResponse.user);
  };

  const ensureDemoUser = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      completeLogin(await loginDemoUser());
    } catch (apiError) {
      setError(
        getApiError(
          apiError,
          "Demo oturumu başlatılamadı. Backend çalışıyor mu kontrol edin.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (isLoginMode) {
      setIsSubmitting(true);
      try {
        completeLogin(await loginUser(formData.email, formData.password));
      } catch (apiError) {
        setError(getApiError(apiError, "E-posta veya şifre hatalı."));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!formData.name || !formData.email || !formData.password) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    setIsSubmitting(true);
    try {
      completeLogin(
        await registerUser(formData.name, formData.email, formData.password),
      );
    } catch (apiError) {
      setError(getApiError(apiError, "Kayıt oluşturulamadı."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-hero-shell">
      <button 
        onClick={toggleTheme} 
        className="theme-toggle-login"
        title={theme === "dark" ? "Aydınlık Moda Geç" : "Karanlık Moda Geç"}
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <div className="login-bg" aria-hidden="true">
        <ParticleNetwork />
        <div className="login-bg-blob login-bg-blob-1" />
        <div className="login-bg-blob login-bg-blob-2" />
      </div>

      <main className="login-hero-content">
        {/* ── Sol: Kopya ── */}
        <section className="login-copy" aria-label="Koopilot tanıtım">
          <div className="login-brand-mark">
            <span>
              <img src={logoUrl} alt="Koopilot Logo" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
            </span>
            Koopilot
          </div>
          <h1>Kooperatifler için sakin, akıllı operasyon asistanı.</h1>
          <p className="login-lead">
            Müşteri mesajlarını sipariş taslağına, stok kontrolüne ve kargo
            yanıtına dönüştüren AI destekli panel.
          </p>
          <div className="login-signal-row">
            <span>
              <MessageSquare size={15} /> Mesaj analizi
            </span>
            <span>
              <PackageCheck size={15} /> Stok kontrolü
            </span>
            <span>
              <Truck size={15} /> Kargo takibi
            </span>
          </div>
          <div className="login-hero-actions">
            <a
              className="login-hero-primary"
              href="https://t.me/koopilot_bot"
              target="_blank"
              rel="noreferrer"
            >
              <FaTelegramPlane size={18} /> Telegram Botunu Dene
            </a>
          </div>
        </section>

        {/* ── Sağ: Flip Kart (ön = giriş, arka = kayıt) ── */}
        <section className="login-form-panel" aria-label="Giriş paneli">
          <div
            className={`login-card-inner${!isLoginMode ? " is-flipped" : ""}`}
          >
            {/* ÖN YÜZ — Giriş */}
            <div
              className="login-card-face login-card-front"
              aria-hidden={!isLoginMode}
            >
              <div className="login-panel-header">
                <div>
                  <h2>Personel Girişi</h2>
                  <p>Hesabınızla giriş yapın veya demo ile hemen başlayın.</p>
                </div>
                <div className="login-panel-mark">
                  <img src={logoUrl} alt="Logo" style={{ width: "20px", height: "20px", objectFit: "contain" }} />
                </div>
              </div>
              {isLoginMode && error && (
                <div className="login-error">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="login-form">
                <label className="login-field">
                  <Mail size={18} />
                  <input
                    type="email"
                    placeholder="E-posta Adresi"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="login-field">
                  <Lock size={18} />
                  <input
                    type="password"
                    placeholder="Şifre"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="login-submit"
                  disabled={isSubmitting}
                >
                  <LogIn size={18} />{" "}
                  {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
                </button>
              </form>
              <button
                type="button"
                onClick={ensureDemoUser}
                className="login-demo-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Demo açılıyor..." : "Demo ile Devam Et"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                  setError("");
                }}
                className="login-mode-button"
              >
                Hesabınız yok mu? Yeni kayıt oluşturun.
              </button>
            </div>

            {/* ARKA YÜZ — Kayıt */}
            <div
              className="login-card-face login-card-back"
              aria-hidden={isLoginMode}
            >
              <div className="login-panel-header">
                <div>
                  <h2>Hesap Oluştur</h2>
                  <p>Yeni bir personel hesabı oluşturun.</p>
                </div>
                <div className="login-panel-mark">
                  <img src={logoUrl} alt="Logo" style={{ width: "20px", height: "20px", objectFit: "contain" }} />
                </div>
              </div>
              {!isLoginMode && error && (
                <div className="login-error">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="login-form">
                <label className="login-field">
                  <User size={18} />
                  <input
                    type="text"
                    placeholder="Ad Soyad"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </label>
                <label className="login-field">
                  <Mail size={18} />
                  <input
                    type="email"
                    placeholder="E-posta Adresi"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="login-field">
                  <Lock size={18} />
                  <input
                    type="password"
                    placeholder="Şifre"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="login-submit"
                  disabled={isSubmitting}
                >
                  <UserPlus size={18} />{" "}
                  {isSubmitting ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
                </button>
              </form>
              <button
                type="button"
                onClick={ensureDemoUser}
                className="login-demo-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Demo açılıyor..." : "Demo ile Devam Et"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(true);
                  setError("");
                }}
                className="login-mode-button"
              >
                Zaten hesabınız var mı? Giriş yapın.
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="login-footer">
        <div>
          <strong style={{ fontFamily: '"Fredoka", sans-serif', fontSize: '16px' }}>Koopilot</strong>
          <span>AI destekli kooperatif operasyon asistanı</span>
        </div>
        <nav aria-label="İlgili bağlantılar">
          <a
            href="https://github.com/YZTA-Hackathon-Koopilot/Koopilot"
            target="_blank"
            rel="noreferrer"
          >
            <FaGithub size={14} /> GitHub
          </a>
          <a href="https://t.me/koopilot_bot" target="_blank" rel="noreferrer">
            Telegram Bot
          </a>
          {teamLinks.map((member) => (
            <a
              key={member.name}
              href={member.href}
              target="_blank"
              rel="noreferrer"
            >
              {member.name}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  );
};

export default Login;
