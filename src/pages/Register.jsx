import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';

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

export default function Register() {
  const [step, setStep] = useState('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setStep('otp');
    } catch (err) {
      setError(err?.data?.message || err?.response?.data?.message || err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await base44.auth.verifyOtp({ email, otpCode: otp });
      if (res?.access_token) base44.auth.setToken(res.access_token);
      window.location.href = resolveReturnTo();
    } catch (err) {
      setError(err?.data?.message || err?.response?.data?.message || err?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try { await base44.auth.resendOtp(email); } catch { /* ignore */ } finally { setResending(false); }
  };

  const handleProvider = (provider) => {
    base44.auth.loginWithProvider(provider, resolveReturnTo());
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="Curiosity Led" className="w-14 h-14 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
            <p className="text-gray-500 mt-1 text-sm">We sent a verification code to <span className="font-medium text-gray-700">{email}</span></p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input id="otp" type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} required autoComplete="one-time-code" placeholder="Enter 6-digit code" className="text-center text-lg tracking-widest" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full text-white" style={{ backgroundColor: BRAND_BLUE }} disabled={loading}>
                {loading ? 'Verifying…' : 'Verify and continue'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button type="button" onClick={handleResend} disabled={resending} className="text-xs hover:underline" style={{ color: BRAND_BLUE }}>
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="hover:underline font-medium" style={{ color: BRAND_BLUE }}>Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Curiosity Led" className="w-14 h-14 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1 text-sm">Join the Curiosity Led leadership platform</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Curiosity Led is an <strong>invitation-only</strong> platform. If you haven't received an invitation, your account won't be activated.</p>
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
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">or sign up with email</span></div>
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="At least 8 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="Re-enter password" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full text-white" style={{ backgroundColor: BRAND_BLUE }} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account? <Link to="/login" className="hover:underline font-medium" style={{ color: BRAND_BLUE }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}