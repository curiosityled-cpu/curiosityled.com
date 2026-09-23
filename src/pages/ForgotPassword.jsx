import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MailCheck } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png';
const BRAND_BLUE = '#0202ff';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      /* always show generic success */
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Curiosity Led" className="w-14 h-14 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-gray-500 mt-1 text-sm">We'll send you a link to set a new password</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {sent ? (
            <div className="text-center py-4">
              <MailCheck className="w-12 h-12 mx-auto mb-4" style={{ color: BRAND_BLUE }} />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500 mb-6">
                If an account exists for <span className="font-medium text-gray-700">{email}</span>, you'll receive a password reset link shortly. The link expires after one use.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">Back to sign in</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" />
              </div>
              <Button type="submit" className="w-full text-white" style={{ backgroundColor: BRAND_BLUE }} disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          Remembered your password? <Link to="/login" className="hover:underline font-medium" style={{ color: BRAND_BLUE }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}