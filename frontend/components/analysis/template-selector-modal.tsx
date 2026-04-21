'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  analysisTemplates,
  templateCategories,
  AnalysisTemplate,
} from '@/lib/analysis-templates';

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: AnalysisTemplate | null) => void;
  loading?: boolean;
}

export function TemplateSelectorModal({
  isOpen,
  onClose,
  onSelect,
  loading = false,
}: TemplateSelectorModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AnalysisTemplate | null>(null);

  const filteredTemplates = selectedCategory
    ? analysisTemplates.filter((t) => t.category === selectedCategory)
    : analysisTemplates;

  const handleSelect = () => {
    onSelect(selectedTemplate);
  };

  const handleStartBlank = () => {
    onSelect(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start New Analysis"
      description="Choose a template for guided analysis or start from scratch"
      size="xl"
    >
      <div className="space-y-6">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              selectedCategory === null
                ? 'bg-primary text-white'
                : 'bg-background-tertiary text-foreground-secondary hover:bg-background-tertiary/80'
            )}
          >
            All
          </button>
          {templateCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                selectedCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-background-tertiary text-foreground-secondary hover:bg-background-tertiary/80'
              )}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {/* Blank Analysis Option */}
          <motion.button
            onClick={handleStartBlank}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'p-4 rounded-xl border-2 border-dashed text-left transition-all',
              'border-border hover:border-primary/50 bg-background-tertiary/30'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: 'rgba(124, 159, 245, 0.2)' }}
              >
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">Blank Analysis</h3>
                <p className="text-sm text-foreground-tertiary mt-0.5">
                  Start with a blank canvas and ask any questions
                </p>
              </div>
            </div>
          </motion.button>

          {/* Template Cards */}
          {filteredTemplates.map((template) => (
            <motion.button
              key={template.id}
              onClick={() => setSelectedTemplate(
                selectedTemplate?.id === template.id ? null : template
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                selectedTemplate?.id === template.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 bg-background-tertiary/30'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${template.color}20` }}
                >
                  {template.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{template.name}</h3>
                  <p className="text-sm text-foreground-tertiary mt-0.5">
                    {template.description}
                  </p>
                  <p className="text-xs text-foreground-tertiary mt-2">
                    {template.prompts.length} guided steps
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Selected Template Preview */}
        <AnimatePresence>
          {selectedTemplate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border border-border rounded-xl p-4 bg-background-tertiary/30"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <span>{selectedTemplate.icon}</span>
                  {selectedTemplate.name} Steps
                </h4>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-foreground-tertiary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {selectedTemplate.prompts.map((prompt, index) => (
                  <div
                    key={prompt.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${selectedTemplate.color}20`,
                        color: selectedTemplate.color,
                      }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-foreground-secondary">{prompt.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {selectedTemplate && (
            <Button onClick={handleSelect} loading={loading}>
              Start {selectedTemplate.name}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
