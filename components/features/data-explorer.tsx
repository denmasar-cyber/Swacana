'use client';

import { useState, useCallback } from 'react';
import { Search, Database, ExternalLink, Download, ChevronRight, ChevronDown, BookOpen, Brain, FileText, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

// Sample NLP/AI open source datasets (in production, this would query HuggingFace API)
interface Dataset {
  id: string;
  name: string;
  description: string;
  category: string;
  size: string;
  format: string;
  url: string;
  papers?: string[];
  license: string;
}

const DATASETS: Dataset[] = [
  {
    id: '1',
    name: 'Indonesian News Articles',
    description: 'Large collection of Indonesian news articles for NLP tasks including classification and summarization',
    category: 'Text Classification',
    size: '2.5 GB',
    format: 'JSON/CSV',
    url: 'https://huggingface.co/datasets/indonlp/indonlu',
    license: 'MIT',
  },
  {
    id: '2',
    name: 'Multilingual Wikipedia Dump',
    description: 'Wikipedia corpus in multiple languages including Indonesian for language modeling',
    category: 'Language Modeling',
    size: '15 GB',
    format: 'Parquet',
    url: 'https://huggingface.co/datasets/wikipedia',
    license: 'CC BY-SA',
  },
  {
    id: '3',
    name: 'CodeAlpaca-20k',
    description: '20k instruction-following examples for code generation fine-tuning',
    category: 'Instruction Tuning',
    size: '180 MB',
    format: 'JSON',
    url: 'https://huggingface.co/datasets/sahil2801/CodeAlpaca-20k',
    license: 'MIT',
  },
  {
    id: '4',
    name: 'OpenOrca',
    description: '1M+ GPT-4 augmented FLAN data for reasoning tasks',
    category: 'Reasoning',
    size: '2 GB',
    format: 'Parquet',
    url: 'https://huggingface.co/datasets/Open-Orca/OpenOrca',
    license: 'MIT',
  },
  {
    id: '5',
    name: 'PubMed Abstracts',
    description: '30M+ biomedical abstracts from PubMed for scientific NLP',
    category: 'Scientific NLP',
    size: '8 GB',
    format: 'XML/JSON',
    url: 'https://huggingface.co/datasets/pubmed',
    license: 'Public Domain',
  },
  {
    id: '6',
    name: 'Natural Instructions v2',
    description: 'Comprehensive collection of 1,600+ NLP tasks with instructions',
    category: 'Multi-task',
    size: '1.2 GB',
    format: 'JSON',
    url: 'https://huggingface.co/datasets/UKPLab/natural-instructions-v2',
    license: 'CC BY-NC',
  },
  {
    id: '7',
    name: 'Massive Multilingual NLU',
    description: 'Multi-lingual natural language understanding benchmark across 50+ languages',
    category: 'NLU',
    size: '500 MB',
    format: 'JSON',
    url: 'https://huggingface.co/datasets/AmazonScience/massive',
    license: 'CC BY-SA',
  },
  {
    id: '8',
    name: 'Reddit NLP Corpus',
    description: 'Large-scale Reddit comments for conversational AI and sentiment analysis',
    category: 'Conversational',
    size: '25 GB',
    format: 'Zstandard',
    url: 'https://huggingface.co/datasets/reddit',
    license: 'MIT',
  },
  {
    id: '9',
    name: 'WikiHow Instructions',
    description: '200k+ how-to articles from WikiHow for instruction following',
    category: 'Instruction Following',
    size: '400 MB',
    format: 'JSON',
    url: 'https://huggingface.co/datasets/wiki_how',
    license: 'CC BY-NC-SA',
  },
  {
    id: '10',
    name: 'SQuAD 2.0',
    description: 'Stanford Question Answering Dataset - 150k+ reading comprehension questions',
    category: 'QA',
    size: '40 MB',
    format: 'JSON',
    url: 'https://huggingface.co/datasets/squad_v2',
    license: 'MIT',
  },
];

const CATEGORIES = ['All', ...Array.from(new Set(DATASETS.map((d) => d.category)))];

export default function DataExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filtered = DATASETS.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFetch = useCallback(async (dataset: Dataset) => {
    setIsLoading(true);
    // In production, this would fetch from HuggingFace datasets API
    // For now, open the dataset page
    window.open(dataset.url, '_blank');
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Database size={12} className="text-indigo-400" />
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            NLP & AI Data Explorer
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search datasets..."
            className="w-full bg-slate-800 text-slate-200 text-[11px] rounded pl-6 pr-2 py-1.5 border border-slate-600 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded transition-colors',
                selectedCategory === cat
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Dataset list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 px-4">
            <Database size={24} className="mb-2 opacity-30" />
            <p className="text-xs text-center">No datasets found. Try a different search.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filtered.map((dataset) => (
              <div key={dataset.id}>
                <button
                  onClick={() => setExpandedId(expandedId === dataset.id ? null : dataset.id)}
                  className="w-full flex items-start gap-2 px-2 py-2 hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="mt-0.5 shrink-0">
                    {expandedId === dataset.id ? (
                      <ChevronDown size={12} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={12} className="text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {dataset.name}
                      </span>
                      <span className="text-[10px] px-1 py-0.5 rounded bg-slate-700 text-slate-400 shrink-0">
                        {dataset.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                      {dataset.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-0.5 text-[9px] text-slate-500">
                        <Hash size={9} />
                        {dataset.size}
                      </span>
                      <span className="flex items-center gap-0.5 text-[9px] text-slate-500">
                        <FileText size={9} />
                        {dataset.format}
                      </span>
                      <span className="text-[9px] text-slate-600">{dataset.license}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFetch(dataset);
                    }}
                    className="shrink-0 p-1 rounded hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-300 transition-colors relative disabled:opacity-50 disabled:cursor-wait"
                    title="Open dataset"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ExternalLink size={12} />
                    )}
                  </button>
                </button>

                {expandedId === dataset.id && (
                  <div className="px-4 pb-2 space-y-1.5">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {dataset.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleFetch(dataset)}
                        className="flex items-center gap-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors"
                      >
                        <Download size={10} />
                        Open on HuggingFace
                      </button>
                      <button className="flex items-center gap-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded transition-colors">
                        <Brain size={10} />
                        Analyze with AI
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-600">
                      <BookOpen size={9} />
                      <span>Format: {dataset.format}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-2 py-1 border-t border-slate-700 shrink-0 flex items-center justify-between">
        <span className="text-[9px] text-slate-600">
          {filtered.length} of {DATASETS.length} datasets
        </span>
        <a
          href="https://huggingface.co/datasets"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-0.5"
        >
          Browse HuggingFace <ExternalLink size={8} />
        </a>
      </div>
    </div>
  );
}
