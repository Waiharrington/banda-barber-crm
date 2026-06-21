import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { publicService } from '../services/publicService';

export default function Services() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const services = await publicService.getServices();
        // Group by category
        const grouped = {};
        services.forEach(service => {
          const cat = service.category || 'Servicios';
          if (!grouped[cat]) grouped[cat] = { name: cat, icon: getCategoryIcon(cat), services: [] };
          grouped[cat].services.push({
            id: service.id,
            name: service.name,
            price: `$${service.price}`,
            duration: service.duration ? `${service.duration} min` : null,
          });
        });
        setCategories(Object.values(grouped));
      } catch (e) {
        console.error('Error loading services:', e);
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  function getCategoryIcon(category) {
    const icons = {
      'Barbería': '✂️',
      'Tatuajes': '💉',
      'Tratamientos': '🧴',
      'Productos': '📦',
    };
    return icons[category] || '✂️';
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <section style={{ padding: '80px 16px 40px', textAlign: 'center' }}>
        <h1 className="section-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}>
          Nuestros <span className="text-gold">Servicios</span>
        </h1>
        <p className="section-subtitle">Elige el servicio perfecto para ti</p>
      </section>

      {/* Services Grid */}
      <section style={{ padding: '0 16px 80px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>Cargando servicios...</div>
          ) : categories.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>No hay servicios disponibles</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
              {categories.map((category, i) => (
                <div key={i} className="glass-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: 28 }}>{category.icon}</span>
                    <h2 className="text-gold" style={{ fontSize: 22, fontWeight: 800 }}>{category.name}</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {category.services.map((service) => (
                      <div
                        key={service.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(7, 7, 10, 0.6)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px 16px',
                          border: '1px solid transparent',
                          transition: 'border-color 0.2s',
                        }}
                      >
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: 15 }}>{service.name}</h3>
                          {service.duration && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>
                              <Clock size={12} />
                              {service.duration}
                            </div>
                          )}
                        </div>
                        <span className="text-gold" style={{ fontSize: 18, fontWeight: 900 }}>{service.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Note */}
          <div className="glass-card" style={{ marginTop: 24, textAlign: 'center', padding: '20px 24px', borderColor: 'var(--border-color)' }}>
            <p style={{ color: 'var(--champagne)', fontWeight: 700, marginBottom: 4 }}>💡 ¿Tatuaje?</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Los precios de tatuajes son por cotización. Contacta al tatuador para presupuesto.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
