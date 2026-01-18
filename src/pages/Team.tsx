import { useEffect, useState } from 'react';
import { Plus, Mail, CheckCircle, Clock, KeyRound, Copy, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile as ProfileRow } from '../lib/types';
import TableSkeleton from '../components/TableSkeleton';

export default function Team() {
  const { user, profile: myProfile } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [isInviting, setIsInviting] = useState(false);
  const [resettingProfile, setResettingProfile] = useState<ProfileRow | null>(null);
  const [resetLink, setResetLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [invitedEmail, setInvitedEmail] = useState('');

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
    setInviteLink('');
    setInvitedEmail('');

    try {
      const redirectTo = `${window.location.origin}/update-password`;
      const { data, error } = await supabase.functions.invoke('admin-invite-user', {
        body: {
          email: inviteEmail,
          role: inviteRole,
          fullName: 'Invited Member',
          redirectTo,
        },
      });

      if (error) throw error;

      const response = data as { actionLink?: string; userId?: string; error?: string } | null;
      if (response?.error) throw new Error(response.error);

      const actionLink = response?.actionLink;
      if (actionLink) {
        setInviteLink(actionLink);
        setInvitedEmail(inviteEmail);
      }

      toast.success(`User ${inviteEmail} created successfully`);
      setInviteEmail('');
      fetchProfiles();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to invite user';
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDeleteUser = async (profile: ProfileRow) => {
    if (!confirm(`Are you sure you want to delete ${profile.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      // 1. Delete from public.profiles (will cascade if configured, or fail if restricted)
      // Since we need to delete from auth.users, we should use an RPC or Edge Function.
      // However, for rows that are just "invited" (no auth user yet), we can just delete from profiles.

      if (profile.status === 'invited') {
        const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
        if (error) throw error;
        toast.success('Invitation cancelled');
      } else {
        // Use the Edge Function to delete from auth.users
        const { error } = await supabase.functions.invoke('admin-delete-user', {
          body: { userId: profile.id },
        });
        
        if (error) throw error;
        toast.success('User deleted successfully');
      }

      setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
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

      {/* Invite Form - Only visible to admin and super_admin */}
      {(myProfile?.role === 'admin' || myProfile?.role === 'super_admin') && (
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
      )}

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
                  <select
                    value={profile.role}
                    disabled={myProfile?.role !== 'super_admin'}
                    onChange={async (e) => {
                      const newRole = e.target.value as 'user' | 'admin' | 'super_admin';
                      const oldRole = profile.role;

                      if (newRole === oldRole) return;

                      if (profile.id === user?.id) {
                        toast.error('You cannot change your own role.');
                        return;
                      }

                      // Optimistic update
                      setProfiles((prev) =>
                        prev.map((p) =>
                          p.id === profile.id ? { ...p, role: newRole } : p,
                        ),
                      );

                      try {
                        const { error } = await supabase
                          .from('profiles')
                          .update({ role: newRole })
                          .eq('id', profile.id);

                        if (error) throw error;
                        toast.success(`Role updated to ${newRole}`);
                      } catch (error) {
                        console.error('Error updating role:', error);
                        toast.error('Failed to update role');
                        // Revert
                        setProfiles((prev) =>
                          prev.map((p) =>
                            p.id === profile.id ? { ...p, role: oldRole } : p,
                          ),
                        );
                      }
                    }}
                    className="block w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-xs sm:leading-6"
                  >
                    <option value="user">USER</option>
                    <option value="admin">ADMIN</option>
                    {myProfile?.role === 'super_admin' && <option value="super_admin">SUPER ADMIN</option>}
                  </select>
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
                  {myProfile?.role === 'super_admin' && (
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
                  )}
                  {myProfile?.role === 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(profile)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 ml-2"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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

      {inviteLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Invite Link Generated</h2>
                <p className="text-sm text-slate-600 mt-1">{invitedEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInviteLink('');
                  setInvitedEmail('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Share this link with the user. They can use it to set their password and access the system. The link expires in 24 hours.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">Invite link</p>
                <p className="text-sm text-slate-900 break-all font-mono">{inviteLink}</p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setInviteLink('');
                    setInvitedEmail('');
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-colors"
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
