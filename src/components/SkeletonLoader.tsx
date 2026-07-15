export default function SkeletonLoader() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Greeting and date skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-200/60 dark:border-zinc-800">
        <div className="space-y-3">
          <div className="h-9 w-56 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-xl"></div>
          <div className="h-4 w-40 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg"></div>
        </div>
        <div className="h-14 w-44 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl"></div>
      </div>

      {/* Grid of metric cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm space-y-4 relative overflow-hidden">
            {/* Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-zinc-100 dark:bg-zinc-800 rounded-t-2xl" />
            <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
            <div className="h-9 w-36 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg"></div>
            <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* Progress bar card skeleton */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-3.5 w-40 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
          <div className="h-7 w-14 bg-zinc-100 dark:bg-zinc-800/60 rounded-full"></div>
        </div>
        <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-full"></div>
        <div className="h-3.5 w-64 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
      </div>

      {/* 3 analytic cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm space-y-4">
            <div className="h-3 w-28 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
            <div className="h-12 w-40 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg"></div>
            <div className="h-3 w-36 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* Graph and insight skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm space-y-4 h-[300px]">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
              <div className="h-3 w-56 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
            </div>
            <div className="h-7 w-24 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg"></div>
          </div>
          <div className="w-full h-[210px] bg-gradient-to-b from-zinc-50 to-transparent dark:from-zinc-950/40 dark:to-transparent rounded-xl border border-dashed border-zinc-200/60 dark:border-zinc-800/60"></div>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm space-y-5">
          <div className="h-4 w-28 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
          <div className="space-y-4 pt-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-7 w-7 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg shrink-0"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
                  <div className="h-3 w-3/4 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
