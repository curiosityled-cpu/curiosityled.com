import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LOGO_URL = 'https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png';
const BRAND_BLUE = '#0202ff';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!resetToken) { setError('Invalid or missing reset token. Please request a new reset link.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword: password });
      window.location.href = '/login';
    } catch (err) {
      setError(err?.data?.message || err?.response?.data?.message || err?.message || 'Reset failed. The link may have expired.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Curiosity Led" className="w-14 h-14 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
          <p className="text-gray-500 mt-1 text-sm">Choose a strong password for your account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="At least 8 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="Re-enter password" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full text-white" style={{ backgroundColor: BRAND_BLUE }} disabled={loading}>
              {loading ? 'Resetting…' : 'Reset password'}
            </Button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="hover:underline font-medium" style={{ color: BRAND_BLUE }}>Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}