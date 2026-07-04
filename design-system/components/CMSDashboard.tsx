'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Database, Table, FormInput, Plus, Settings, Download, Upload } from 'lucide-react';
import { Button, Tabs, Card } from './index';
import FormBuilder, { type FormSchema, type FormField, exportFormSchema, importFormSchema } from './FormBuilder';
import DataTable, { type Column } from './DataTable';

// ─── CMS Dashboard ─────────────────────────────────────────────────────

export interface CMSDashboardProps {
  className?: string;
  onSaveForm?: (schema: FormSchema) => void;
  onSaveData?: (data: Record<string, unknown>[]) => void;
}

export default function CMSDashboard({ className, onSaveForm, onSaveData }: CMSDashboardProps) {
  const [activeView, setActiveView] = useState<'form' | 'data'>('form');
  const [formSchema, setFormSchema] = useState<FormSchema>({
    id: crypto.randomUUID(),
    title: 'New Collection',
    description: 'Describe your data collection',
    fields: [],
    submitLabel: 'Submit',
  });
  const [formData, setFormData] = useState<Record<string, unknown>[]>([]);

  // Generate columns from form schema
  const columns: Column[] = formSchema.fields
    .filter((f) => f.type !== 'heading' && f.type !== 'paragraph')
    .map((f) => ({
      key: f.id,
      label: f.label,
      sortable: true,
      filterable: true,
      align: f.type === 'number' ? 'right' : 'left' as const,
      render: (value: unknown) => {
        if (f.type === 'rating' && typeof value === 'number') {
          return <span className="text-warning">{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>;
        }
        if (f.type === 'checkbox' && typeof value === 'boolean') {
          return <span className={value ? 'text-success' : 'text-muted'}>{value ? '✓' : '—'}</span>;
        }
        return <span className="truncate max-w-[200px] block">{String(value ?? '')}</span>;
      },
    }));

  // Export data
  const handleExport = useCallback(() => {
    const data = JSON.stringify({ schema: formSchema, data: formData }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formSchema.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [formSchema, formData]);

  return (
    <div className={cn('flex flex-col border border-border rounded-xl overflow-hidden bg-surface h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface2/50">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-accent" />
          <span className="text-xs font-semibold text-foreground">{formSchema.title}</span>
          <span className="text-[9px] text-muted">{formData.length} records</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="xs" onClick={handleExport}>
            <Download size={10} /> Export
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs
        tabs={[
          { id: 'form', label: 'Form Builder', icon: <FormInput size={11} /> },
          { id: 'data', label: 'Data Table', icon: <Table size={11} />, count: formData.length },
        ]}
        activeTab={activeView}
        onChange={(id) => setActiveView(id as 'form' | 'data')}
        variant="segmented"
        size="sm"
        className="mx-3 my-2"
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'form' ? (
          <FormBuilder schema={formSchema} onChange={(s) => { setFormSchema(s); onSaveForm?.(s); }} />
        ) : (
          <div className="p-2 h-full">
            <DataTable
              columns={columns}
              data={formData}
              pageSize={8}
              searchable
              searchPlaceholder="Search records..."
              emptyMessage="No data yet. Submit the form to add records."
              compact
            />
          </div>
        )}
      </div>

      {/* Data Actions */}
      {activeView === 'data' && formData.length > 0 && (
        <div className="px-3 py-2 border-t border-border flex items-center gap-2 text-[9px] text-muted">
          <span>{formData.length} total records</span>
          <span className="w-px h-3 bg-border mx-0.5" />
          <span>{formSchema.fields.length} fields</span>
        </div>
      )}
    </div>
  );
}
