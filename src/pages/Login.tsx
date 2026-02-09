import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
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
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/bg-image.PNG')` }}
    >
      <div className="flex w-full max-w-5xl items-center gap-8 lg:gap-16">
        {/* Left Side - Logo & Description */}
        <div className="hidden lg:flex flex-col flex-1">
          <img src="/7.png" alt="GMS Logo" className="w-56 mb-6" />
          <p className="text-slate-700 text-sm leading-relaxed max-w-md">
            Grant Management System (GMS) is an internal platform used to manage grant information,
            funding sources, disbursements, and grant status in a structured and secure manner.
          </p>
        </div>

        {/* Right Side - Login Card */}
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 md:p-10">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-500 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: '#dbeafe' }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-500 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: '#dbeafe' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-3">
            <Link to="/forgot-password" className="block text-xs text-slate-500 hover:text-slate-700">
              Forgot password?
            </Link>
            <p className="text-xs text-slate-400">Grant Management System</p>

            {/* Access Information */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Don't have an account?
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Access is by invitation only. Please contact your administrator to request access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
