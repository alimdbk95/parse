'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo, LogoIcon } from '@/components/ui/logo';
import { api } from '@/lib/api';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidating(false);
        return;
      }

      try {
        const data = await api.verifyResetToken(token);
        setTokenValid(data.valid);
        setUserEmail(data.email);
      } catch (err) {
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(token!, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (validating) {
      return (
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-foreground-secondary">Validating reset link...</p>
        </div>
      );
    }

    if (!token || !tokenValid) {
      return (
        <>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold">Invalid or expired link</h1>
          <p className="mt-2 text-foreground-secondary">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div className="mt-8 space-y-3">
            <Link href="/forgot-password">
              <Button className="w-full">Request new link</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Button>
            </Link>
          </div>
        </>
      );
    }

    if (success) {
      return (
        <>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold">Password reset!</h1>
          <p className="mt-2 text-foreground-secondary">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Link href="/login">
            <Button className="mt-8 w-full">Sign in</Button>
          </Link>
        </>
      );
    }

    return (
      <>
        <h1 className="text-3xl font-bold">Create new password</h1>
        <p className="mt-2 text-foreground-secondary">
          Enter a new password for <strong className="text-foreground">{userEmail}</strong>
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Input
            label="New password"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="h-4 w-4" />}
            required
          />

          <Input
            label="Confirm password"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock className="h-4 w-4" />}
            required
          />

          <p className="text-xs text-foreground-tertiary">
            Password must be at least 8 characters
          </p>

          <Button type="submit" className="w-full" loading={loading}>
            Reset password
          </Button>
        </form>
      </>
    );
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

          {renderContent()}
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
          <h2 className="text-2xl font-bold">Secure your account</h2>
          <p className="mt-4 text-foreground-secondary">
            Create a strong password to keep your research safe.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
