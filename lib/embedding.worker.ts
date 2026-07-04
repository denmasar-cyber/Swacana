/**
 * Embedding Web Worker
 *
 * Runs Transformers.js feature-extraction pipeline off the main thread.
 * Communicates via postMessage:
 *   - init: Load the model
 *   - embed: Generate embedding for a single text
 *   - ready: Signal that model is loaded
 *   - result: Return embedding vector
 *   - progress: Loading progress updates
 */

let pipeline: ((texts: string | string[], options?: Record<string, unknown>) => Promise<unknown>) | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, modelId, taskId, text } = event.data;

  try {
    if (type === 'init') {
      // Dynamic import to keep worker lightweight
      const { pipeline: hfPipeline, env } = await import('@xenova/transformers');

      // Set local files to false to fetch from CDN
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      // Load the feature-extraction pipeline
      // Use quantized model for efficiency
      pipeline = await hfPipeline('feature-extraction', modelId, {
        quantized: true,
        progress_callback: (progress: { status?: string; loaded?: number; total?: number }) => {
          self.postMessage({
            type: 'progress',
            progress: {
              current: progress.loaded || 0,
              total: progress.total || 1,
              message: progress.status || 'Loading...',
            },
          });
        },
      });

      self.postMessage({ type: 'ready' });
      return;
    }

    if (type === 'embed' && pipeline) {
      const result = await pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract the embedding vector as a plain array
      const embedding = Array.from((result as { data: Float32Array }).data);

      self.postMessage({ type: 'result', taskId, embedding });
      return;
    }

    if (type === 'embed' && !pipeline) {
      self.postMessage({
        type: 'error',
        taskId,
        error: 'Pipeline not initialized. Send init first.',
      });
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      taskId,
      error: (err as Error).message,
    });
  }
};
