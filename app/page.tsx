import { Suspense } from 'react';
import KiroNetwork from '@/components/features/kiro-network';

function HomeLoadingSkeleton() {
  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar skeleton */}
      <aside className="w-64 border-r border-border bg-surface/90 shrink-0">
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface2 skeleton" />
            <div className="flex-1">
              <div className="h-4 w-24 skeleton mb-1" />
              <div className="h-2.5 w-32 skeleton" />
            </div>
          </div>
        </div>
        <div className="px-3 py-3 space-y-2">
          <div className="h-9 w-full skeleton rounded-xl" />
          <div className="h-9 w-full skeleton rounded-xl" />
        </div>
        <div className="px-3 py-3 space-y-1.5">
          <div className="h-2.5 w-16 skeleton mb-2" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-full skeleton rounded-lg" />
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/70">
          <div className="w-6 h-6 skeleton rounded-lg" />
          <div className="h-3 w-20 skeleton" />
        </header>
        <div className="flex-1 p-6">
          <div className="pinboard">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="pinboard-card">
                <div className="p-5">
                  <div className="h-4 w-3/4 skeleton mb-3" />
                  <div className="h-3 w-full skeleton mb-2" />
                  <div className="h-3 w-5/6 skeleton mb-2" />
                  <div className="h-3 w-2/3 skeleton mb-4" />
                  <div className="flex gap-1.5">
                    <div className="h-4 w-16 skeleton rounded-full" />
                    <div className="h-4 w-20 skeleton rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoadingSkeleton />}>
      <KiroNetwork />
    </Suspense>
  );
}

