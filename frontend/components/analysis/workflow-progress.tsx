'use client';

import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalysisTemplate, TemplatePrompt } from '@/lib/analysis-templates';

interface WorkflowProgressProps {
  template: AnalysisTemplate;
  completedSteps: number;
  onStepClick: (prompt: TemplatePrompt) => void;
  disabled?: boolean;
}

export function WorkflowProgress({
  template,
  completedSteps,
  onStepClick,
  disabled = false,
}: WorkflowProgressProps) {
  const currentStep = Math.min(completedSteps, template.prompts.length - 1);

  return (
    <div className="border-b border-border bg-background-secondary/30 px-4 py-3">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{template.icon}</span>
          <h3 className="text-sm font-medium text-foreground">{template.name}</h3>
          <span className="text-xs text-foreground-tertiary">
            {completedSteps} of {template.prompts.length} steps
          </span>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
          {template.prompts.map((prompt, index) => {
            const isCompleted = index < completedSteps;
            const isCurrent = index === completedSteps;
            const isUpcoming = index > completedSteps;

            return (
              <motion.button
                key={prompt.id}
                onClick={() => !disabled && !isCompleted && onStepClick(prompt)}
                disabled={disabled || isCompleted}
                whileHover={!disabled && !isCompleted ? { scale: 1.02 } : {}}
                whileTap={!disabled && !isCompleted ? { scale: 0.98 } : {}}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0',
                  isCompleted && 'bg-green-500/10 text-green-500',
                  isCurrent && 'bg-primary/10 text-primary border border-primary/30',
                  isUpcoming && 'bg-background-tertiary text-foreground-tertiary',
                  !disabled && !isCompleted && 'cursor-pointer hover:bg-primary/5'
                )}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                      isCurrent ? 'bg-primary text-white' : 'bg-foreground-tertiary/30 text-foreground-tertiary'
                    )}
                  >
                    {index + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{prompt.label}</span>
                {index < template.prompts.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-foreground-tertiary ml-1" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface WorkflowSuggestionsProps {
  template: AnalysisTemplate;
  currentStep: number;
  onSendPrompt: (prompt: string) => void;
  hasDocuments: boolean;
}

export function WorkflowSuggestions({
  template,
  currentStep,
  onSendPrompt,
  hasDocuments,
}: WorkflowSuggestionsProps) {
  const currentPrompt = template.prompts[currentStep];
  const isLastStep = currentStep >= template.prompts.length;

  if (isLastStep) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 mb-3">
          <Check className="h-6 w-6 text-green-500" />
        </div>
        <h3 className="font-medium text-foreground mb-1">
          {template.name} Complete!
        </h3>
        <p className="text-sm text-foreground-tertiary">
          All workflow steps have been completed. You can continue asking questions.
        </p>
      </motion.div>
    );
  }

  if (!hasDocuments) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-3 text-2xl"
          style={{ backgroundColor: `${template.color}20` }}
        >
          {template.icon}
        </div>
        <h3 className="font-medium text-foreground mb-1">
          Upload documents to begin
        </h3>
        <p className="text-sm text-foreground-tertiary">
          Add documents to start the {template.name.toLowerCase()} workflow
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-8"
    >
      <div
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-3 text-2xl"
        style={{ backgroundColor: `${template.color}20` }}
      >
        {template.icon}
      </div>
      <h3 className="font-medium text-foreground mb-1">
        Step {currentStep + 1}: {currentPrompt.label}
      </h3>
      <p className="text-sm text-foreground-tertiary mb-4 max-w-md mx-auto">
        {template.description}
      </p>
      <motion.button
        onClick={() => onSendPrompt(currentPrompt.prompt)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium transition-all"
        style={{ backgroundColor: template.color }}
      >
        <span>{currentPrompt.label}</span>
        <ChevronRight className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}
