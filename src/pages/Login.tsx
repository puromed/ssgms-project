import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await handleRegister();
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // 1. Check if invited
    const { data: invite } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('status', 'invited')
      .maybeSingle();

    if (!invite) {
      throw new Error("This email is not authorized to register. Please contact an administrator.");
    }

    // 2. Sign Up (Create Auth User)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) throw authError;

    // 3. Fix the Profile (The "Handshake")
    if (authData.user) {
      // Delete the placeholder invite row to avoid duplicate key error on ID if we were inserting fresh
      // BUT Supabase Auth might have already created a profile trigger if you had one.
      // Since we don't have a trigger, we manually manage this.
      
      // First, delete the invite placeholder
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email)
        .eq('status', 'invited');
        
      if (deleteError) {
         console.error("Error removing invite placeholder:", deleteError);
         // Continue anyway, as the auth user is created
      }

      // Insert the REAL profile linked to the new Auth ID
      const { error: insertError } = await supabase.from('profiles').insert({
        id: authData.user.id, // The REAL ID from Auth
        email: email,
        role: invite.role, // Copy role from invite
        status: 'active',
        full_name: invite.full_name || 'New Staff'
      });

      if (insertError) throw insertError;
      
      // Navigate to dashboard
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-900 p-3 rounded-xl">
            {isRegistering ? (
              <UserPlus className="w-8 h-8 text-white" />
            ) : (
              <LogIn className="w-8 h-8 text-white" />
            )}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className="text-center text-slate-600 mb-8">
          State Grant Management System
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent transition-all"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isRegistering ? 'Creating Account...' : 'Signing in...') : (isRegistering ? 'Register' : 'Sign In')}
          </button>
        </form>

        {!isRegistering && (
          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-sm text-blue-900 hover:text-blue-700 font-medium">
              Forgot password?
            </Link>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-sm text-blue-900 hover:text-blue-700 font-medium"
          >
            {isRegistering
              ? 'Already have an account? Sign in'
              : 'Need an account? Register with invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
