'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Type, AlignLeft, List, CheckSquare, Calendar, Hash,
  Image, Upload, Mail, Phone, Globe, Star,
  GripVertical, Plus, Trash2, Copy, ChevronUp,
} from 'lucide-react';

// ─── Field Types ────────────────────────────────────────────────────────

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'email' | 'phone'
  | 'select' | 'checkbox' | 'radio' | 'date' | 'file'
  | 'url' | 'rating' | 'heading' | 'paragraph';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  defaultValue?: string;
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitLabel: string;
}

// ─── Field Type Config ──────────────────────────────────────────────────

const FIELD_TYPES: Record<FieldType, { icon: React.ReactNode; label: string; color: string }> = {
  text: { icon: <Type size={12} />, label: 'Text', color: 'text-accent' },
  textarea: { icon: <AlignLeft size={12} />, label: 'Text Area', color: 'text-accent2' },
  number: { icon: <Hash size={12} />, label: 'Number', color: 'text-info' },
  email: { icon: <Mail size={12} />, label: 'Email', color: 'text-info' },
  phone: { icon: <Phone size={12} />, label: 'Phone', color: 'text-info' },
  select: { icon: <List size={12} />, label: 'Select', color: 'text-warning' },
  checkbox: { icon: <CheckSquare size={12} />, label: 'Checkbox', color: 'text-success' },
  radio: { icon: <Star size={12} />, label: 'Radio', color: 'text-warning' },
  date: { icon: <Calendar size={12} />, label: 'Date', color: 'text-info' },
  file: { icon: <Upload size={12} />, label: 'File Upload', color: 'text-danger' },
  url: { icon: <Globe size={12} />, label: 'URL', color: 'text-info' },
  rating: { icon: <Star size={12} />, label: 'Rating', color: 'text-warning' },
  heading: { icon: <Type size={12} />, label: 'Heading', color: 'text-foreground' },
  paragraph: { icon: <AlignLeft size={12} />, label: 'Paragraph', color: 'text-muted' },
};

// ─── Form Builder Component ─────────────────────────────────────────────

export interface FormBuilderProps {
  schema?: FormSchema;
  onChange?: (schema: FormSchema) => void;
  onSave?: (schema: FormSchema) => void;
  readOnly?: boolean;
  className?: string;
}

