'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  MessageSquare,
  BarChart3,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  FileText,
  FlaskConical,
  FolderOpen,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  userName?: string;
}

export function OnboardingModal({ isOpen, onComplete, userName }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: `Welcome to Parse${userName ? `, ${userName.split(' ')[0]}` : ''}!`,
      description: 'Your AI-powered research assistant for document analysis and data visualization.',
      icon: Sparkles,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FeatureCard
              icon={FileText}
              title="Document Analysis"
              description="Upload PDFs, CSVs, and Excel files for instant AI-powered insights"
            />
            <FeatureCard
              icon={BarChart3}
              title="Smart Visualizations"
              description="Generate charts and graphs automatically from your data"
            />
            <FeatureCard
              icon={MessageSquare}
              title="Conversational AI"
              description="Ask questions about your documents in natural language"
            />
            <FeatureCard
              icon={Users}
              title="Team Collaboration"
              description="Share analyses and work together with your team"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'upload',
      title: 'Upload Your Documents',
      description: 'Start by uploading documents you want to analyze.',
      icon: Upload,
      content: (
        <div className="space-y-6">
          <div className="bg-background-secondary rounded-xl p-6 border border-border">
            <div className="flex items-center justify-center h-32 border-2 border-dashed border-border-hover rounded-lg">
              <div className="text-center">
                <Upload className="h-8 w-8 text-foreground-tertiary mx-auto mb-2" />
                <p className="text-sm text-foreground-secondary">Drag & drop or click to upload</p>
                <p className="text-xs text-foreground-tertiary mt-1">PDF, CSV, Excel, JSON, TXT</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Supported file types:</h4>
            <div className="grid grid-cols-3 gap-2">
              {['PDF', 'CSV', 'Excel', 'JSON', 'TXT', 'Images'].map((type) => (
                <div key={type} className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <Check className="h-4 w-4 text-success" />
                  {type}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'analyze',
      title: 'Ask Questions & Analyze',
      description: 'Use natural language to explore your data.',
      icon: MessageSquare,
      content: (
        <div className="space-y-6">
          <div className="bg-background-secondary rounded-xl p-4 border border-border">
            <div className="space-y-3">
              <ExamplePrompt text="Summarize the key findings from this report" />
              <ExamplePrompt text="Create a bar chart comparing Q1 vs Q2 sales" />
              <ExamplePrompt text="What are the main trends in this data?" />
              <ExamplePrompt text="Extract all financial metrics from this document" />
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Pro tip</p>
              <p className="text-sm text-foreground-secondary">
                Choose your preferred output format (Scientific, Statistical, Business, etc.)
                when you start an analysis for tailored responses.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'features',
      title: 'Powerful Features',
      description: 'Discover what else you can do with Parse.',
      icon: FlaskConical,
      content: (
        <div className="space-y-4">
          <FeatureRow
            icon={FlaskConical}
            title="Design of Experiments"
            description="Run A/B tests and factorial experiments with statistical analysis"
          />
          <FeatureRow
            icon={FolderOpen}
            title="Repositories"
            description="Organize your analyses, documents, and charts into collections"
          />
          <FeatureRow
            icon={BarChart3}
            title="Chart Annotations"
            description="Add notes and highlights to your visualizations"
          />
          <FeatureRow
            icon={Users}
            title="Workspaces"
            description="Collaborate with team members in shared workspaces"
          />
          <FeatureRow
            icon={FileText}
            title="Templates"
            description="Create reusable templates for consistent reporting"
          />
        </div>
      ),
    },
    {
      id: 'ready',
      title: "You're All Set!",
      description: 'Start analyzing your data with AI-powered insights.',
      icon: Check,
      content: (
        <div className="space-y-6 text-center">
          <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-success" />
          </div>
          <div className="space-y-2">
            <p className="text-foreground-secondary">
              Your account is ready. Here's how to get started:
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 text-left">
            <QuickAction number={1} text="Upload a document or paste data" />
            <QuickAction number={2} text="Choose your output format" />
            <QuickAction number={3} text="Ask questions and get insights" />
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 px-4"
          >
            <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-background-secondary">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Header */}
              <div className="p-6 pb-0">
                <div className="flex items-center gap-4">
                  <motion.div
                    key={currentStepData.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"
                  >
                    <currentStepData.icon className="h-6 w-6 text-primary" />
                  </motion.div>
                  <div>
                    <motion.h2
                      key={`title-${currentStepData.id}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xl font-semibold"
                    >
                      {currentStepData.title}
                    </motion.h2>
                    <motion.p
                      key={`desc-${currentStepData.id}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 }}
                      className="text-sm text-foreground-tertiary"
                    >
                      {currentStepData.description}
                    </motion.p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStepData.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {currentStepData.content}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 pt-0">
                <div className="flex items-center gap-2">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        index === currentStep
                          ? 'w-6 bg-primary'
                          : index < currentStep
                          ? 'w-2 bg-primary/50'
                          : 'w-2 bg-border'
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  {!isLastStep && (
                    <Button variant="ghost" onClick={handleSkip}>
                      Skip tour
                    </Button>
                  )}
                  {!isFirstStep && (
                    <Button variant="outline" onClick={handlePrev}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  )}
                  <Button onClick={handleNext}>
                    {isLastStep ? (
                      <>
                        Get Started
                        <Sparkles className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Helper components
function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-background-secondary border border-border">
      <Icon className="h-6 w-6 text-primary mb-3" />
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-sm text-foreground-tertiary">{description}</p>
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-background-secondary transition-colors">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-foreground-tertiary">{description}</p>
      </div>
    </div>
  );
}

function ExamplePrompt({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
      <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function QuickAction({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-background-secondary border border-border">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-primary">{number}</span>
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
