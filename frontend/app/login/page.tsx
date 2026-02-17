'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo, LogoIcon } from '@/components/ui/logo';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken, setWorkspaces, setCurrentWorkspace } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(email, password);
      setUser(data.user);
      setToken(data.token);
      setWorkspaces(data.workspaces);
      if (data.workspaces.length > 0) {
        setCurrentWorkspace(data.workspaces[0]);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
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

          {/* Heading */}
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-foreground-secondary">
            Sign in to continue to your research workspace
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

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border bg-background-secondary"
                />
                <span className="text-foreground-secondary">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Sign up link */}
          <p className="mt-8 text-center text-sm text-foreground-secondary">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
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
          <h2 className="text-2xl font-bold">
            AI-Powered Research Analysis
          </h2>
          <p className="mt-4 text-foreground-secondary">
            Upload documents, extract insights, generate visualizations, and collaborate
            with your team - all powered by advanced AI.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <div className="rounded-lg bg-background-tertiary px-4 py-2 text-sm">
              Document Analysis
            </div>
            <div className="rounded-lg bg-background-tertiary px-4 py-2 text-sm">
              Chart Generation
            </div>
            <div className="rounded-lg bg-background-tertiary px-4 py-2 text-sm">
              Team Collaboration
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
