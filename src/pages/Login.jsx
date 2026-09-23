import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LOGO_URL = 'https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png';
const BRAND_BLUE = '#0202ff';

function resolveReturnTo() {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');
  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) return returnTo;
  return '/';
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = resolveReturnTo();
    } catch (err) {
      setLoading(false);
      setError(err?.data?.message || err?.response?.data?.message || err?.message || 'Invalid email or password.');
    }
  };

  const handleProvider = (provider) => {
    base44.auth.loginWithProvider(provider, resolveReturnTo());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Curiosity Led" className="w-14 h-14 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your Curiosity Led account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="space-y-3 mb-6">
            <Button type="button" variant="outline" className="w-full font-medium" onClick={() => handleProvider('google')} disabled={loading}>
              <GoogleIcon /> Continue with Google
            </Button>
            <Button type="button" variant="outline" className="w-full font-medium" onClick={() => handleProvider('microsoft')} disabled={loading}>
              <MicrosoftIcon /> Continue with Microsoft
            </Button>
          </div>
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">or sign in with email</span></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: BRAND_BLUE }}>Forgot password?</Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full text-white" style={{ backgroundColor: BRAND_BLUE }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account? <Link to="/register" className="hover:underline font-medium" style={{ color: BRAND_BLUE }}>Request access</Link>
        </p>
      </div>
    </div>
  );
}