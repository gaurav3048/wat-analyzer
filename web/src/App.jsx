import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TestPage from './pages/TestPage';
import ResultsPage from './pages/ResultsPage';
import SessionsPage from './pages/SessionsPage';
import MovingShapes from './components/MovingShapes';

// Auth Context
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wat_token');
    const stored = localStorage.getItem('wat_user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('wat_token', token);
    localStorage.setItem('wat_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('wat_token');
    localStorage.removeItem('wat_user');
    setUser(null);
  };

  if (loading) return <LoadingScreen />;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div className="min-h-screen bg-surface-950 relative">
        <MovingShapes />
        {user && <NavBar />}
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/test/:module" element={user ? <TestPage /> : <Navigate to="/login" />} />
          <Route path="/results/:sessionId" element={user ? <ResultsPage /> : <Navigate to="/login" />} />
          <Route path="/sessions" element={user ? <SessionsPage /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </AuthContext.Provider>
  );
}

function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/', label: 'Practice Modules', icon: '🎯' },
    { to: '/sessions', label: 'Session History', icon: '📋' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-white/10 border-t-0 border-x-0 rounded-none backdrop-blur-md bg-surface-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-primary-500/20">
              W
            </div>
            <span className="font-display font-bold text-lg text-white">WAT Analyzer</span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`nav-link flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  location.pathname === l.to
                    ? 'bg-primary-500/20 text-primary-300 font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{l.icon}</span>
                <span>{l.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-white/50 hidden sm:block">Hi, {user?.username}</span>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Logout
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-white/70 hover:text-white p-2"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 p-3 space-y-1 animate-slide-up bg-surface-900">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                location.pathname === l.to
                  ? 'bg-primary-500/20 text-primary-300 font-medium'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 animate-pulse flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-primary-500/20">
          W
        </div>
        <p className="text-white/50 animate-pulse text-sm">Loading WAT Analyzer...</p>
      </div>
    </div>
  );
}

export default App;
