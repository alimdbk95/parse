'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo, LogoIcon } from '@/components/ui/logo';
import { api } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('No verification token provided');
        setVerifying(false);
        return;
      }

      try {
        await api.verifyEmail(token);
        setSuccess(true);
      } catch (err: any) {
        setError(err.message || 'Failed to verify email');
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [token]);

  const renderContent = () => {
    if (verifying) {
      return (
        <div className="flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold">Verifying your email...</h1>
          <p className="mt-2 text-foreground-secondary">
            Please wait while we verify your email address.
          </p>
        </div>
      );
    }

    if (success) {
      return (
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold">Email verified!</h1>
          <p className="mt-2 text-foreground-secondary">
            Your email has been successfully verified. You can now enjoy all features of Parse.
          </p>
          <Link href="/dashboard">
            <Button className="mt-8">Go to Dashboard</Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold">Verification failed</h1>
        <p className="mt-2 text-foreground-secondary">
          {error || 'The verification link is invalid or has expired.'}
        </p>
        <div className="mt-8 space-y-3">
          <Link href="/dashboard">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
          <p className="text-sm text-foreground-tertiary">
            You can request a new verification email from your account settings.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Content */}
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
              <div className="absolute -inset-4 rounded-full bg-green-500/20 blur-xl" />
              <div className="relative">
                <LogoIcon size={96} />
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold">Secure your account</h2>
          <p className="mt-4 text-foreground-secondary">
            Email verification helps protect your account and ensures you receive important updates.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
