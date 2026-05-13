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
  ShoppingBag,
  Tag,
  RefreshCw,
  Wheat,
  Trees,
  ChevronDown,
  ChevronUp,
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
  applyCampaignUpdate,
} from "../services/api";
import { DailySummarySkeleton } from "./Skeleton";
import { toDisplayText } from "../utils/display";
import MarkdownMessage from "./MarkdownMessage";

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
  const label = toDisplayText(intent, "Diğer").replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const buildCampaignActions = (recommendation, product) => {
  const shorten = (value) => {
    const text = toDisplayText(value, "").replace(/\*\*/g, "").trim();
    return text.length > 110 ? `${text.slice(0, 107)}...` : text;
  };
  const extractPriceFromText = (value) => {
    const priceMatch = toDisplayText(value, "").match(/(\d+(?:[.,]\d+)?)\s*TL/i);
    if (!priceMatch) return null;

    const price = Number(priceMatch[1].replace(",", "."));
    return Number.isFinite(price) ? price : null;
  };
  const text = toDisplayText(recommendation, "");
  const actionableSection = (
    text.match(/(?:#{1,6}\s*)?Panelde Uygulanabilir Aksiyonlar\s*:?\s*([\s\S]*?)(?:\n\s*(?:#{1,6}\s*)?Stratejik Notlar|$)/i)?.[1]
    || text.match(/(?:#{1,6}\s*)?Uygulanabilir Öneriler\s*:?\s*([\s\S]*)/i)?.[1]
    || ""
  );
  const lines = actionableSection
    .split("\n")
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").replace(/^#+\s*/, "").trim())
    .filter((line) => line.length > 12)
    .filter((line) => !/^merhaba/i.test(line))
    .filter((line) => !/^kampanya önerisi/i.test(line))
    .filter((line) => !/^kampanya fikri/i.test(line))
    .filter((line) => !/^uygulanabilir öneriler/i.test(line))
    .filter((line) => !/^kampanya adı/i.test(line))
    .filter((line) => !/^değer önerisi/i.test(line))
    .map((line) => {
      const price = extractPriceFromText(line);
      if (price === null) return null;
      return {
        type: "price_update",
        price,
        label: `Fiyatı ${price.toLocaleString("tr-TR")} TL olarak güncelle`,
        source: shorten(line),
      };
    })
    .filter(Boolean)
    .slice(0, 2);

  return lines.map((action, index) => ({
    id: `action-${index}`,
    ...action,
  }));
};

const extractPriceFromActions = (actions) => {
  const directPrice = actions.find((action) => Number.isFinite(action.price))?.price;
  if (directPrice !== undefined) return directPrice;

  const joinedText = actions.map((action) => action.label).join(" ");
  const priceMatch = joinedText.match(/(\d+(?:[.,]\d+)?)\s*TL/i);
  if (!priceMatch) return null;

  const price = Number(priceMatch[1].replace(",", "."));
  return Number.isFinite(price) ? price : null;
};

const cleanCampaignRecommendation = (recommendation) => {
  const text = toDisplayText(recommendation, "");
  const headingIndex = text.search(/(?:^|\n)\s*(?:#{1,6}\s*)?Kampanya Fikri/i);
  if (headingIndex >= 0) {
    return text.slice(headingIndex).trim();
  }

  return text
    .split("\n")
    .filter((line, index) => !(index === 0 && /^merhaba.*koopilot/i.test(line.trim())))
    .join("\n")
    .trim();
};

const readStoredCampaignRecommendations = () => {
  try {
    return JSON.parse(localStorage.getItem("koopilot_campaign_recommendations") || "{}");
  } catch {
    return {};
  }
};

const readStoredSelectedCampaignActions = () => {
  try {
    return JSON.parse(localStorage.getItem("koopilot_selected_campaign_actions") || "{}");
  } catch {
    return {};
  }
};

const readStoredCampaignVisibility = () => {
  try {
    return JSON.parse(localStorage.getItem("koopilot_campaign_visibility") || "{}");
  } catch {
    return {};
  }
};

const readStoredCampaigns = () => {
  try {
    return JSON.parse(localStorage.getItem("koopilot_applied_campaigns") || "{}");
  } catch {
    return {};
  }
};

const DailySummary = () => {
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInsightsLoading, setIsInsightsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("daily");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [campaignRec, setCampaignRec] = useState(readStoredCampaignRecommendations); // { productId: text }
  const [isRecLoading, setIsRecLoading] = useState({});
  const [selectedCampaignActions, setSelectedCampaignActions] = useState(readStoredSelectedCampaignActions);
  const [campaignVisibility, setCampaignVisibility] = useState(readStoredCampaignVisibility);
  const [appliedCampaigns, setAppliedCampaigns] = useState(readStoredCampaigns);
  const [campaignApplyStatus, setCampaignApplyStatus] = useState({});

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

  useEffect(() => {
    localStorage.setItem("koopilot_campaign_recommendations", JSON.stringify(campaignRec));
  }, [campaignRec]);

  useEffect(() => {
    localStorage.setItem("koopilot_selected_campaign_actions", JSON.stringify(selectedCampaignActions));
  }, [selectedCampaignActions]);

  useEffect(() => {
    localStorage.setItem("koopilot_campaign_visibility", JSON.stringify(campaignVisibility));
  }, [campaignVisibility]);

  const handleCampaignRequest = async (product) => {
    setIsRecLoading((prev) => ({ ...prev, [product.id]: true }));
    try {
      const data = await getCampaignRecommendation(product);
      setCampaignRec((prev) => ({
        ...prev,
        [product.id]: cleanCampaignRecommendation(data?.recommendation || "Öneri alınamadı."),
      }));
      setSelectedCampaignActions((prev) => ({ ...prev, [product.id]: [] }));
      setCampaignVisibility((prev) => ({ ...prev, [product.id]: true }));
    } catch {
      setCampaignRec((prev) => ({
        ...prev,
        [product.id]: "Öneri alınamadı. Lütfen tekrar deneyin.",
      }));
      setCampaignVisibility((prev) => ({ ...prev, [product.id]: true }));
    } finally {
      setIsRecLoading((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const toggleCampaignRecommendation = (productId) => {
    setCampaignVisibility((prev) => ({
      ...prev,
      [productId]: !(prev[productId] ?? true),
    }));
  };

  const toggleCampaignAction = (productId, actionId) => {
    setSelectedCampaignActions((prev) => {
      const current = prev[productId] || [];
      const next = current.includes(actionId)
        ? current.filter((id) => id !== actionId)
        : [...current, actionId];
      return { ...prev, [productId]: next };
    });
  };

  const applyCampaignActions = async (product, actions) => {
    const selectedIds = selectedCampaignActions[product.id] || [];
    const selectedActions = actions.filter((action) => selectedIds.includes(action.id));
    if (selectedActions.length === 0) return;

    setCampaignApplyStatus((prev) => ({ ...prev, [product.id]: "applying" }));

    const newPrice = extractPriceFromActions(selectedActions);
    let appliedUpdates = {};

    try {
      if (newPrice !== null) {
        const updatedProduct = await applyCampaignUpdate(product.id, { price: newPrice });
        appliedUpdates = { price: updatedProduct.price };
        setInsights((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            non_sellers: (prev.non_sellers || []).map((item) => (
              item.id === product.id ? { ...item, price: updatedProduct.price } : item
            )),
          };
        });
      }

      const nextCampaigns = {
        ...appliedCampaigns,
        [product.id]: {
          product_name: product.name,
          applied_at: new Date().toISOString(),
          actions: selectedActions,
          updates: appliedUpdates,
        },
      };
      setAppliedCampaigns(nextCampaigns);
      localStorage.setItem("koopilot_applied_campaigns", JSON.stringify(nextCampaigns));
      setCampaignApplyStatus((prev) => ({ ...prev, [product.id]: "success" }));
    } catch (error) {
      console.error("Kampanya önerisi uygulanamadı:", error);
      setCampaignApplyStatus((prev) => ({ ...prev, [product.id]: "error" }));
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
  const totalMessages = Number(summary.total_messages || 0) * multiplier;
  const lowStockCount = Number(summary.low_stock_count || 0);
  const intentDistribution = summary.intent_distribution || {};
  const chartData = Object.entries(intentDistribution).map(
    ([intent, count]) => ({
      name: formatIntent(intent),
      value: Number(count || 0) * multiplier,
      Adet: Number(count || 0) * multiplier,
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
              {toDisplayText(summary.summary_text, "Bugünkü operasyon özeti hazırlanıyor.")}
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

      <div className="daily-summary-grid">
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
                    {toDisplayText(insight.title, "İçgörü")}
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
                  {toDisplayText(insight.text)}
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
                          {toDisplayText(p.name, "Ürün")}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-light)",
                          }}
                        >
                          {toDisplayText(p.category, "Kategori")}
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
                        {Number(p.total_sold || 0).toLocaleString("tr-TR")} Satış
                      </div>
                      <div
                        style={{ fontSize: "12px", color: "var(--success)" }}
                      >
                        {Number(p.price || 0).toLocaleString("tr-TR")} TL
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
                {(insights?.non_sellers || []).map((p) => {
                  const recommendation = cleanCampaignRecommendation(campaignRec[p.id]);
                  const campaignActions = recommendation ? buildCampaignActions(recommendation, p) : [];
                  const selectedActions = selectedCampaignActions[p.id] || [];
                  const appliedCampaign = appliedCampaigns[p.id];
                  const applyStatus = campaignApplyStatus[p.id];
                  const isRecommendationOpen = recommendation ? (campaignVisibility[p.id] ?? true) : false;

                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: "16px",
                        backgroundColor: "var(--surface-muted)",
                        borderRadius: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        border: appliedCampaign ? "1px solid rgba(42, 157, 143, 0.35)" : "1px solid transparent",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "16px",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            {toDisplayText(p.name, "Ürün")}
                            {appliedCampaign && (
                              <span style={{
                                padding: "3px 8px",
                                borderRadius: "999px",
                                backgroundColor: "rgba(42, 157, 143, 0.12)",
                                color: "var(--success)",
                                fontSize: "11px",
                                fontWeight: 900,
                              }}>
                                Uygulandı
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-light)",
                            }}
                          >
                            Stok: {Number(p.stock || 0).toLocaleString("tr-TR")} | {Number(p.price || 0).toLocaleString("tr-TR")} TL
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {recommendation && (
                            <button
                              type="button"
                              onClick={() => toggleCampaignRecommendation(p.id)}
                              style={{
                                padding: "8px 12px",
                                backgroundColor: "var(--surface)",
                                color: "var(--text-dark)",
                                fontSize: "12px",
                                fontWeight: 800,
                                borderRadius: "10px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                cursor: "pointer",
                                border: "1px solid var(--border-color)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isRecommendationOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {isRecommendationOpen ? "Öneriyi Kapat" : "Öneriyi Aç"}
                            </button>
                          )}
                          <button
                            onClick={() => handleCampaignRequest(p)}
                            disabled={isRecLoading[p.id]}
                            style={{
                              padding: "8px 14px",
                              backgroundColor: "var(--primary-mid)",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: 800,
                              borderRadius: "10px",
                              display: "flex",
                              alignItems: "center",
                              gap: "7px",
                              cursor: isRecLoading[p.id] ? "default" : "pointer",
                              border: "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isRecLoading[p.id] ? (
                              <RefreshCw size={14} className="spin-animation" />
                            ) : (
                              <Tag size={14} />
                            )}
                            {isRecLoading[p.id]
                              ? "Öneri Oluşturuluyor"
                              : recommendation
                                ? "Tekrar Öneri Oluştur"
                                : "Kampanya Önerisi Yap"}
                            <span style={{
                              padding: "2px 6px",
                              borderRadius: "999px",
                              backgroundColor: "rgba(255, 255, 255, 0.18)",
                              fontSize: "10px",
                              fontWeight: 900,
                              letterSpacing: "0.02em",
                            }}>
                              AI
                            </span>
                          </button>
                        </div>
                      </div>
                      {recommendation && !isRecommendationOpen && (
                        <div style={{
                          padding: "10px 12px",
                          borderRadius: "12px",
                          backgroundColor: "var(--surface-elevated)",
                          border: "1px solid rgba(82, 183, 136, 0.18)",
                          color: "var(--text-light)",
                          fontSize: "12px",
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}>
                          <Sparkles size={14} color="var(--primary-mid)" />
                          AI kampanya önerisi hazır. Görmek için “Öneriyi Aç”ı kullanın.
                        </div>
                      )}
                      {recommendation && isRecommendationOpen && (
                        <div
                          style={{
                            padding: "14px",
                            backgroundColor: "var(--surface-elevated)",
                            borderRadius: "12px",
                            fontSize: "13px",
                            border: "1px solid rgba(82, 183, 136, 0.22)",
                            animation: "fadeIn 0.3s ease-out",
                            lineHeight: 1.5,
                            color: "var(--text-dark)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontWeight: 900,
                              fontSize: "11px",
                              textTransform: "uppercase",
                              color: "var(--primary-mid)",
                            }}
                          >
                            <Sparkles size={14} />
                            Koopilot AI Önerisi
                          </div>
                          <MarkdownMessage text={toDisplayText(recommendation)} />

                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ fontSize: "12px", color: "var(--text-light)", fontWeight: 800 }}>
                              Panelde uygulanabilir aksiyonlar:
                            </div>
                            {campaignActions.length === 0 ? (
                              <div style={{
                                padding: "10px 12px",
                                borderRadius: "10px",
                                backgroundColor: "var(--surface)",
                                border: "1px dashed var(--border-color)",
                                color: "var(--text-light)",
                                fontSize: "12px",
                                fontWeight: 700,
                              }}>
                                Bu öneri şu an otomatik uygulanabilecek bir panel aksiyonu içermiyor. Stratejik not olarak kullanılabilir.
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {campaignActions.map((action) => {
                                  const isSelected = selectedActions.includes(action.id);
                                  return (
                                    <button
                                      key={action.id}
                                      type="button"
                                      title={action.source}
                                      onClick={() => toggleCampaignAction(p.id, action.id)}
                                      style={{
                                        padding: "8px 10px",
                                        borderRadius: "999px",
                                        border: isSelected ? "1px solid var(--primary-light)" : "1px solid var(--border-color)",
                                        backgroundColor: isSelected ? "rgba(82, 183, 136, 0.14)" : "var(--surface)",
                                        color: isSelected ? "var(--primary-dark)" : "var(--text-dark)",
                                        fontSize: "12px",
                                        fontWeight: 800,
                                        cursor: "pointer",
                                        maxWidth: "100%",
                                      }}
                                    >
                                      {action.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {appliedCampaign && (
                            <div style={{
                              padding: "10px 12px",
                              borderRadius: "10px",
                              backgroundColor: "rgba(42, 157, 143, 0.1)",
                              color: "var(--success)",
                              fontSize: "12px",
                              fontWeight: 800,
                            }}>
                              {appliedCampaign.actions.length} öneri uygulandı
                              {appliedCampaign.updates?.price !== undefined ? ` · Yeni fiyat: ${Number(appliedCampaign.updates.price).toLocaleString("tr-TR")} TL` : ""}
                              {" · "}
                              {new Date(appliedCampaign.applied_at).toLocaleString("tr-TR")}
                            </div>
                          )}

                          {applyStatus === "error" && (
                            <div style={{
                              padding: "10px 12px",
                              borderRadius: "10px",
                              backgroundColor: "rgba(230, 57, 70, 0.1)",
                              color: "var(--error)",
                              fontSize: "12px",
                              fontWeight: 800,
                            }}>
                              Öneriler uygulanamadı. Backend bağlantısını kontrol edip tekrar deneyin.
                            </div>
                          )}

                          {campaignActions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => applyCampaignActions(p, campaignActions)}
                              disabled={selectedActions.length === 0 || applyStatus === "applying"}
                              style={{
                                alignSelf: "flex-start",
                                padding: "10px 14px",
                                borderRadius: "12px",
                                backgroundColor: "var(--primary-mid)",
                                color: "var(--on-primary)",
                                fontSize: "12px",
                                fontWeight: 900,
                                opacity: selectedActions.length === 0 || applyStatus === "applying" ? 0.55 : 1,
                                cursor: selectedActions.length === 0 || applyStatus === "applying" ? "default" : "pointer",
                              }}
                            >
                              {applyStatus === "applying" ? "Uygulanıyor..." : "Önerileri Uygula"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
