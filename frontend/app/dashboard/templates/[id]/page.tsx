'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Type,
  BarChart3,
  Heading,
  Minus,
  Image,
  Table,
  Trash2,
  Save,
  Settings,
  Eye,
  Globe,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ChartRenderer } from '@/components/charts/chart-renderer';

interface Section {
  id: string;
  type: 'text' | 'chart' | 'heading' | 'divider' | 'image' | 'table';
  content: any;
  position: number;
  width: 'full' | 'half' | 'third';
  chartId?: string;
}

const SECTION_TYPES = [
  { type: 'heading', label: 'Heading', icon: Heading, description: 'Section title' },
  { type: 'text', label: 'Text', icon: Type, description: 'Rich text content' },
  { type: 'chart', label: 'Chart', icon: BarChart3, description: 'Data visualization' },
  { type: 'divider', label: 'Divider', icon: Minus, description: 'Visual separator' },
  { type: 'image', label: 'Image', icon: Image, description: 'Image placeholder' },
  { type: 'table', label: 'Table', icon: Table, description: 'Data table' },
];

const WIDTH_OPTIONS = [
  { value: 'full', label: 'Full Width' },
  { value: 'half', label: 'Half Width' },
  { value: 'third', label: 'Third Width' },
];

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [charts, setCharts] = useState<any[]>([]);

  useEffect(() => {
    fetchTemplate();
    fetchCharts();
  }, [params.id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const { template } = await api.getTemplate(params.id as string);
      setTemplate(template);
      setSections(
        template.sections.map((s: any) => ({
          ...s,
          content: s.content ? JSON.parse(s.content) : null,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch template:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCharts = async () => {
    try {
      const { charts } = await api.getCharts();
      setCharts(charts);
    } catch (error) {
      console.error('Failed to fetch charts:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateTemplate(params.id as string, {
        name: template.name,
        description: template.description,
        isPublic: template.isPublic,
        sections: sections.map((s, index) => ({
          type: s.type,
          content: s.content,
          position: index,
          width: s.width,
          chartId: s.chartId,
        })),
      });
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  const addSection = (type: string) => {
    const newSection: Section = {
      id: `temp-${Date.now()}`,
      type: type as Section['type'],
      content: getDefaultContent(type),
      position: sections.length,
      width: 'full',
    };
    setSections([...sections, newSection]);
    setShowAddSection(false);
    setEditingSection(newSection.id);
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'heading':
        return { text: 'Section Title', level: 1 };
      case 'text':
        return { text: 'Enter your content here...' };
      case 'chart':
        return { chartType: 'bar', title: 'Chart Title' };
      case 'table':
        return { rows: 3, cols: 3, headers: ['Column 1', 'Column 2', 'Column 3'] };
      default:
        return null;
    }
  };

  const updateSection = (id: string, updates: Partial<Section>) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id));
    if (editingSection === id) setEditingSection(null);
  };

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedSection) return;

    const sourceIndex = sections.findIndex((s) => s.id === draggedSection);
    if (sourceIndex === targetIndex) return;

    const newSections = [...sections];
    const [removed] = newSections.splice(sourceIndex, 1);
    newSections.splice(targetIndex, 0, removed);

    setSections(newSections);
    setDraggedSection(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setDragOverIndex(null);
  };

  const getSectionIcon = (type: string) => {
    const sectionType = SECTION_TYPES.find((t) => t.type === type);
    return sectionType?.icon || Type;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-foreground-secondary">Template not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/templates')}
            className="p-1.5 rounded-lg hover:bg-background-tertiary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-semibold">{template.name}</h1>
            <p className="text-xs text-foreground-secondary">
              {sections.length} section{sections.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          {/* Sections */}
          <div className="space-y-3">
            {sections.map((section, index) => {
              const Icon = getSectionIcon(section.type);
              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, section.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'group relative rounded-lg border border-border bg-background-secondary transition-all',
                    draggedSection === section.id && 'opacity-50',
                    dragOverIndex === index && 'border-primary',
                    editingSection === section.id && 'border-primary ring-1 ring-primary'
                  )}
                >
                  {/* Section toolbar */}
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <div className="cursor-move p-1 hover:bg-background-tertiary rounded">
                      <GripVertical className="h-4 w-4 text-foreground-tertiary" />
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <Icon className="h-4 w-4 text-foreground-secondary" />
                      <span className="text-sm font-medium capitalize">{section.type}</span>
                    </div>
                    <select
                      value={section.width}
                      onChange={(e) =>
                        updateSection(section.id, { width: e.target.value as Section['width'] })
                      }
                      className="text-xs bg-background border border-border rounded px-2 py-1"
                    >
                      {WIDTH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="p-1 rounded hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Section content */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setEditingSection(section.id)}
                  >
                    {section.type === 'heading' && (
                      <input
                        type="text"
                        value={section.content?.text || ''}
                        onChange={(e) =>
                          updateSection(section.id, {
                            content: { ...section.content, text: e.target.value },
                          })
                        }
                        className={cn(
                          'w-full bg-transparent border-none outline-none font-bold',
                          section.content?.level === 1 && 'text-2xl',
                          section.content?.level === 2 && 'text-xl',
                          section.content?.level === 3 && 'text-lg'
                        )}
                        placeholder="Enter heading..."
                      />
                    )}

                    {section.type === 'text' && (
                      <textarea
                        value={section.content?.text || ''}
                        onChange={(e) =>
                          updateSection(section.id, {
                            content: { ...section.content, text: e.target.value },
                          })
                        }
                        className="w-full bg-transparent border-none outline-none resize-none min-h-[100px] text-sm"
                        placeholder="Enter text content..."
                      />
                    )}

                    {section.type === 'chart' && (
                      <div className="space-y-3">
                        {section.chartId ? (
                          <div className="aspect-[16/9] bg-background rounded-lg overflow-hidden">
                            {charts.find((c) => c.id === section.chartId) ? (
                              <ChartRenderer
                                type={charts.find((c) => c.id === section.chartId)?.type}
                                data={JSON.parse(
                                  charts.find((c) => c.id === section.chartId)?.data || '[]'
                                )}
                                height={200}
                                enableEdit={false}
                                enableZoom={false}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-foreground-secondary">
                                Chart not found
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                            <BarChart3 className="h-8 w-8 mx-auto text-foreground-tertiary mb-2" />
                            <p className="text-sm text-foreground-secondary mb-3">
                              Select a chart to display
                            </p>
                            <select
                              value=""
                              onChange={(e) =>
                                updateSection(section.id, { chartId: e.target.value })
                              }
                              className="text-sm bg-background border border-border rounded px-3 py-1.5"
                            >
                              <option value="" disabled>
                                Select chart...
                              </option>
                              {charts.map((chart) => (
                                <option key={chart.id} value={chart.id}>
                                  {chart.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {section.type === 'divider' && (
                      <div className="border-t border-border my-2" />
                    )}

                    {section.type === 'image' && (
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <Image className="h-8 w-8 mx-auto text-foreground-tertiary mb-2" />
                        <p className="text-sm text-foreground-secondary">
                          Image placeholder
                        </p>
                      </div>
                    )}

                    {section.type === 'table' && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-background-tertiary">
                            <tr>
                              {(section.content?.headers || ['Col 1', 'Col 2', 'Col 3']).map(
                                (header: string, i: number) => (
                                  <th key={i} className="px-3 py-2 text-left font-medium">
                                    {header}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: section.content?.rows || 3 }).map((_, i) => (
                              <tr key={i} className="border-t border-border">
                                {Array.from({ length: section.content?.cols || 3 }).map(
                                  (_, j) => (
                                    <td key={j} className="px-3 py-2 text-foreground-secondary">
                                      Cell {i + 1}-{j + 1}
                                    </td>
                                  )
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Section Button */}
          <button
            onClick={() => setShowAddSection(true)}
            className="mt-4 w-full rounded-lg border-2 border-dashed border-border py-4 text-foreground-secondary hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Section
          </button>
        </div>
      </div>

      {/* Add Section Modal */}
      <Modal
        isOpen={showAddSection}
        onClose={() => setShowAddSection(false)}
        title="Add Section"
        description="Choose a section type to add to your template"
      >
        <div className="grid grid-cols-2 gap-3">
          {SECTION_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.type}
                onClick={() => addSection(type.type)}
                className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:border-primary hover:bg-background-tertiary transition-all"
              >
                <Icon className="h-6 w-6" />
                <span className="font-medium">{type.label}</span>
                <span className="text-xs text-foreground-secondary">{type.description}</span>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Template Settings"
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
          />
          <Input
            label="Description"
            value={template.description || ''}
            onChange={(e) => setTemplate({ ...template, description: e.target.value })}
          />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Public Template</p>
              <p className="text-sm text-foreground-secondary">
                Make this template available to all users
              </p>
            </div>
            <button
              onClick={() => setTemplate({ ...template, isPublic: !template.isPublic })}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                template.isPublic ? 'bg-primary' : 'bg-background-tertiary'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  template.isPublic ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleSave();
                setShowSettings(false);
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
