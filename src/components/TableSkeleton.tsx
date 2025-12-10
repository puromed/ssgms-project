export default function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="h-10 bg-slate-100 rounded mb-4 w-full" />
      
      {/* Rows Skeleton */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 mb-4 items-center">
          <div className="h-12 bg-slate-50 rounded w-1/4" />
          <div className="h-12 bg-slate-50 rounded w-1/4" />
          <div className="h-12 bg-slate-50 rounded w-1/4" />
          <div className="h-12 bg-slate-50 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}
