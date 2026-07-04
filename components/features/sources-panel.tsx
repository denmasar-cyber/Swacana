'use client';

import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Database, Plus, CheckCircle, AlertCircle, Loader2,
  RefreshCw, Trash2, FileText, ExternalLink, Sliders,
} from 'lucide-react';
import { db, type Dataset } from '@/lib/db';
import { cn } from '@/lib/utils';
import { searchDatasets, getDatasetSplits, fetchAllRows, type HFDatasetSummary, type HFSplitInfo } from '@/lib/rag/hf-datasets';
import { autoDetectTextFields, chunkRows } from '@/lib/rag/chunking';
import { embedBatch } from '@/lib/embedding-engine';

interface Props {
  noteId: string;
}

export default function SourcesPanel({ noteId }: Props) {
  const datasets = useLiveQuery(
    () => db.datasets.where('noteId').equals(noteId).toArray(),
    [noteId],
    [],
  );

  const [showImportModal, setShowImportModal] = useState(false);
  const [importDatasetId, setImportDatasetId] = useState('');
  const [importConfig, setImportConfig] = useState('');
  const [importSplit, setImportSplit] = useState('train');
  const [rowLimit, setRowLimit] = useState(500);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  // ── Toggle dataset enabled/disabled ──

  const handleToggle = useCallback(async (datasetId: string) => {
    const ds = await db.datasets.get(datasetId);
    if (!ds) return;
    await db.datasets.update(datasetId, { isEnabled: !ds.isEnabled });
  }, []);

  // ── Delete dataset ──

  const handleDelete = useCallback(async (datasetId: string) => {
    if (!confirm('Remove this dataset and all its chunks/embeddings?')) return;
    const ds = await db.datasets.get(datasetId);
    if (!ds) return;
    await db.chunks.where('datasetId').equals(datasetId).delete();
    await db.embeddings.where('noteId').equals(noteId).delete();
    await db.datasets.delete(datasetId);
  }, [noteId]);

  // ── Import Dataset ──

  const handleImport = useCallback(async () => {
    if (!importDatasetId || isImporting) return;

    setIsImporting(true);
    setImportProgress('Fetching dataset info...');

    const id = crypto.randomUUID();

    try {
      // Insert dataset row
      await db.datasets.add({
        id,
        noteId,
        hfDatasetId: importDatasetId,
        hfConfig: importConfig || null,
        hfSplit: importSplit,
        textFields: [],
        rowLimit,
        totalRowsFetched: 0,
        totalChunks: 0,
        status: 'FETCHING',
        errorMessage: null,
        isEnabled: true,
        createdAt: new Date().toISOString(),
      });

      // Fetch rows
      setImportProgress(`Fetching rows from ${importDatasetId}...`);
      const rows = await fetchAllRows(
        importDatasetId,
        importConfig || null,
        importSplit,
        rowLimit,
        undefined,
        (fetched, total) => {
          setImportProgress(`Fetching rows... ${fetched}/${total}`);
        },
      );

      await db.datasets.update(id, {
        status: 'CHUNKING',
        totalRowsFetched: rows.length,
      });

      // Auto-detect text fields
      setImportProgress('Detecting text fields...');
      const textFields = rows.length > 0 ? autoDetectTextFields(rows[0]) : [];
      if (textFields.length === 0) {
        // Fallback: use all string fields
        const allFields = rows.length > 0 ? Object.keys(rows[0]) : [];
        textFields.push(...allFields.filter((f) => f !== 'id' && f !== '_id'));
      }

      await db.datasets.update(id, { textFields });

      // Chunk rows
      setImportProgress(`Chunking ${rows.length} rows...`);
      const chunks = chunkRows(rows, textFields);
      const chunkEntries = chunks.map((c) => ({
        id: c.id,
        datasetId: id,
        noteId,
        sourceRowIndex: c.sourceRowIndex,
        text: c.text,
        tokenCount: c.tokenCount,
      }));

      // Insert chunks in batches
      for (let i = 0; i < chunkEntries.length; i += 50) {
        await db.chunks.bulkAdd(chunkEntries.slice(i, i + 50));
      }

      await db.datasets.update(id, {
        status: 'EMBEDDING',
        totalChunks: chunkEntries.length,
      });

      // Embed chunks
      setImportProgress(`Embedding ${chunkEntries.length} chunks...`);
      const batchSize = 16;
      for (let i = 0; i < chunkEntries.length; i += batchSize) {
        const batch = chunkEntries.slice(i, i + batchSize);
        const texts = batch.map((c) => c.text);

        try {
          const vectors = await embedBatch(texts, (progress) => {
            setImportProgress(
              `Embedding: ${progress.current + i}/${chunkEntries.length} chunks...`,
            );
          });

          const embeddingEntries = batch.map((c, j) => ({
            id: c.id,
            chunkId: c.id,
            noteId,
            vector: vectors[j] || [],
            dim: 384,
            model: 'Xenova/all-MiniLM-L6-v2',
          }));

          await db.embeddings.bulkAdd(embeddingEntries);
        } catch (err) {
          console.warn('[SourcesPanel] Batch embedding error:', err);
          // Continue with next batch
        }
      }

      await db.datasets.update(id, { status: 'READY' });
      setImportProgress('Ready!');
      setShowImportModal(false);
    } catch (err) {
      await db.datasets.update(id, {
        status: 'ERROR',
        errorMessage: (err as Error).message,
      });
      setImportProgress(`Error: ${(err as Error).message}`);
    } finally {
      setIsImporting(false);
    }
  }, [importDatasetId, importConfig, importSplit, rowLimit, noteId, isImporting]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'READY':
        return <CheckCircle size={12} className="text-[#22c55e]" />;
      case 'ERROR':
        return <AlertCircle size={12} className="text-[#ef4444]" />;
      case 'FETCHING':
      case 'CHUNKING':
      case 'EMBEDDING':
        return <Loader2 size={12} className="animate-spin text-[#f59e0b]" />;
      default:
        return <Database size={12} className="text-[#6b6b80]" />;
    }
  };

  const datasetsList = datasets as Dataset[];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-muted font-semibold flex items-center gap-1.5">
            <Database size={10} />
            Sources
          </span>
          <span className="text-[9px] text-muted">{datasetsList.length} datasets</span>
        </div>

        <button onClick={() => setShowImportModal(true)} disabled={isImporting}
          className="w-full btn-primary text-[10px] font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5">
          <Plus size={10} />
          Import Dataset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {datasetsList.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted text-xs text-center px-4">
            <Database size={20} className="mb-2 opacity-30" />
            <p>No datasets imported yet.</p>
            <p className="text-[10px] mt-1">Import a HuggingFace dataset to enable RAG-powered AI responses.</p>
          </div>
        )}

        {datasetsList.map((ds) => (
          <div key={ds.id}
            className={cn('rounded-lg border px-2.5 py-2 transition-all',
              ds.isEnabled ? 'border-border bg-surface' : 'border-border/50 bg-surface/50 opacity-60')}>
            <div className="flex items-start gap-2">
              <button onClick={() => handleToggle(ds.id)}
                className={cn('mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                  ds.isEnabled ? 'bg-accent border-accent' : 'bg-transparent border-border')}>
                {ds.isEnabled && <CheckCircle size={10} className="text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {statusIcon(ds.status)}
                  <span className="text-[11px] font-medium text-foreground truncate">{ds.hfDatasetId.split('/').pop()}</span>
                  <span className="text-[8px] px-1 py-0.5 rounded bg-surface2 text-muted font-mono">{ds.hfSplit}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {ds.status === 'READY' && (
                    <>
                      <span className="text-[9px] text-muted">{ds.totalChunks} chunks</span>
                      <span className={cn('text-[9px]', ds.isEnabled ? 'text-success' : 'text-muted')}>
                        {ds.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </>
                  )}
                  {(ds.status === 'FETCHING' || ds.status === 'CHUNKING' || ds.status === 'EMBEDDING') && (
                    <span className="text-[9px] text-warning animate-pulse">{ds.status}...</span>
                  )}
                  {ds.status === 'ERROR' && (
                    <span className="text-[9px] text-danger" title={ds.errorMessage || ''}>Error</span>
                  )}
                </div>

                {ds.status === 'EMBEDDING' && ds.totalChunks > 0 && (
                  <div className="mt-1.5 h-1 bg-surface2 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-warning to-success rounded-full transition-all duration-300" style={{ width: '45%' }} />
                  </div>
                )}
              </div>

              <button onClick={() => handleDelete(ds.id)}
                className="p-1 rounded hover:bg-surface2 text-muted hover:text-danger transition-all shrink-0">
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-[480px] max-w-[90vw] animate-scale-in">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Import Dataset</h3>
              <p className="text-[10px] text-muted mt-0.5">Import from HuggingFace Datasets — auto-chunked & embedded for RAG</p>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] text-muted font-medium block mb-1">Dataset ID</label>
                <input type="text" value={importDatasetId} onChange={(e) => setImportDatasetId(e.target.value)}
                  placeholder="e.g., squad, imdb, tatsu-lab/alpaca"
                  className="w-full bg-surface2 text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 placeholder:text-muted" />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-muted font-medium block mb-1">Config (optional)</label>
                  <input type="text" value={importConfig} onChange={(e) => setImportConfig(e.target.value)}
                    placeholder="plain_text"
                    className="w-full bg-surface2 text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 placeholder:text-muted" />
                </div>
                <div className="w-28">
                  <label className="text-[10px] text-muted font-medium block mb-1">Split</label>
                  <select value={importSplit} onChange={(e) => setImportSplit(e.target.value)}
                    className="w-full bg-surface2 text-foreground text-xs rounded-lg px-3 py-2 border border-border focus:outline-none focus:border-accent">
                    <option value="train">train</option>
                    <option value="test">test</option>
                    <option value="validation">validation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted font-medium block mb-1">Row Limit: {rowLimit}</label>
                <input type="range" min={100} max={2000} step={100} value={rowLimit}
                  onChange={(e) => setRowLimit(Number(e.target.value))} className="w-full accent-accent" />
                <div className="flex justify-between text-[9px] text-muted"><span>100</span><span>2000 (max)</span></div>
              </div>

              {importProgress && (
                <div className="p-2 rounded-lg bg-surface2 text-[10px] text-accent flex items-center gap-1.5">
                  {isImporting && <Loader2 size={10} className="animate-spin" />}
                  {importProgress}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowImportModal(false)} disabled={isImporting}
                className="px-3 py-1.5 text-[10px] rounded-lg bg-surface2 text-muted hover:text-foreground border border-border transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleImport} disabled={!importDatasetId || isImporting}
                className="px-3 py-1.5 text-[10px] rounded-lg btn-primary disabled:opacity-50 flex items-center gap-1">
                {isImporting ? <><Loader2 size={10} className="animate-spin" /> Importing...</> : <><Plus size={10} /> Import & Embed</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