export default function FormBuilder({ schema: initialSchema, onChange, onSave, readOnly = false, className }: FormBuilderProps) {
  const [schema, setSchema] = useState<FormSchema>(initialSchema || {
    id: crypto.randomUUID(),
    title: 'Untitled Form',
    description: '',
    fields: [],
    submitLabel: 'Submit',
  });

  const [activeField, setActiveField] = useState<string | null>(null);

  const updateSchema = useCallback((updated: FormSchema) => {
    setSchema(updated);
    onChange?.(updated);
  }, [onChange]);

  const addField = useCallback((type: FieldType) => {
    const field: FormField = {
      id: crypto.randomUUID(),
      type,
      label: FIELD_TYPES[type].label,
      placeholder: `Enter ${FIELD_TYPES[type].label.toLowerCase()}...`,
      required: false,
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
    };
    updateSchema({ ...schema, fields: [...schema.fields, field] });
    setActiveField(field.id);
  }, [schema, updateSchema]);

  const removeField = useCallback((fieldId: string) => {
    updateSchema({ ...schema, fields: schema.fields.filter((f) => f.id !== fieldId) });
  }, [schema, updateSchema]);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    updateSchema({
      ...schema,
      fields: schema.fields.map((f) => f.id === fieldId ? { ...f, ...updates } : f),
    });
  }, [schema, updateSchema]);

  const moveField = useCallback((index: number, direction: 'up' | 'down') => {
    const newFields = [...schema.fields];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newFields.length) return;
    [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
    updateSchema({ ...schema, fields: newFields });
  }, [schema, updateSchema]);

  // ── Render Form Preview ──
  const renderFieldPreview = (field: FormField, index: number) => {
    const fType = FIELD_TYPES[field.type];
    return (
      <div
        key={field.id}
        className={cn(
          'group relative p-3 rounded-xl border transition-all cursor-pointer',
          activeField === field.id ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-accent/30',
        )}
        onClick={() => setActiveField(field.id)}
      >
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <div className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-muted">
            <GripVertical size={12} />
          </div>

          {/* Field Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={cn(fType.color)}>{fType.icon}</span>
              <span className="text-[10px] font-semibold text-foreground">{field.label}</span>
              {field.required && <span className="text-[9px] text-danger">*</span>}
            </div>

            {/* Field type preview */}
            {field.type === 'heading' ? (
              <h3 className="text-sm font-bold text-foreground">{field.placeholder}</h3>
            ) : field.type === 'paragraph' ? (
              <p className="text-[10px] text-muted">{field.placeholder}</p>
            ) : field.type === 'rating' ? (
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={12} className="text-muted/30" />
                ))}
              </div>
            ) : field.type === 'select' ? (
              <div className="flex items-center gap-1 text-[10px] text-muted bg-surface2 px-2 py-1 rounded-lg border border-border">
                <span>{field.options?.[0] || 'Select...'}</span>
                <ChevronUp size={10} className="ml-auto rotate-180" />
              </div>
            ) : (
              <div className="text-[10px] text-muted/60 bg-surface2 px-2 py-1.5 rounded-lg border border-border">
                {field.placeholder}
              </div>
            )}
          </div>

          {/* Actions */}
          {!readOnly && (
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }}
                className="p-1 rounded hover:bg-surface2 text-muted hover:text-foreground transition-all"
                disabled={index === 0}>
                <ChevronUp size={10} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }}
                className="p-1 rounded hover:bg-surface2 text-muted hover:text-foreground transition-all"
                disabled={index === schema.fields.length - 1}>
                <ChevronUp size={10} className="rotate-180" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                className="p-1 rounded hover:bg-surface2 text-muted hover:text-danger transition-all">
                <Trash2 size={10} />
              </button>
            </div>
          )}
        </div>

        {/* Field Settings (expanded) */}
        {activeField === field.id && !readOnly && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2 animate-fade-in">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[8px] text-muted uppercase tracking-wider font-semibold">Label</label>
                <input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })}
                  className="w-full bg-surface2 text-foreground text-[10px] px-2 py-1 rounded-lg border border-border" />
              </div>
              {(field.type === 'text' || field.type === 'textarea') && (
                <div className="flex-1">
                  <label className="text-[8px] text-muted uppercase tracking-wider font-semibold">Placeholder</label>
                  <input value={field.placeholder || ''} onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                    className="w-full bg-surface2 text-foreground text-[10px] px-2 py-1 rounded-lg border border-border" />
                </div>
              )}
            </div>

            {(field.type === 'select' || field.type === 'radio') && (
              <div>
                <label className="text-[8px] text-muted uppercase tracking-wider font-semibold block mb-1">Options</label>
                {field.options?.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1 mb-1">
                    <input value={opt} onChange={(e) => {
                      const newOpts = [...(field.options || [])];
                      newOpts[i] = e.target.value;
                      updateField(field.id, { options: newOpts });
                    }}
                      className="flex-1 bg-surface2 text-foreground text-[10px] px-2 py-1 rounded-lg border border-border" />
                    <button onClick={() => updateField(field.id, { options: field.options?.filter((_, j) => j !== i) })}
                      className="p-1 rounded hover:bg-surface2 text-muted hover:text-danger">
                      <Trash2 size={8} />
                    </button>
                  </div>
                ))}
                <button onClick={() => updateField(field.id, { options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })}
                  className="text-[9px] text-accent hover:text-accent/80 mt-1 flex items-center gap-1">
                  <Plus size={10} /> Add Option
                </button>
              </div>
            )}

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })}
                className="w-3 h-3 rounded border-border accent-accent" />
              <span className="text-[9px] text-muted">Required</span>
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto">
          <span className="text-[8px] text-muted uppercase tracking-wider font-semibold mr-1 shrink-0">Fields:</span>
          {(Object.entries(FIELD_TYPES) as [FieldType, typeof FIELD_TYPES[FieldType]][]).map(([type, config]) => (
            <button key={type} onClick={() => addField(type)}
              className="flex items-center gap-1 px-2 py-1 text-[9px] rounded-lg bg-surface2 text-muted hover:text-foreground hover:bg-surface3 border border-border transition-all shrink-0">
              <span className={config.color}>{config.icon}</span>
              {config.label}
            </button>
          ))}
        </div>
      )}

      {/* Form Preview */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Form Header */}
        <div className="mb-3">
          {readOnly ? (
            <h2 className="text-sm font-bold text-foreground">{schema.title}</h2>
          ) : (
            <input value={schema.title} onChange={(e) => updateSchema({ ...schema, title: e.target.value })}
              className="w-full bg-transparent text-sm font-bold text-foreground focus:outline-none border-b border-transparent focus:border-accent px-0 py-0.5" />
          )}
          {schema.description && (
            <p className="text-[10px] text-muted mt-0.5">{schema.description}</p>
          )}
        </div>

        {/* Fields */}
        {schema.fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <Type size={24} className="opacity-20 mb-2" />
            <p className="text-[11px]">No fields yet</p>
            <p className="text-[9px] text-muted/60 mt-0.5">Add fields from the toolbar above</p>
          </div>
        ) : (
          schema.fields.map((field, index) => renderFieldPreview(field, index))
        )}

        {/* Submit Button */}
        {schema.fields.length > 0 && (
          <div className="pt-2">
            {readOnly ? (
              <button className="clay-btn text-xs w-full">{schema.submitLabel}</button>
            ) : (
              <input value={schema.submitLabel} onChange={(e) => updateSchema({ ...schema, submitLabel: e.target.value })}
                className="w-full text-center clay-btn text-xs" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Export Schema ──────────────────────────────────────────────────────

export function exportFormSchema(schema: FormSchema): string {
  return JSON.stringify(schema, null, 2);
}

export function importFormSchema(json: string): FormSchema | null {
  try {
    const schema = JSON.parse(json);
    if (schema && schema.fields && Array.isArray(schema.fields)) return schema;
    return null;
  } catch {
    return null;
  }
}
