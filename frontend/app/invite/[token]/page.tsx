'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Check, X, Loader2, Mail, Shield, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
  };
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetchInvitation = async () => {
      try {
        // Check if user is logged in
        const authToken = api.getToken();
        if (authToken) {
          try {
            const { user } = await api.getMe();
            setIsLoggedIn(true);
            setCurrentUserEmail(user.email);
          } catch {
            // Token invalid, clear it
            api.setToken(null);
            setIsLoggedIn(false);
          }
        }

        // Fetch invitation details
        const { invitation } = await api.getInvitationByToken(token);
        setInvitation(invitation);
      } catch (err: any) {
        setError(err.message || 'Invalid or expired invitation');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!isLoggedIn) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    // Check if email matches
    if (invitation && currentUserEmail && invitation.email !== currentUserEmail) {
      setError(`This invitation was sent to ${invitation.email}. Please log in with that email address to accept it.`);
      return;
    }

    setAccepting(true);
    try {
      await api.acceptInvitation(token);
      setSuccess(true);
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'editor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-foreground-secondary">Loading invitation...</p>
        </motion.div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <X className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Invalid Invitation</h1>
          <p className="text-foreground-secondary mb-6">{error}</p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Go to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6"
          >
            <Check className="h-8 w-8 text-green-500" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Welcome to {invitation?.workspace.name}!</h1>
          <p className="text-foreground-secondary mb-4">
            You've successfully joined the workspace as a{invitation?.role === 'admin' ? 'n' : ''} {invitation?.role}.
          </p>
          <p className="text-sm text-foreground-tertiary">Redirecting to dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card border border-border rounded-2xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">You're Invited!</h1>
          <p className="text-foreground-secondary">
            You've been invited to join a workspace on Parse
          </p>
        </div>

        {/* Invitation Details */}
        <div className="bg-background-secondary rounded-xl p-6 mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {invitation?.workspace.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-foreground">{invitation?.workspace.name}</p>
              <p className="text-sm text-foreground-tertiary">Workspace</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-foreground-tertiary" />
              <span className="text-sm text-foreground-secondary">{invitation?.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-foreground-tertiary" />
              <span className={`text-xs px-2 py-1 rounded-full border ${getRoleBadgeColor(invitation?.role || 'viewer')}`}>
                {invitation?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6"
          >
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!isLoggedIn ? (
            <>
              <Button onClick={handleAccept} className="w-full" size="lg">
                Log in to Accept
              </Button>
              <p className="text-center text-sm text-foreground-tertiary">
                Don't have an account?{' '}
                <a
                  href={`/register?redirect=/invite/${token}&email=${encodeURIComponent(invitation?.email || '')}`}
                  className="text-primary hover:underline"
                >
                  Sign up
                </a>
              </p>
            </>
          ) : (
            <>
              <Button
                onClick={handleAccept}
                className="w-full"
                size="lg"
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="w-full"
                disabled={accepting}
              >
                Decline
              </Button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-foreground-tertiary mt-6">
          This invitation expires on{' '}
          {invitation?.expiresAt && new Date(invitation.expiresAt).toLocaleDateString()}
        </p>
      </motion.div>
    </div>
  );
}
