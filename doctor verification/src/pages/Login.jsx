import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

const Login = () => {
  const [streamId, setStreamId] = useState('');
  const [password, setPassword] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!streamId || !password || !doctorName) {
      setError('All fields are required');
      return;
    }

    // Simulate API call
    // Note: Our form has 'streamId' but we're now sending it as the 'doctorId' argument
    const result = await login(streamId, password, doctorName);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid Stream ID or Password');
    }
  };

  return (
    <div className="login-container">
      <div className="login-visual">
        <div className="visual-content fade-in">
          <Activity size={64} className="login-icon" />
          <h1>Doctor Verification Portal</h1>
          <p>Secure access for specialized AI diagnosis review and confirmation.</p>
        </div>
      </div>

      <div className="login-form-wrapper">
        <div className="login-card fade-in">
          <div className="mobile-header">
            <Activity size={32} className="login-icon-mobile" />
            <h2>DocVerify AI</h2>
          </div>

          <h2>Secure Login</h2>
          <p className="login-subtitle">Enter your credentials to access the portal</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="doctorName">Doctor Name</label>
              <input
                id="doctorName"
                type="text"
                className="form-input"
                placeholder="e.g. Dr. Sarah Chen"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="streamId">Stream ID</label>
              <input
                id="streamId"
                type="text"
                className="form-input"
                placeholder="e.g. Cardiology"
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary login-btn mt-2">
              Login to Portal
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .login-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg);
        }

        .login-visual {
          flex: 1;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--sp-6);
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .login-visual::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z' fill='rgba(255,255,255,0.05)' fill-rule='evenodd'/%3E%3C/svg%3E");
        }

        .visual-content {
          position: relative;
          z-index: 10;
          max-width: 480px;
        }

        .login-icon {
          margin-bottom: var(--sp-3);
          opacity: 0.9;
        }

        .visual-content h1 {
          font-size: 2.5rem;
          margin-bottom: var(--sp-2);
          font-weight: 700;
          line-height: 1.2;
        }

        .visual-content p {
          font-size: 1.125rem;
          opacity: 0.9;
          line-height: 1.6;
        }

        .login-form-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--sp-4);
          background-color: var(--surface);
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: var(--sp-5);
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: 0 8px 32px rgba(30, 136, 229, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(10px);
        }

        .mobile-header {
          display: none;
          text-align: center;
          margin-bottom: var(--sp-4);
          color: var(--primary);
        }

        .login-icon-mobile {
          margin-bottom: var(--sp-1);
        }

        .login-card h2 {
          font-size: 1.75rem;
          color: var(--text-main);
          margin-bottom: var(--sp-1);
          font-weight: 700;
        }

        .login-subtitle {
          color: var(--text-muted);
          margin-bottom: var(--sp-4);
        }

        .error-message {
          background-color: rgba(229, 57, 53, 0.1);
          color: var(--danger);
          padding: var(--sp-2);
          border-radius: var(--base-radius);
          margin-bottom: var(--sp-3);
          font-size: 0.875rem;
          font-weight: 500;
          border-left: 4px solid var(--danger);
        }

        .login-btn {
          width: 100%;
          padding: 12px;
          font-size: 1rem;
          margin-top: var(--sp-2);
        }

        @media (max-width: 900px) {
          .login-visual {
            display: none;
          }
          .login-form-wrapper {
            background-color: var(--bg);
            padding: var(--sp-2);
          }
          .mobile-header {
            display: block;
          }
          .login-card {
            padding: var(--sp-4);
            box-shadow: var(--shadow-lg);
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
