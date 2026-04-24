import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { getAvatarColor, getInitials } from '../utils/helpers';

const Profile = () => {
  const { user, organization, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteResult, setInviteResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    authAPI.getMembers().then(res => {
      setMembers(res.data.members || []);
      setInvites(res.data.invites || []);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({ name });
      setUser(res.data.user);
    } catch (err) { alert('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteResult(null);
    try {
      const res = await authAPI.inviteMember({ email: inviteEmail, role: inviteRole });
      setInviteResult(res.data);
      setInviteEmail('');
      // Refresh members list
      authAPI.getMembers().then(r => {
        setMembers(r.data.members || []);
        setInvites(r.data.invites || []);
      }).catch(() => {});
    } catch (err) { alert(err.response?.data?.message || 'Failed to invite'); }
    finally { setInviteLoading(false); }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareViaWhatsApp = (link, email) => {
    const orgName = organization?.name || 'our team';
    const message = `Hey! 👋\n\nI'm inviting you to join *${orgName}* on TaskFlow AI — our project management platform.\n\nClick this link to join:\n${link}\n\n${email ? `This invite is for: ${email}` : ''}\nThe link expires in 7 days.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = (link, email) => {
    const orgName = organization?.name || 'Our Team';
    const subject = encodeURIComponent(`You're invited to join ${orgName} on TaskFlow AI`);
    const body = encodeURIComponent(`Hi,\n\nI'm inviting you to join ${orgName} on TaskFlow AI.\n\nClick here to accept the invitation:\n${link}\n\nThis link expires in 7 days.\n\nSee you there! 🚀`);
    window.open(`mailto:${email || ''}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Profile */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-surface-800 mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="avatar avatar-lg" style={{ background: getAvatarColor(user?.name) }}>{getInitials(user?.name)}</div>
          <div>
            <p className="font-semibold text-surface-800">{user?.name}</p>
            <p className="text-sm text-surface-400">{user?.email}</p>
            <p className="text-xs text-surface-400 mt-1">Role: {user?.role || 'member'}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Display Name</label>
            <input className="input max-w-sm" value={name} onChange={e => setName(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>

      {/* Organization */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-surface-800 mb-4">Organization</h2>
        {organization ? (
          <div>
            <p className="text-surface-800 font-medium">{organization.name}</p>
            <p className="text-sm text-surface-400">Slug: {organization.slug}</p>
            <p className="text-sm text-surface-400 mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        ) : (
          <p className="text-sm text-surface-400">No organization</p>
        )}
      </div>

      {/* Team Members */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-surface-800 mb-4">Team Members</h2>
        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200">
              <div className="flex items-center gap-3">
                <div className="avatar avatar-sm" style={{ background: getAvatarColor(m.user?.name) }}>{getInitials(m.user?.name)}</div>
                <div>
                  <p className="text-sm font-medium text-surface-800">{m.user?.name}</p>
                  <p className="text-xs text-surface-400">{m.user?.email}</p>
                </div>
              </div>
              <span className={`badge badge-sm ${m.role === 'admin' ? 'bg-primary-50 text-primary-600 border border-primary-200' : m.role === 'guest' ? 'bg-amber-50 text-warning border border-amber-200' : 'bg-surface-100 text-surface-500 border border-surface-200'}`}>{m.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-surface-800 mb-2">Invite Member</h2>
        <p className="text-sm text-surface-400 mb-4">Generate an invite link and share it via WhatsApp, Email, or copy it directly.</p>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <input className="input flex-1 min-w-[200px] max-w-xs" type="email" placeholder="teammate@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
            <select className="select max-w-[130px]" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
              <option value="member">👤 Member</option>
              <option value="admin">👑 Admin</option>
              <option value="guest">👁 Guest</option>
            </select>
            <button type="submit" className="btn btn-primary" disabled={inviteLoading}>
              {inviteLoading ? (
                <><span className="loader" style={{width:'14px',height:'14px',borderWidth:'2px'}}></span> Generating...</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Generate Invite
                </>
              )}
            </button>
          </div>
        </form>

        {/* Invite Result */}
        {inviteResult && (
          <div className="mt-4 p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-3 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-success text-lg">✓</span>
              <span className="text-sm font-medium text-surface-800">Invite link generated for {inviteResult.organization?.invites?.slice(-1)[0]?.email || 'your teammate'}</span>
            </div>

            {/* Invite Link */}
            <div className="flex items-center gap-2 bg-surface-100 rounded-lg p-3 border border-surface-200">
              <input readOnly className="flex-1 bg-transparent text-xs text-surface-500 outline-none font-mono min-w-0" value={inviteResult.inviteLink} />
              <button onClick={() => copyToClipboard(inviteResult.inviteLink)} className="btn btn-sm btn-secondary shrink-0" style={{minWidth:'80px'}}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>

            {/* Share Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => shareViaWhatsApp(inviteResult.inviteLink, inviteEmail)} className="btn btn-sm" style={{ background: '#25D366', color: 'white' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share via WhatsApp
              </button>
              <button onClick={() => shareViaEmail(inviteResult.inviteLink, inviteEmail)} className="btn btn-sm btn-secondary">
                ✉️ Share via Email
              </button>
            </div>

            <p className="text-xs text-surface-400 mt-1">⏳ This link expires in 7 days. The person needs to sign up first, then use this link to join.</p>
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-surface-800 mb-4">Pending Invites</h2>
          <div className="space-y-3">
            {invites.map((inv, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200">
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-sm" style={{ background: '#9CA3AF' }}>✉️</div>
                  <div>
                    <p className="text-sm font-medium text-surface-800">{inv.email}</p>
                    <p className="text-xs text-surface-400">Invited as {inv.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge badge-sm ${inv.status === 'accepted' ? 'bg-green-50 text-success border border-green-200' : 'bg-amber-50 text-warning border border-amber-200'}`}>{inv.status}</span>
                  {inv.status === 'pending' && inv.token && (
                    <div className="flex gap-1">
                      <button onClick={() => {
                        const link = `${window.location.origin}/invite/${inv.token}`;
                        copyToClipboard(link);
                      }} className="btn btn-sm btn-ghost" title="Copy invite link">📋</button>
                      <button onClick={() => {
                        const link = `${window.location.origin}/invite/${inv.token}`;
                        shareViaWhatsApp(link, inv.email);
                      }} className="btn btn-sm btn-ghost" title="Share via WhatsApp" style={{color: '#25D366'}}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
