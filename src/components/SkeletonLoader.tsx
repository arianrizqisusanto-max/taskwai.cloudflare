export default function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Greeting and date skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg"></div>
          <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg"></div>
        </div>
          <div className="h-5 w-36 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg"></div>
      </div>

      {/* Grid of cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm space-y-4">
            <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
            <div className="h-8 w-36 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
            <div className="h-3 w-28 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* Big progress card skeleton */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm space-y-4">
        <div className="flex justify-between">
          <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
          <div className="h-4 w-12 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
        </div>
        <div className="h-6 w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-full"></div>
        <div className="h-4 w-56 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
      </div>

      {/* Graph and details skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm space-y-4 h-[300px]">
          <div className="h-4 w-36 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
          <div className="w-full h-[220px] bg-zinc-50 dark:bg-zinc-950/40 rounded-lg"></div>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 shadow-sm space-y-4">
          <div className="h-4 w-28 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
          <div className="space-y-3 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1">
                <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
                <div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800/60 rounded-md"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
