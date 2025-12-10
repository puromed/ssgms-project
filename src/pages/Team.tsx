import { useEffect, useState } from 'react';
import { Plus, Mail, Shield, User, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import TableSkeleton from '../components/TableSkeleton';

type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'invited';
  full_name?: string;
  created_at: string;
};

export default function Team() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [isInviting, setIsInviting] = useState(false);

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
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const collapseProfiles = (list: Profile[]) => {
    const byEmail = new Map<string, Profile>();

    list.forEach((profile) => {
      const key = profile.email.toLowerCase();
      const existing = byEmail.get(key);

      if (!existing) {
        byEmail.set(key, profile);
        return;
      }

      // Prefer active over invited; otherwise keep the first seen (already email-sorted)
      if (existing.status !== 'active' && profile.status === 'active') {
        byEmail.set(key, profile);
      }
    });

    return Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email));
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
              onChange={(e) => setInviteRole(e.target.value as any)}
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
                    {profile.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {profile.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}