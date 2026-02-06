'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(color);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(color);
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value);
    }
  };

  const presetColors = [
    '#f97066', '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#78716c', '#737373', '#ffffff',
  ];

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="mb-1.5 block text-sm font-medium">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-lg border border-border bg-background-secondary px-3 py-2 transition-colors hover:border-primary/50"
      >
        <div
          className="h-6 w-6 rounded-md border border-border"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-mono uppercase">{color}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-background-secondary p-4 shadow-xl">
          {/* Hex Input */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">
              Hex Color
            </label>
            <div className="flex gap-2">
              <div
                className="h-10 w-10 rounded-lg border border-border flex-shrink-0"
                style={{ backgroundColor: inputValue }}
              />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="#000000"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono uppercase focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Native Color Picker */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">
              Color Wheel
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-border"
            />
          </div>

          {/* Preset Colors */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">
              Presets
            </label>
            <div className="grid grid-cols-10 gap-1">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => {
                    onChange(presetColor);
                    setInputValue(presetColor);
                  }}
                  className={cn(
                    'relative h-5 w-5 rounded-md border transition-transform hover:scale-110',
                    color === presetColor ? 'border-white ring-2 ring-primary' : 'border-border'
                  )}
                  style={{ backgroundColor: presetColor }}
                >
                  {color === presetColor && (
                    <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ColorPaletteEditorProps {
  colors: string[];
  onChange: (colors: string[]) => void;
  maxColors?: number;
  label?: string;
}

export function ColorPaletteEditor({
  colors,
  onChange,
  maxColors = 6,
  label,
}: ColorPaletteEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    onChange(newColors);
  };

  const addColor = () => {
    if (colors.length < maxColors) {
      onChange([...colors, '#3b82f6']);
    }
  };

  const removeColor = (index: number) => {
    if (colors.length > 1) {
      onChange(colors.filter((_, i) => i !== index));
    }
  };

  return (
    <div>
      {label && (
        <label className="mb-2 block text-sm font-medium">{label}</label>
      )}
      <div className="flex flex-wrap gap-2">
        {colors.map((color, index) => (
          <div key={index} className="relative group">
            <ColorPicker
              color={color}
              onChange={(newColor) => handleColorChange(index, newColor)}
            />
            {colors.length > 1 && (
              <button
                type="button"
                onClick={() => removeColor(index)}
                className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {colors.length < maxColors && (
          <button
            type="button"
            onClick={addColor}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-border text-foreground-tertiary transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-foreground-tertiary">
        Click a color to edit. {maxColors - colors.length} slots remaining.
      </p>
    </div>
  );
}
