import { useEffect, useState } from 'react';
import { Plus, Mail, Shield, User, CheckCircle, Clock, KeyRound, Copy, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Profile as ProfileRow } from '../lib/types';
import TableSkeleton from '../components/TableSkeleton';

export default function Team() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [isInviting, setIsInviting] = useState(false);
  const [resettingProfile, setResettingProfile] = useState<ProfileRow | null>(null);
  const [resetLink, setResetLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true });

      if (error) {
        console.error('Failed to load team members:', error);
        throw error;
      }
      const collapsed = collapseProfiles(data || []);
      setProfiles(collapsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load team members';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      // Check if user already exists
      const { data: existingRows, error: existingError } = await supabase
        .from('profiles')
        .select('id, status')
        .eq('email', inviteEmail)
        .limit(1);

      if (existingError) throw existingError;

      if (existingRows && existingRows.length > 0) {
        toast.error('User already exists in the system');
        return;
      }

      // Create "Invited" Profile
      // Note: We generate a random ID because they don't have a Supabase Auth ID yet.
      // When they sign up, we will migrate this row or update it.
      // BETTER FYP TRICK: We just insert a row. When they sign up, the trigger will fail if we don't handle it.
      // SIMPLER APPROACH: Just let them sign up if this row exists.

      const { error } = await supabase.from('profiles').insert({
        id: crypto.randomUUID(), // Placeholder ID
        email: inviteEmail,
        role: inviteRole,
        status: 'invited',
        full_name: 'Invited Member'
      });

      if (error) throw error;

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      fetchProfiles();
    } catch (error) {
      console.error(error);
      toast.error('Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const collapseProfiles = (list: ProfileRow[]) => {
    const byEmail = new Map<string, ProfileRow>();

    list.forEach((profile) => {
      const key = profile.email.toLowerCase();
      const existing = byEmail.get(key);

      if (!existing) {
        byEmail.set(key, profile);
        return;
      }

      // Prefer active over invited; otherwise keep the first seen (already email-sorted)
      const existingStatus = existing.status ?? 'active';
      const candidateStatus = profile.status ?? 'active';
      if (existingStatus !== 'active' && candidateStatus === 'active') {
        byEmail.set(key, profile);
      }
    });

    return Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email));
  };

  const handleGenerateResetLink = async (profile: ProfileRow) => {
    setIsGeneratingLink(true);
    setResettingProfile(profile);
    setResetLink('');

    try {
      const redirectTo = `${window.location.origin}/update-password`;
      const { data, error } = await supabase.functions.invoke('admin-generate-reset-link', {
        body: { email: profile.email, redirectTo },
      });

      if (error) throw error;
      const actionLink = (data as { actionLink?: string } | null)?.actionLink;
      if (!actionLink) throw new Error('No reset link returned');
      setResetLink(actionLink);
      toast.success('Reset link generated');
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to generate reset link';
      toast.error(message);
      setResettingProfile(null);
      setResetLink('');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyResetLink = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  if (loading) return <div className="p-8"><TableSkeleton rows={3} /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>

      {/* Invite Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          Invite New Member
        </h2>
        <form onSubmit={handleInvite} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@ssgms.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value === 'admin' ? 'admin' : 'user')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900"
            >
              <option value="user">Staff (User)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isInviting}
            className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isInviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      </div>

      {/* Team List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {profiles.map((profile) => (
              <tr key={profile.id}>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{profile.full_name || 'No Name'}</div>
                  <div className="text-slate-500 text-sm">{profile.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    profile.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {profile.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {profile.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    profile.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {(profile.status ?? 'active') === 'active' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {(profile.status ?? 'active').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleGenerateResetLink(profile)}
                    disabled={(profile.status ?? 'active') !== 'active' || isGeneratingLink}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={(profile.status ?? 'active') !== 'active' ? 'User must be active to reset password' : 'Generate a password reset link'}
                  >
                    <KeyRound className="w-4 h-4" />
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resettingProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Password Reset Link</h2>
                <p className="text-sm text-slate-600 mt-1">{resettingProfile.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResettingProfile(null);
                  setResetLink('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Share this link with the user through your internal channel. It lets them set a new password without needing email delivery.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">Reset link</p>
                <p className="text-sm text-slate-900 break-all">{resetLink || 'Generating...'}</p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResettingProfile(null);
                    setResetLink('');
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCopyResetLink}
                  disabled={!resetLink}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
