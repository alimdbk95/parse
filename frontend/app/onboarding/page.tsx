'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  FlaskConical,
  LineChart,
  Code2,
  Users,
  FileText,
  BarChart3,
  Lightbulb,
  Target,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const professions = [
  { id: 'researcher', label: 'Researcher', icon: FlaskConical, description: 'Academic or industry research' },
  { id: 'analyst', label: 'Analyst', icon: LineChart, description: 'Data or business analyst' },
  { id: 'student', label: 'Student', icon: GraduationCap, description: 'Graduate or undergraduate' },
  { id: 'product_manager', label: 'Product Manager', icon: Target, description: 'Product development' },
  { id: 'engineer', label: 'Engineer', icon: Code2, description: 'Software or data engineering' },
  { id: 'executive', label: 'Executive', icon: Briefcase, description: 'Leadership or management' },
];

const useCases = [
  { id: 'analyze_documents', label: 'Analyze Documents', icon: FileText, description: 'Extract insights from research papers, reports, and documents' },
  { id: 'generate_charts', label: 'Generate Charts', icon: BarChart3, description: 'Create visualizations from data' },
  { id: 'research_insights', label: 'Research Insights', icon: Lightbulb, description: 'Get AI-powered summaries and findings' },
  { id: 'team_collaboration', label: 'Team Collaboration', icon: Users, description: 'Share and collaborate with teammates' },
];

const companySizes = [
  { id: 'solo', label: 'Just me', description: 'Individual researcher or analyst' },
  { id: 'small', label: '2-10', description: 'Small team or lab' },
  { id: 'medium', label: '11-50', description: 'Growing organization' },
  { id: 'large', label: '51-200', description: 'Large company' },
  { id: 'enterprise', label: '200+', description: 'Enterprise organization' },
];

const referralSources = [
  { id: 'google', label: 'Google Search' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'friend', label: 'Friend or Colleague' },
  { id: 'other', label: 'Other' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser } = useStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form state
  const [profession, setProfession] = useState('');
  const [useCase, setUseCase] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [referralSource, setReferralSource] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const data = await api.getMe();
        if (data.user.hasCompletedOnboarding) {
          router.push('/dashboard');
          return;
        }
        setUser(data.user);
      } catch {
        router.push('/login');
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router, setUser]);

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const result = await api.completeOnboarding({
        profession,
        useCase,
        companySize,
        referralSource,
      });
      if (result.success && user) {
        setUser({ ...user, hasCompletedOnboarding: true });
        router.push('/dashboard');
      } else if (result.success) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!profession;
      case 2:
        return !!useCase;
      case 3:
        return !!companySize;
      case 4:
        return true; // Referral source is optional
      default:
        return false;
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">
          <Logo size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 w-8 rounded-full transition-colors',
                i + 1 <= step ? 'bg-primary' : 'bg-border'
              )}
            />
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-2xl">
          {/* Step 1: Profession */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold">What best describes you?</h1>
                <p className="mt-2 text-foreground-secondary">
                  This helps us personalize your experience
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {professions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProfession(p.id)}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-xl border p-6 transition-all hover:border-primary/50',
                      profession === p.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    )}
                  >
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full',
                      profession === p.id ? 'bg-primary/20' : 'bg-background-tertiary'
                    )}>
                      <p.icon className={cn(
                        'h-6 w-6',
                        profession === p.id ? 'text-primary' : 'text-foreground-secondary'
                      )} />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{p.label}</p>
                      <p className="text-xs text-foreground-tertiary">{p.description}</p>
                    </div>
                    {profession === p.id && (
                      <div className="absolute right-3 top-3">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Use Case */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold">What do you want to do?</h1>
                <p className="mt-2 text-foreground-secondary">
                  Select your primary use case
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {useCases.map((uc) => (
                  <button
                    key={uc.id}
                    onClick={() => setUseCase(uc.id)}
                    className={cn(
                      'flex items-start gap-4 rounded-xl border p-6 text-left transition-all hover:border-primary/50',
                      useCase === uc.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    )}
                  >
                    <div className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
                      useCase === uc.id ? 'bg-primary/20' : 'bg-background-tertiary'
                    )}>
                      <uc.icon className={cn(
                        'h-6 w-6',
                        useCase === uc.id ? 'text-primary' : 'text-foreground-secondary'
                      )} />
                    </div>
                    <div>
                      <p className="font-medium">{uc.label}</p>
                      <p className="mt-1 text-sm text-foreground-secondary">{uc.description}</p>
                    </div>
                    {useCase === uc.id && (
                      <Check className="ml-auto h-5 w-5 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Company Size */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold">How big is your team?</h1>
                <p className="mt-2 text-foreground-secondary">
                  This helps us recommend the right features
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                {companySizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setCompanySize(size.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border px-8 py-6 transition-all hover:border-primary/50',
                      companySize === size.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    )}
                  >
                    <p className="text-2xl font-bold">{size.label}</p>
                    <p className="text-xs text-foreground-tertiary">{size.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Referral Source (Optional) */}
          {step === 4 && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold">One last thing...</h1>
                <p className="mt-2 text-foreground-secondary">
                  How did you hear about Parse? (Optional)
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {referralSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setReferralSource(source.id)}
                    className={cn(
                      'rounded-full border px-6 py-3 transition-all hover:border-primary/50',
                      referralSource === source.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card'
                    )}
                  >
                    {source.label}
                  </button>
                ))}
              </div>

              <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
                <h3 className="font-semibold">You&apos;re all set!</h3>
                <p className="mt-2 text-sm text-foreground-secondary">
                  Click &quot;Get Started&quot; to begin analyzing your documents
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-12 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className={step === 1 ? 'invisible' : ''}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} loading={loading}>
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Skip Link */}
          <div className="mt-6 text-center">
            <button
              onClick={handleComplete}
              className="text-sm text-foreground-tertiary hover:text-foreground-secondary"
            >
              Skip for now
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
