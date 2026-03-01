'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  FlaskConical,
  BarChart3,
  Code,
  Briefcase,
  GraduationCap,
  Check,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type OutputFormat = 'generic' | 'scientific' | 'statistical' | 'technical' | 'business' | 'academic';

interface OutputFormatOption {
  id: OutputFormat;
  name: string;
  description: string;
  icon: React.ElementType;
  examples: string[];
}

const OUTPUT_FORMATS: OutputFormatOption[] = [
  {
    id: 'generic',
    name: 'General Purpose',
    description: 'Clear, accessible analysis suitable for any audience',
    icon: FileText,
    examples: ['Quick insights', 'Summaries', 'General reports'],
  },
  {
    id: 'scientific',
    name: 'Scientific Research',
    description: 'Peer-review style with methodology and significance testing',
    icon: FlaskConical,
    examples: ['Research papers', 'Lab reports', 'Experimental results'],
  },
  {
    id: 'statistical',
    name: 'Statistical Analysis',
    description: 'Detailed statistical measures, tests, and confidence intervals',
    icon: BarChart3,
    examples: ['Data analysis', 'Hypothesis testing', 'Regression analysis'],
  },
  {
    id: 'technical',
    name: 'Technical Documentation',
    description: 'Precise specifications, parameters, and technical details',
    icon: Code,
    examples: ['System analysis', 'Technical specs', 'Engineering reports'],
  },
  {
    id: 'business',
    name: 'Business Intelligence',
    description: 'Executive-focused with KPIs, ROI, and actionable insights',
    icon: Briefcase,
    examples: ['Executive summaries', 'Market analysis', 'Strategy reports'],
  },
  {
    id: 'academic',
    name: 'Academic Writing',
    description: 'Scholarly format with theoretical context and formal structure',
    icon: GraduationCap,
    examples: ['Thesis chapters', 'Literature reviews', 'Academic papers'],
  },
];

interface OutputFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (format: OutputFormat) => void;
  currentFormat?: OutputFormat;
}

export function OutputFormatModal({
  isOpen,
  onClose,
  onSelect,
  currentFormat,
}: OutputFormatModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>(
    currentFormat || 'generic'
  );

  const handleConfirm = () => {
    onSelect(selectedFormat);
    onClose();
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
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
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Select Output Format</h2>
                    <p className="text-sm text-foreground-tertiary">
                      Choose how you want the AI to format its responses
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-background-tertiary transition-colors"
                >
                  <X className="h-5 w-5 text-foreground-tertiary" />
                </button>
              </div>

              {/* Format Options */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                {OUTPUT_FORMATS.map((format) => {
                  const Icon = format.icon;
                  const isSelected = selectedFormat === format.id;

                  return (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={cn(
                        'relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-border-hover hover:bg-background-secondary'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      )}

                      <div
                        className={cn(
                          'h-10 w-10 rounded-lg flex items-center justify-center mb-3',
                          isSelected ? 'bg-primary/20' : 'bg-background-tertiary'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            isSelected ? 'text-primary' : 'text-foreground-secondary'
                          )}
                        />
                      </div>

                      <h3
                        className={cn(
                          'font-medium mb-1',
                          isSelected ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {format.name}
                      </h3>

                      <p className="text-sm text-foreground-tertiary mb-3">
                        {format.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {format.examples.map((example) => (
                          <span
                            key={example}
                            className="text-xs px-2 py-0.5 rounded-full bg-background-tertiary text-foreground-secondary"
                          >
                            {example}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-border bg-background-secondary/30">
                <p className="text-sm text-foreground-tertiary">
                  You can change this later in analysis settings
                </p>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirm}>
                    Continue
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
