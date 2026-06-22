import { useState, useRef, useEffect } from 'react';
import { Gift, Sparkles, Download, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { publicService } from '../services/publicService';

const FALLBACK_PRIZES = [
  { name: '10% Descuento', weight: 80, color: '#fbbf24' },
  { name: 'Lavado Premium', weight: 15, color: '#007aff' },
  { name: 'Corte Deluxe Gratis', weight: 5, color: '#32d74b' }
];

const PRESET_COLORS = ['#fbbf24', '#007aff', '#32d74b', '#ff453a', '#bf5af2', '#ff9f0a', '#64d2ff'];

export default function PrizeWheel({ clientId, onWin }) {
  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [dbPrizes, setDbPrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const wheelRef = useRef(null);

  useEffect(() => {
    publicService.getRoulettePrizes().then(data => {
      if (data && data.length > 0) {
        setDbPrizes(data.map((p, i) => ({
          name: p.name.replace('ROULETTE_PRIZE:', ''),
          weight: 10, // Equal weight for dynamic prizes
          color: PRESET_COLORS[i % PRESET_COLORS.length]
        })));
      } else {
        setDbPrizes(FALLBACK_PRIZES);
      }
      setLoading(false);
    });
  }, []);

  const getWeightedPrizeIndex = () => {
    const totalWeight = dbPrizes.reduce((acc, p) => acc + p.weight, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < dbPrizes.length; i++) {
      r -= dbPrizes[i].weight;
      if (r <= 0) return i;
    }
    return 0;
  };

  const handleSpin = async () => {
    if (spinning || wonPrize || dbPrizes.length === 0) return;

    setSpinning(true);
    const winIndex = getWeightedPrizeIndex();
    const prize = dbPrizes[winIndex];

    // Calculate rotation: 5 full rotations + segment rotation
    const segmentAngle = 360 / dbPrizes.length;
    // We want the pointer to land precisely in the middle of the segment
    // Because CSS conic-gradient starts from the top (0deg)
    const targetAngle = segmentAngle * winIndex + segmentAngle / 2;
    // the pointer is at the top, so we rotate counter-clockwise to bring target to top
    const finalRotation = 360 * 5 - targetAngle;

    if (wheelRef.current) {
      wheelRef.current.style.transition = 'transform 4s cubic-bezier(0.1, 0.8, 0.1, 1)';
      wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;
    }

    setTimeout(async () => {
      setSpinning(false);
      setWonPrize(prize);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#ffffff', '#000000']
      });
      try {
        const couponData = await publicService.generateCoupon(clientId, prize.name);
        setCoupon(couponData);
        if (onWin) onWin(prize.name);
      } catch (e) {
        console.error('Error generating coupon:', e);
      }
    }, 4100);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando premios...</div>;
  }

  const segmentAngle = 360 / dbPrizes.length;
  const gradientStops = dbPrizes.map((p, i) => `${p.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`).join(', ');
  const wheelBackground = `conic-gradient(${gradientStops})`;

  return (
    <div className="glass-card" style={{ padding: '24px', textAlign: 'center', margin: '20px 0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '24px', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
        <Sparkles size={20} color="var(--gold-primary)" />
        <h2 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>¡Premio Especial!</h2>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Gira la Ruleta Panda y descubre tu regalo.
      </p>

      {!wonPrize ? (
        <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto 24px' }}>
          {/* Wheel Marker */}
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: 'calc(50% - 10px)',
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '20px solid var(--gold-primary)',
            zIndex: 10
          }} />

          {/* Wheel Container */}
          <div 
            ref={wheelRef}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '6px solid var(--border-color)',
              background: wheelBackground,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
            }}
          >
            {/* Sector Texts */}
            {dbPrizes.map((p, i) => {
              const rot = segmentAngle * i + segmentAngle / 2;
              return (
                <div 
                  key={i} 
                  style={{ 
                    position: 'absolute', 
                    transform: `rotate(${rot}deg) translateY(-60px)`, 
                    top: '50%', 
                    left: '50%', 
                    transformOrigin: '0 0', 
                    color: 'white', 
                    fontWeight: '900', 
                    fontSize: '10px', 
                    whiteSpace: 'nowrap',
                    textShadow: '0px 1px 3px rgba(0,0,0,0.8)'
                  }}
                >
                  {p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name}
                </div>
              );
            })}
          </div>

          {/* Center Button */}
          <button 
            onClick={handleSpin}
            disabled={spinning}
            style={{
              position: 'absolute',
              top: 'calc(50% - 28px)',
              left: 'calc(50% - 28px)',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: spinning ? '#3a3a3c' : 'var(--gold-gradient)',
              border: '4px solid #1c1c1e',
              color: spinning ? '#a1a1a6' : '#000',
              fontWeight: '900',
              fontSize: '11px',
              cursor: spinning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
              zIndex: 5
            }}
          >
            {spinning ? <RefreshCw className="animate-spin" size={16} /> : 'GIRAR'}
          </button>
        </div>
      ) : (
        <div className="animate-scale-in" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-block', maxWidth: '320px', margin: '0 auto 20px', width: '100%' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ fontWeight: '900', fontSize: '16px', color: 'var(--gold-primary)', marginBottom: '8px' }}>¡FELICIDADES!</h3>
          <p style={{ fontSize: '14px', color: 'white', fontWeight: '800', marginBottom: '16px' }}>Ganaste: {wonPrize.name}</p>
          
          {coupon && (
            <div style={{ padding: '16px', background: 'black', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.3)', marginBottom: '16px', position: 'relative' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Código de Cupón</div>
              <div style={{ fontSize: '18px', fontWeight: '950', color: 'var(--gold-primary)', marginTop: '4px', letterSpacing: '1px' }}>
                {coupon.id?.substring(0, 8).toUpperCase()}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '8px' }}>Presenta este código en caja para canjear tu premio.</div>
            </div>
          )}

          <button 
            onClick={() => {
              const link = document.createElement('a');
              link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(`PANDA BARBER STUDIO - CUPÓN DE PREMIO\n\nPremio: ${wonPrize.name}\nCódigo: ${coupon?.id?.substring(0, 8).toUpperCase()}\nFecha: ${new Date().toLocaleDateString()}`);
              link.download = `panda-cupon-${coupon?.id?.substring(0, 8)}.txt`;
              link.click();
            }}
            className="btn-gold" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '10px', fontSize: '12px' }}
          >
            <Download size={14} /> Guardar Cupón
          </button>
        </div>
      )}
    </div>
  );
}
