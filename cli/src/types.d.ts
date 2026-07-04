/**
 * SWACANA — Type Declarations
 *
 * Module declarations for packages that don't include TypeScript types.
 */

// sql.js ships with its own types, but declare module to avoid resolution issues
// in some bundler/compiler configurations.
declare module 'sql.js' {
  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  interface Statement {
    bind(params?: any[] | Record<string, unknown>): boolean;
    step(): boolean;
    get(): any[];
    getAsObject(): Record<string, unknown>;
    getColumnNames(): string[];
    free(): boolean;
    reset(): void;
  }

  interface Database {
    run(sql: string, params?: any[]): Database;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  export type { Database, Statement };

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
}

declare module 'chokidar' {
  interface WatchOptions {
    persistent?: boolean;
    ignored?: ((path: string) => boolean) | RegExp | string[];
    ignoreInitial?: boolean;
    awaitWriteFinish?: boolean | { stabilityThreshold?: number; pollInterval?: number };
    ignorePermissionErrors?: boolean;
  }

  interface FSWatcher {
    on(event: 'add', listener: (path: string) => void): this;
    on(event: 'change', listener: (path: string) => void): this;
    on(event: 'unlink', listener: (path: string) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'ready', listener: () => void): this;
    add(path: string): void;
    unwatch(path: string): void;
    close(): Promise<void>;
    getWatched(): Record<string, string[]>;
  }

  export function watch(paths: string | string[], options?: WatchOptions): FSWatcher;
}
