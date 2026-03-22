'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/globals.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      // Redirect based on role (simple routing for now)
      window.location.href = '/dashboard';
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-container auth-container">
      <div className="login-card">
        <div className="login-header">
          <h2>QuoteGuru</h2>
          <p>Dealership Portal Login</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-control"
              placeholder="name@dealership.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-control"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
      
      <style jsx>{`
        .auth-container {
          background: linear-gradient(135deg, var(--brand-blue-dark) 0%, var(--brand-blue) 100%);
        }
        
        .login-card {
          background: white;
          padding: 2.5rem;
          border-radius: var(--radius-xl);
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          width: 100%;
          max-width: 400px;
          animation: slideUp 0.5s ease-out;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-header h2 {
          color: var(--brand-blue);
          font-weight: 800;
          font-size: 1.875rem;
          margin-bottom: 0.5rem;
        }

        .login-header p {
          color: var(--text-secondary);
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .form-control {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-control:focus {
          outline: none;
          border-color: var(--brand-blue-light);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .btn-block {
          width: 100%;
          padding: 0.875rem;
          font-size: 1rem;
          font-weight: 600;
        }

        .error-message {
          background-color: #fee2e2;
          color: var(--danger);
          padding: 0.75rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          text-align: center;
          border: 1px solid #fecaca;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
