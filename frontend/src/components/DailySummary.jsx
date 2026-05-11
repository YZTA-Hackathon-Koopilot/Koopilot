import { useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Lightbulb,
  Zap,
  ShieldCheck,
  RotateCw,
  Trophy,
  ShoppingBag,
  Tag,
  RefreshCw,
  Wheat,
  Trees,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getDailySummary,
  getInventoryInsights,
  getCampaignRecommendation,
} from "../services/api";
import { DailySummarySkeleton } from "./Skeleton";

const COLORS = [
  "#52B788",
  "#2D6A4F",
  "#74C69D",
  "#D6B98C",
  "#F4A261",
  "#2A9D8F",
];

const INTENT_MAP = {
  new_order: "Yeni Sipariş",
  order_creation: "Sipariş Oluşturma",
  price_inquiry: "Fiyat Sorusu",
  stock_check: "Stok Kontrolü",
  shipping_info: "Kargo Bilgisi",
  shipping_query: "Kargo Sorgusu",
  greeting: "Selamlaşma",
  other: "Diğer",
  product_info: "Ürün Bilgisi",
  complaint: "Şikayet/Destek",
};

const formatIntent = (intent) => {
  if (INTENT_MAP[intent]) return INTENT_MAP[intent];
  const label = intent.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const DailySummary = () => {
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInsightsLoading, setIsInsightsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("daily");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [campaignRec, setCampaignRec] = useState({}); // { productId: text }
  const [isRecLoading, setIsRecLoading] = useState({});

  const fetchSummary = async (isManual = false) => {
    if (isManual) setIsLoading(true);
    try {
      const data = await getDailySummary();
      setSummary(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Özet verisi çekilemedi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const data = await getInventoryInsights();
      setInsights(data);
    } catch (error) {
      console.error("Insight verisi çekilemedi:", error);
    } finally {
      setIsInsightsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchInsights();
    const interval = setInterval(() => {
      fetchSummary();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCampaignRequest = async (product) => {
    setIsRecLoading((prev) => ({ ...prev, [product.id]: true }));
    try {
      const data = await getCampaignRecommendation(product);
      setCampaignRec((prev) => ({
        ...prev,
        [product.id]: data.recommendation,
      }));
    } catch {
      setCampaignRec((prev) => ({
        ...prev,
        [product.id]: "Öneri alınamadı. Lütfen tekrar deneyin.",
      }));
    } finally {
      setIsRecLoading((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  if (isLoading) return <DailySummarySkeleton />;
  if (!summary) return <div style={{ padding: "24px" }}>Veri bulunamadı.</div>;

  const multiplier =
    timeRange === "daily" ? 1 : timeRange === "monthly" ? 30 : 365;
  const labelPrefix =
    timeRange === "daily"
      ? "Günlük"
      : timeRange === "monthly"
        ? "30 Günlük Projeksiyon"
        : "Yıllık Projeksiyon";
  const totalMessages = summary.total_messages * multiplier;
  const lowStockCount = summary.low_stock_count;
  const chartData = Object.entries(summary.intent_distribution).map(
    ([intent, count]) => ({
      name: formatIntent(intent),
      value: count * multiplier,
      Adet: count * multiplier,
    }),
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        animation: "fadeIn 0.4s ease-out",
      }}
    >
      <div
        className="glass-card"
        style={{
          padding: "32px",
          borderRadius: "24px",
          position: "relative",
          overflow: "hidden",
          border: "2px solid rgba(82, 183, 136, 0.3)",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h2
              style={{
                color: "var(--primary-dark)",
                fontSize: "28px",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Wheat size={32} color="var(--primary-mid)" /> Günün Hasadı
              <button
                onClick={() => fetchSummary(true)}
                title="Verileri Yenile"
                className="hover-scale"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--primary-mid)",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(82, 183, 136, 0.1)",
                }}
              >
                <RotateCw
                  size={18}
                  className={isLoading ? "spin-animation" : ""}
                />
              </button>
            </h2>
            <p
              style={{
                color: "var(--text-dark)",
                opacity: 0.9,
                fontSize: "16px",
                maxWidth: "85%",
                lineHeight: 1.5,
              }}
            >
              {summary.summary_text}
            </p>
            <div
              style={{
                marginTop: "12px",
                fontSize: "12px",
                color: "var(--text-light)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "rgba(0,0,0,0.03)",
                padding: "4px 10px",
                borderRadius: "20px",
                width: "fit-content",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "var(--success)",
                  animation: "pulse 2s infinite",
                }}
              ></div>
              Canlı Takip Aktif • Son güncelleme:{" "}
              {lastUpdated.toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>
        </div>
        <BarChart3
          size={120}
          style={{
            position: "absolute",
            right: "-20px",
            bottom: "-20px",
            opacity: 0.1,
            color: "var(--primary-dark)",
          }}
        />
      </div>

      <div
        style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}
      >
        <div
          style={{
            display: "flex",
            backgroundColor: "var(--surface)",
            padding: "6px",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
          }}
        >
          {[
            ["daily", "Günlük"],
            ["monthly", "30 Günlük"],
            ["yearly", "Yıllık"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeRange(value)}
              style={{
                padding: "10px 24px",
                borderRadius: "12px",
                fontWeight: 700,
                backgroundColor:
                  timeRange === value ? "var(--primary-mid)" : "transparent",
                color:
                  timeRange === value
                    ? "var(--on-primary)"
                    : "var(--text-light)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {timeRange !== "daily" && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "14px",
            backgroundColor: "var(--surface-muted)",
            color: "var(--text-light)",
            border: "1px solid var(--border-color)",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Bu görünüm, bugünkü mesaj dağılımından hesaplanan demo
          projeksiyonudur; gerçek geçmiş satış verisi iddiası taşımaz.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
        }}
      >
        <div
          className="glass-card"
          style={{
            backgroundColor: "var(--white)",
            padding: "24px",
            borderRadius: "20px",
            border: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                color: "var(--text-light)",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              {labelPrefix} Toplam Mesaj
            </span>
            <div
              style={{
                padding: "8px",
                backgroundColor: "rgba(45, 106, 79, 0.1)",
                borderRadius: "10px",
                color: "var(--primary-mid)",
              }}
            >
              <MessageSquare size={20} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                color: "var(--primary-dark)",
              }}
            >
              {totalMessages.toLocaleString("tr-TR")}
            </div>
            {timeRange !== "daily" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: "var(--success)",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                <TrendingUp size={16} style={{ marginRight: "4px" }} /> Demo
              </div>
            )}
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            backgroundColor: "var(--white)",
            padding: "24px",
            borderRadius: "20px",
            border: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                color: "var(--text-light)",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Anlık Stok Uyarıları
            </span>
            <div
              style={{
                padding: "8px",
                backgroundColor: "rgba(230, 57, 70, 0.1)",
                borderRadius: "10px",
                color: "var(--error)",
              }}
            >
              <AlertCircle size={20} />
            </div>
          </div>
          <div
            style={{ fontSize: "36px", fontWeight: 800, color: "var(--error)" }}
          >
            {lowStockCount}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-light)" }}>
            Stok durumu her zaman anlık veriyi yansıtır.
          </div>
        </div>
      </div>

      <div style={{ marginTop: "8px" }}>
        <h3
          style={{
            marginBottom: "16px",
            color: "var(--text-dark)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Sparkles size={20} color="var(--primary-mid)" /> AI Akıllı Analizler
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {(summary.insights || []).map((insight, index) => {
            const getIcon = () => {
              switch (insight.type) {
                case "positive":
                  return <ShieldCheck size={20} />;
                case "warning":
                  return <AlertCircle size={20} />;
                case "success":
                  return <Zap size={20} />;
                case "info":
                  return <Lightbulb size={20} />;
                default:
                  return <Sparkles size={20} />;
              }
            };
            const getColor = () => {
              switch (insight.type) {
                case "positive":
                  return "var(--success)";
                case "warning":
                  return "var(--error)";
                case "success":
                  return "var(--primary-mid)";
                case "info":
                  return "var(--accent-earth)";
                default:
                  return "var(--primary-light)";
              }
            };
            return (
              <div
                key={index}
                className="glass-card"
                style={{
                  padding: "20px",
                  borderRadius: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <div
                    style={{
                      padding: "8px",
                      borderRadius: "10px",
                      backgroundColor: `${getColor()}15`,
                      color: getColor(),
                    }}
                  >
                    {getIcon()}
                  </div>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "15px",
                      color: "var(--text-dark)",
                    }}
                  >
                    {insight.title}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "var(--text-light)",
                    lineHeight: 1.5,
                  }}
                >
                  {insight.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: "8px" }}>
        <h3
          style={{
            marginBottom: "20px",
            color: "var(--text-dark)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Trees size={20} color="#F4A261" /> Koopilot Insights - Haftalık
          Performans
        </h3>

        {isInsightsLoading ? (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--text-light)",
            }}
          >
            Veriler analiz ediliyor...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
              gap: "24px",
              marginBottom: "24px",
            }}
          >
            <div
              className="glass-card"
              style={{
                padding: "24px",
                borderRadius: "24px",
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(82, 183, 136, 0.1)",
                    color: "var(--success)",
                  }}
                >
                  <TrendingUp size={20} />
                </div>
                <span style={{ fontWeight: 800, fontSize: "16px" }}>
                  En Çok Satan 5 Ürün (Son 7 Gün)
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {(insights?.best_sellers || []).map((p, idx) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      backgroundColor: "var(--surface-muted)",
                      borderRadius: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 800,
                          color: "var(--primary-mid)",
                          opacity: 0.5,
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px" }}>
                          {p.name}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-light)",
                          }}
                        >
                          {p.category}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: "var(--primary-dark)",
                        }}
                      >
                        {p.total_sold} Satış
                      </div>
                      <div
                        style={{ fontSize: "12px", color: "var(--success)" }}
                      >
                        {p.price} TL
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="glass-card"
              style={{
                padding: "24px",
                borderRadius: "24px",
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(230, 57, 70, 0.1)",
                    color: "var(--error)",
                  }}
                >
                  <ShoppingBag size={20} />
                </div>
                <span style={{ fontWeight: 800, fontSize: "16px" }}>
                  Dikkate Değer: Satış Bekleyen Ürünler
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {(insights?.non_sellers || []).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "16px",
                      backgroundColor: "var(--surface-muted)",
                      borderRadius: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px" }}>
                          {p.name}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-light)",
                          }}
                        >
                          Stok: {p.stock} | {p.price} TL
                        </div>
                      </div>
                      <button
                        onClick={() => handleCampaignRequest(p)}
                        disabled={isRecLoading[p.id]}
                        style={{
                          padding: "8px 14px",
                          backgroundColor: "var(--primary-mid)",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: 700,
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                          border: "none",
                        }}
                      >
                        {isRecLoading[p.id] ? (
                          <RefreshCw size={14} className="spin-animation" />
                        ) : (
                          <Tag size={14} />
                        )}
                        Kampanya Önerisi
                      </button>
                    </div>
                    {campaignRec[p.id] && (
                      <div
                        style={{
                          padding: "12px",
                          backgroundColor: "white",
                          borderRadius: "10px",
                          fontSize: "13px",
                          border: "1px solid rgba(82, 183, 136, 0.2)",
                          animation: "fadeIn 0.3s ease-out",
                          lineHeight: 1.5,
                          color: "var(--primary-dark)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 800,
                            marginBottom: "4px",
                            fontSize: "11px",
                            textTransform: "uppercase",
                            color: "var(--primary-mid)",
                          }}
                        >
                          Koopilot Önerisi:
                        </div>
                        {campaignRec[p.id]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="glass-card"
        style={{
          backgroundColor: "var(--white)",
          padding: "24px",
          borderRadius: "24px",
          border: "1px solid var(--border-color)",
        }}
      >
        <h3
          style={{
            marginBottom: "20px",
            color: "var(--text-dark)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <BarChart3 size={20} color="var(--primary-mid)" /> {labelPrefix} Niyet
          Dağılımı ve Trend
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border-color)",
                    borderRadius: "12px",
                    color: "var(--text-dark)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                  itemStyle={{ color: "var(--primary-mid)", fontWeight: 800 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-light)"
                  tick={{ fill: "var(--text-light)", fontSize: 12 }}
                />
                <YAxis
                  stroke="var(--text-light)"
                  tick={{ fill: "var(--text-light)", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-soft)" }}
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border-color)",
                    borderRadius: "12px",
                    color: "var(--text-dark)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                  itemStyle={{ color: "var(--primary-mid)", fontWeight: 800 }}
                />
                <Bar
                  dataKey="Adet"
                  fill="var(--primary-light)"
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-light)"
                  tick={{ fill: "var(--text-light)", fontSize: 12 }}
                />
                <YAxis
                  stroke="var(--text-light)"
                  tick={{ fill: "var(--text-light)", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border-color)",
                    borderRadius: "12px",
                    color: "var(--text-dark)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                  itemStyle={{ color: "var(--primary-mid)", fontWeight: 800 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                <Line
                  type="monotone"
                  dataKey="Adet"
                  stroke="var(--primary-light)"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "var(--primary-dark)", strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailySummary;
