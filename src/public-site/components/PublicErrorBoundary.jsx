import React from 'react';

// Evita que un error de render (p. ej. en el flujo de reservas) deje la página en
// negro: muestra un fallback con opción de recargar. También registra el
// componentStack para diagnóstico.
export default class PublicErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[PublicErrorBoundary]', error?.message, '\ncomponentStack:', info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#050506', color: '#CBB79A', textAlign: 'center', padding: 24 }}>
          <h2 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>Algo salió mal</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, maxWidth: 420, margin: 0 }}>
            Ocurrió un error al cargar esta página. Recárgala para intentar de nuevo.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 8, background: '#CBB79A', color: '#000', fontWeight: 800, padding: '12px 24px', borderRadius: 999, border: 'none', cursor: 'pointer' }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
