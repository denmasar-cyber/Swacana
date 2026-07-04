import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
}));

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    notes: {
      get: vi.fn().mockResolvedValue({ id: 'test-id', content: '', title: 'Test Note' }),
      update: vi.fn().mockResolvedValue(undefined),
    },
    chatMessages: {
      where: vi.fn().mockReturnValue({ equals: vi.fn().mockReturnValue({ sortBy: vi.fn().mockResolvedValue([]) }) }),
      add: vi.fn().mockResolvedValue(undefined),
    },
    nodes: {
      where: vi.fn().mockReturnValue({ equals: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }) }),
      get: vi.fn(),
      update: vi.fn(),
    },
    datasets: {
      where: vi.fn().mockReturnValue({ equals: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }) }),
    },
  },
}));

// Mock WebLLM
vi.mock('@/lib/webllm-client', () => ({
  isEngineLoaded: vi.fn().mockReturnValue(false),
  getCurrentModelId: vi.fn().mockReturnValue('test-model'),
  DEFAULT_MODEL_ID: 'test-model',
  type: {},
}));

// Mock RAG
vi.mock('@/lib/rag/retrieval', () => ({
  buildAugmentedPrompt: vi.fn().mockResolvedValue({ systemPrompt: '', citations: [] }),
}));

// Mock omni-client
vi.mock('@/lib/omni-client', () => ({
  streamLLM: vi.fn(),
}));

// Mock ai-requirements
vi.mock('@/lib/ai-requirements', () => ({
  autoLoadRequiredModels: vi.fn(),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NoteEditor from '@/components/features/note-editor';

describe('NoteEditor', () => {
  const defaultProps = {
    noteId: 'test-id',
    initialContent: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the editor with placeholder text', () => {
    render(<NoteEditor {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText(/tulis analisis/i);
    expect(textarea).toBeInTheDocument();
  });

  it('displays AI Tools buttons', () => {
    render(<NoteEditor {...defaultProps} />);
    
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Scrap')).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(<NoteEditor {...defaultProps} />);
    
    expect(screen.getByText(/0 karakter/i)).toBeInTheDocument();
  });

  it('updates character count on typing', async () => {
    render(<NoteEditor {...defaultProps} />);
    
    const textarea = screen.getByPlaceholderText(/tulis analisis/i);
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    
    expect(screen.getByText(/11 karakter/i)).toBeInTheDocument();
  });

  it('has expand button', () => {
    render(<NoteEditor {...defaultProps} />);
    
    expect(screen.getByTitle('Perbesar')).toBeInTheDocument();
  });

  it('renders with initial content', () => {
    render(<NoteEditor {...defaultProps} initialContent="Pre-filled content" />);
    
    const textarea = screen.getByPlaceholderText(/tulis analisis/i);
    expect(textarea).toHaveValue('Pre-filled content');
  });
});
