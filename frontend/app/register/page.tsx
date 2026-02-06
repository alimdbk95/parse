'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Lock, User, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

const features = [
  'Upload and analyze research documents',
  'Generate customizable charts and visualizations',
  'AI-powered insights and summaries',
  'Collaborate with your team in real-time',
  'Export with your branding',
];

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setToken, setWorkspaces, setCurrentWorkspace } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const data = await api.register(email, password, name);
      setUser(data.user);
      setToken(data.token);
      setWorkspaces([{ ...data.workspace, role: 'admin' }]);
      setCurrentWorkspace({ ...data.workspace, role: 'admin' });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
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
          <Link href="/" className="mb-8 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">Parse</span>
          </Link>

          {/* Heading */}
          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="mt-2 text-foreground-secondary">
            Start analyzing your research documents in seconds
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Input
              label="Full name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="h-4 w-4" />}
              required
            />

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
            />

            <p className="text-xs text-foreground-tertiary">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>

            <Button type="submit" className="w-full" loading={loading}>
              Create account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Sign in link */}
          <p className="mt-8 text-center text-sm text-foreground-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Features */}
      <div className="hidden flex-1 items-center justify-center bg-background-secondary lg:flex">
        <div className="max-w-lg p-12">
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-teal">
                <Zap className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold">
            Everything you need for research analysis
          </h2>
          <p className="mt-4 text-foreground-secondary">
            Parse gives you powerful tools to extract insights from your documents
            and share findings with your team.
          </p>

          <ul className="mt-8 space-y-4">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-foreground-secondary">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
