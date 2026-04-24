import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const InviteAccept = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inviteInfo, setInviteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    authAPI.getInviteInfo(token)
      .then(res => { setInviteInfo(res.data); setLoading(false); })
      .catch(err => { setError(err.response?.data?.message || 'Invalid or expired invite link'); setLoading(false); });
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      await authAPI.joinOrganization(token);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.needsSignup) {
        setError('You need to sign up first before accepting this invite.');
      } else {
        setError(data?.message || 'Failed to join organization');
      }
    } finally { setJoining(false); }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in text-center">
        <div className="h-20 flex items-center justify-center mx-auto mb-4 bg-transparent">
          <img src="/logo.png" alt="TaskFlow AI" className="h-full w-auto object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-1">
          TaskFlow <span className="text-primary-600">AI</span>
        </h1>

        {error && !inviteInfo ? (
          /* Invalid/expired token */
          <div className="space-y-4 mt-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-danger font-medium">❌ {error}</p>
            </div>
            <p className="text-sm text-surface-400">This invite link may be expired or invalid.</p>
            <Link to="/login" className="btn btn-primary w-full">Go to Login</Link>
          </div>
        ) : inviteInfo && !success ? (
          /* Valid invite */
          <div className="space-y-4 mt-6">
            <p className="text-surface-400">You've been invited to join</p>
            <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
              <p className="text-xl font-bold text-surface-900">{inviteInfo.organizationName}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-sm text-surface-400">as</span>
                <span className={`badge ${inviteInfo.role === 'admin' ? 'bg-primary-50 text-primary-600 border border-primary-200' : inviteInfo.role === 'guest' ? 'bg-amber-50 text-warning border border-amber-200' : 'bg-surface-100 text-surface-500 border border-surface-200'}`}>
                  {inviteInfo.role === 'admin' ? '👑' : inviteInfo.role === 'guest' ? '👁' : '👤'} {inviteInfo.role}
                </span>
              </div>
              {inviteInfo.email && (
                <p className="text-xs text-surface-400 mt-2">Invited: {inviteInfo.email}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                <p className="text-danger">{error}</p>
              </div>
            )}

            {user ? (
              /* Logged in — can join directly */
              <div className="space-y-3">
                <p className="text-sm text-surface-400">Logged in as <span className="text-surface-800 font-medium">{user.name}</span></p>
                <button onClick={handleJoin} className="btn btn-primary w-full" disabled={joining}>
                  {joining ? <><span className="loader" style={{width:'14px',height:'14px',borderWidth:'2px'}}></span> Joining...</> : '✓ Accept & Join Organization'}
                </button>
              </div>
            ) : (
              /* Not logged in — need to sign up or log in first */
              <div className="space-y-3">
                <p className="text-sm text-surface-400">You need an account to accept this invite.</p>
                <Link to={`/signup?invite=${token}&email=${encodeURIComponent(inviteInfo.email || '')}`} className="btn btn-primary w-full">
                  Create Account & Join
                </Link>
                <Link to={`/login?invite=${token}`} className="btn btn-secondary w-full">
                  Already have an account? Sign In
                </Link>
              </div>
            )}
          </div>
        ) : success ? (
          /* Successfully joined */
          <div className="space-y-4 mt-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-success text-lg font-semibold">🎉 Welcome aboard!</p>
              <p className="text-success/80 text-sm mt-1">You've joined {inviteInfo?.organizationName}</p>
            </div>
            <p className="text-sm text-surface-400">Redirecting to dashboard...</p>
            <div className="loader mx-auto"></div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InviteAccept;
