import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';

const Signup = () => {
  const { signup, error } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get('invite');
  const inviteEmail = searchParams.get('email');

  const [form, setForm] = useState({
    name: '',
    email: inviteEmail || '',
    password: '',
    organizationName: ''
  });
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);

  // If there's an invite token, fetch the org info
  useEffect(() => {
    if (inviteToken) {
      authAPI.getInviteInfo(inviteToken)
        .then(res => setInviteInfo(res.data))
        .catch(() => {});
    }
  }, [inviteToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // If joining via invite, don't create a new org
      const orgName = inviteToken ? '' : form.organizationName;
      await signup(form.name, form.email, form.password, orgName);

      // If invite token, auto-join the org after signup
      if (inviteToken) {
        try {
          await authAPI.joinOrganization(inviteToken);
          navigate('/');
        } catch (joinErr) {
          // Still navigate — they're signed up, just need to use invite link again
          navigate(`/invite/${inviteToken}`);
        }
      }
    } catch (err) {}
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="text-center mb-8">
          <div className="h-20 flex items-center justify-center mx-auto mb-4 bg-transparent">
            <img src="/logo.png" alt="TaskFlow AI" className="h-full w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900">
            {inviteInfo ? `Join ${inviteInfo.organizationName}` : 'Create your workspace'}
          </h1>
          <p className="text-surface-400 mt-1 text-sm">Get started with TaskFlow AI</p>
        </div>

        {/* Invite banner */}
        {inviteInfo && (
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 mb-4 text-center">
            <p className="text-sm text-primary-600">
              🎉 You've been invited to join <span className="font-semibold">{inviteInfo.organizationName}</span> as {inviteInfo.role}
            </p>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-danger text-sm rounded-xl p-3 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Full Name</label>
            <input className="input" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
            <input type="email" className="input" placeholder="you@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Password</label>
            <input type="password" className="input" placeholder="Min 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          {/* Only show org field if NOT joining via invite */}
          {!inviteToken && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Organization Name</label>
              <input className="input" placeholder="Your team or company" value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} required />
            </div>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="loader w-4 h-4 border-2"></span> : inviteToken ? 'Create Account & Join' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-surface-400 mt-6">
          Already have an account? <Link to={`/login${inviteToken ? `?invite=${inviteToken}` : ''}`} className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
