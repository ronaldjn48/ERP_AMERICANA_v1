import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { clearSave } from './storage';
import './styles.css';
import './erp.css';

/** Evita la pantalla en blanco: si algo falla, ofrece recuperar la aplicación. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error en el simulador', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="container" style={{ padding: '3rem 1rem' }}>
        <div className="card">
          <h1>Algo salió mal</h1>
          <p>El sistema encontró un error inesperado. Recarga la página: tu práctica sigue guardada en este navegador.</p>
          <p className="muted small">Detalle técnico: {this.state.error.message}</p>
          <div className="row">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              Recargar
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                clearSave();
                try {
                  window.localStorage.removeItem('erp-americana:erp:v1');
                  window.localStorage.removeItem('erp-americana:ruta:v1');
                } catch {
                  /* sin acción */
                }
                window.location.reload();
              }}
            >
              Borrar los datos y recargar
            </button>
          </div>
        </div>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
