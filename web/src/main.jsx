import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("UI Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#020617', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '16px', maxWidth: '500px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>Something went wrong</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={this.handleReset}
              style={{ padding: '10px 20px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
