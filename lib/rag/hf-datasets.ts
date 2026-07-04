/**
 * HuggingFace Datasets Server API Client
 *
 * Uses the datasets-server.huggingface.co API to discover,
 * browse, and fetch dataset rows for in-browser ingestion.
 *
 * Endpoints:
 *   GET /splits?dataset={id}
 *   GET /rows?dataset={id}&config={c}&split={s}&offset={n}&length={100}
 *   GET https://huggingface.co/api/datasets?search={q}&sort=downloads
 */

const HF_API_BASE = 'https://huggingface.co/api/datasets';
const HF_DATASETS_SERVER = 'https://datasets-server.huggingface.co';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface HFDatasetSummary {
  _id: string;
  id: string;
  author: string;
  description: string;
  downloads: number;
  likes: number;
  lastModified: string;
  tags: string[];
  private: boolean;
  gated: boolean | string;
}

export interface HFSplitInfo {
  dataset: string;
  config: string;
  split: string;
  num_bytes: number;
  num_examples: number;
}

export interface HFRowResponse {
  features: Array<{ name: string; type: string }>;
  rows: Array<{
    row_idx: number;
    row: Record<string, unknown>;
    truncated_cells: string[];
  }>;
  num_total: number;
  num_rows_per_page: number;
  partial: boolean;
}

// ─── Search Datasets ───────────────────────────────────────────────────────

export interface DatasetSearchParams {
  search?: string;
  sort?: 'downloads' | 'likes' | 'lastModified' | 'createdAt';
  direction?: -1 | 1;
  limit?: number;
  offset?: number;
  filter?: string;
}

export async function searchDatasets(
  params: DatasetSearchParams = {},
): Promise<{ datasets: HFDatasetSummary[]; total: number }> {
  const query = new URLSearchParams();
  query.set('sort', params.sort || 'downloads');
  query.set('direction', String(params.direction || -1));
  query.set('limit', String(params.limit || 25));

  if (params.search) query.set('search', params.search);
  if (params.offset) query.set('offset', String(params.offset));
  if (params.filter) query.set('filter', params.filter);

  const url = `${HF_API_BASE}?${query.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`HuggingFace API error: ${res.status} ${res.statusText}`);
  }

  const data: HFDatasetSummary[] = await res.json();

  let total = data.length;
  const linkHeader = res.headers.get('Link');
  if (linkHeader) {
    const countMatch = linkHeader.match(/total=(\d+)/);
    if (countMatch) total = parseInt(countMatch[1], 10);
  }

  return { datasets: data, total };
}

// ─── Get Dataset Splits ────────────────────────────────────────────────────

export async function getDatasetSplits(
  datasetId: string,
): Promise<HFSplitInfo[]> {
  const url = `${HF_DATASETS_SERVER}/splits?dataset=${encodeURIComponent(datasetId)}`;
  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Dataset "${datasetId}" not found or not public.`);
    }
    throw new Error(`Datasets Server error: ${res.status}`);
  }

  const data = await res.json();
  return (data.splits || []) as HFSplitInfo[];
}

// ─── Fetch Dataset Rows ────────────────────────────────────────────────────

export interface FetchRowsOptions {
  dataset: string;
  config?: string;
  split: string;
  offset?: number;
  length?: number;
  signal?: AbortSignal;
}

export async function fetchRows(
  options: FetchRowsOptions,
): Promise<HFRowResponse> {
  const { dataset, config, split, offset = 0, length = 100, signal } = options;

  const params = new URLSearchParams();
  params.set('dataset', dataset);
  if (config) params.set('config', config);
  params.set('split', split);
  params.set('offset', String(offset));
  params.set('length', String(Math.min(length, 100))); // Max 100 per request

  const url = `${HF_DATASETS_SERVER}/rows?${params.toString()}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`No data found for ${dataset}/${config || ''}/${split}`);
    }
    if (res.status === 429) {
      throw new Error('Rate limited by HuggingFace. Retrying...');
    }
    throw new Error(`Datasets Server error: ${res.status}`);
  }

  return (await res.json()) as HFRowResponse;
}

// ─── Fetch All Rows (Paginated) ────────────────────────────────────────────

export async function fetchAllRows(
  dataset: string,
  config: string | null,
  split: string,
  rowLimit: number = 500,
  signal?: AbortSignal,
  onProgress?: (fetched: number, total: number) => void,
): Promise<Record<string, unknown>[]> {
  const allRows: Record<string, unknown>[] = [];
  let offset = 0;
  let hasMore = true;
  const pageSize = 100;
  let retries = 0;
  const maxRetries = 3;

  while (hasMore && allRows.length < rowLimit) {
    try {
      const response = await fetchRows({
        dataset,
        config: config || undefined,
        split,
        offset,
        length: pageSize,
        signal,
      });

      const pageRows = response.rows.map((r) => r.row);
      allRows.push(...pageRows);

      offset += pageSize;
      retries = 0;

      if (pageRows.length < pageSize || allRows.length >= rowLimit) {
        hasMore = false;
      }

      onProgress?.(allRows.length, rowLimit);

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;

      retries++;
      if (retries >= maxRetries) {
        throw new Error(
          `Failed to fetch after ${maxRetries} retries: ${(err as Error).message}`,
        );
      }

      // Exponential backoff
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, retries)));
    }
  }

  return allRows.slice(0, rowLimit);
}

// ─── Utility: Parse Dataset Info ───────────────────────────────────────────

export interface ParsedDatasetInfo {
  id: string;
  name: string;
  description: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
  availableSplits: HFSplitInfo[];
}

export async function getDatasetInfo(
  datasetId: string,
): Promise<ParsedDatasetInfo> {
  // Search for the dataset
  const { datasets } = await searchDatasets({ search: datasetId, limit: 1 });
  const meta = datasets.find((d) => d.id === datasetId);

  // Get splits
  let splits: HFSplitInfo[] = [];
  try {
    splits = await getDatasetSplits(datasetId);
  } catch {
    // Splits may not be available for all datasets
  }

  return {
    id: datasetId,
    name: datasetId.split('/').pop() || datasetId,
    description: meta?.description?.replace(/<[^>]*>/g, '').trim() || '',
    author: datasetId.split('/')[0] || 'unknown',
    downloads: meta?.downloads || 0,
    likes: meta?.likes || 0,
    tags: meta?.tags || [],
    availableSplits: splits,
  };
}
