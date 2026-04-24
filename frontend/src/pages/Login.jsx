import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const { login, error } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get('invite');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // If there's an invite token, redirect to accept page
      if (inviteToken) {
        navigate(`/invite/${inviteToken}`);
      } else {
        navigate('/');
      }
    }
    catch (err) {}
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="text-center mb-8">
          <div className="h-20 flex items-center justify-center mx-auto mb-4 bg-transparent">
            <img src="/logo.png" alt="TaskFlow AI" className="h-full w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Welcome back</h1>
          <p className="text-surface-400 mt-1 text-sm">Sign in to your TaskFlow AI workspace</p>
        </div>

        {/* Invite banner */}
        {inviteToken && (
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 mb-4 text-center">
            <p className="text-sm text-primary-600">Sign in to accept your team invitation</p>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-danger text-sm rounded-xl p-3 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
            <input type="email" className="input" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Password</label>
            <input type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="loader w-4 h-4 border-2"></span> : 'Sign In'}
          </button>
        </form>


        <p className="text-center text-sm text-surface-400 mt-6">
          Don&apos;t have an account? <Link to={`/signup${inviteToken ? `?invite=${inviteToken}` : ''}`} className="text-primary-600 hover:text-primary-700 font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
