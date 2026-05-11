/* ─────────────────────────────────────────────
   Skeleton.jsx – paylaşılan iskelet yükleme blokları
   ───────────────────────────────────────────── */

/** Tek bir shimmer bloğu */
const Skel = ({ w = '100%', h = '16px', r = '8px', style = {} }) => (
  <div
    className="skeleton-block"
    style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
  />
);

/* ── Kart sarmalayıcı ── */
const SkelCard = ({ children, style = {} }) => (
  <div
    style={{
      padding: '20px',
      borderRadius: '16px',
      border: '1px solid var(--border-color)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ══════════════════════════════════════════════
   1. SİPARİŞ PANELİ — kart grid
══════════════════════════════════════════════ */
export const OrderSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
    {[...Array(4)].map((_, i) => (
      <SkelCard key={i}>
        {/* başlık: ikon + sipariş no + durum badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Skel w="34px" h="34px" r="10px" />
          <Skel w="110px" h="13px" />
          <Skel w="75px" h="24px" r="999px" style={{ marginLeft: 'auto' }} />
        </div>
        {/* müşteri bilgileri */}
        <Skel w="70%" h="12px" />
        <Skel w="55%" h="12px" />
        <Skel w="85%" h="12px" />
        <div style={{ borderTop: '1px solid var(--border-color)' }} />
        {/* ürün kalemleri */}
        <Skel w="100%" h="12px" />
        <Skel w="80%"  h="12px" />
        {/* aksiyon butonu */}
        <Skel w="100%" h="40px" r="12px" />
      </SkelCard>
    ))}
  </div>
);

/* ══════════════════════════════════════════════
   2. ENVANTER PANELİ — istatistik kartlar + tablo
══════════════════════════════════════════════ */
export const InventorySkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    {/* 3 istatistik kartı */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
      {[...Array(3)].map((_, i) => (
        <SkelCard key={i}>
          <Skel w="34px" h="34px" r="10px" />
          <Skel w="55%" h="11px" />
          <Skel w="40%" h="26px" r="6px" />
        </SkelCard>
      ))}
    </div>

    {/* tablo */}
    <div style={{ borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--surface)', overflow: 'hidden' }}>
      {/* başlık satırı */}
      <div style={{ display: 'flex', gap: '12px', padding: '14px 20px', borderBottom: '1px solid var(--border-color)' }}>
        {[38, 18, 14, 12, 14].map((w, j) => (
          <Skel key={j} w={`${w}%`} h="11px" />
        ))}
      </div>
      {/* veri satırları */}
      {[...Array(7)].map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid var(--border-color)' }}>
          {[38, 18, 14, 12, 14].map((w, j) => (
            <Skel key={j} w={`${w}%`} h="12px" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

/* ══════════════════════════════════════════════
   3. GÜNLÜK ÖZET — hero + stat + insight + grafik
══════════════════════════════════════════════ */
export const DailySummarySkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    {/* hero kart */}
    <Skel w="100%" h="158px" r="20px" />

    {/* 2 istatistik kartı */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Skel w="100%" h="96px" r="16px" />
      <Skel w="100%" h="96px" r="16px" />
    </div>

    {/* insight kartları */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
      {[...Array(4)].map((_, i) => (
        <Skel key={i} w="100%" h="82px" r="14px" />
      ))}
    </div>

    {/* grafik kartı */}
    <Skel w="100%" h="280px" r="20px" />
  </div>
);

/* ══════════════════════════════════════════════
   4. KARGO PANELİ — arama + sevkiyat listesi
══════════════════════════════════════════════ */
export const ShippingSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {/* arama kartı */}
    <SkelCard>
      <Skel w="160px" h="16px" />
      <Skel w="100%" h="44px" r="12px" />
    </SkelCard>

    {/* sevkiyat satırları */}
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          background: 'var(--surface)',
        }}
      >
        <Skel w="38px" h="38px" r="10px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skel w="45%" h="13px" />
          <Skel w="28%" h="11px" />
        </div>
        <Skel w="84px" h="26px" r="999px" />
      </div>
    ))}
  </div>
);
