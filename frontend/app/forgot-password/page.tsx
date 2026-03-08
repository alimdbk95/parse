'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo, LogoIcon } from '@/components/ui/logo';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="mb-8 inline-block">
            <Logo size="md" />
          </Link>

          {success ? (
            <>
              {/* Success state */}
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold">Check your email</h1>
              <p className="mt-2 text-foreground-secondary">
                We sent a password reset link to <strong className="text-foreground">{email}</strong>.
                Click the link in the email to reset your password.
              </p>
              <p className="mt-4 text-sm text-foreground-tertiary">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setSuccess(false)}
                  className="text-primary hover:underline"
                >
                  try another email
                </button>
              </p>
              <Link href="/login">
                <Button variant="outline" className="mt-8 w-full">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Button>
              </Link>
            </>
          ) : (
            <>
              {/* Heading */}
              <h1 className="text-3xl font-bold">Reset your password</h1>
              <p className="mt-2 text-foreground-secondary">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                  required
                />

                <Button type="submit" className="w-full" loading={loading}>
                  Send reset link
                </Button>
              </form>

              {/* Back to login link */}
              <Link href="/login">
                <Button variant="ghost" className="mt-6 w-full">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="hidden flex-1 items-center justify-center bg-background-secondary lg:flex">
        <div className="max-w-lg p-12 text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl" />
              <div className="relative">
                <LogoIcon size={96} />
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold">Forgot your password?</h2>
          <p className="mt-4 text-foreground-secondary">
            No worries! Enter your email and we'll help you get back into your account.
          </p>
        </div>
      </div>
    </div>
  );
}
