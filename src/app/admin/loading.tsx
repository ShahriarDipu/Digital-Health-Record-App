export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      <div className="bg-white border-b border-slate-200 h-14 sm:h-16" />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-16 sm:h-20 rounded-xl bg-white border border-slate-200" />
          ))}
        </div>
        <div className="rounded-xl bg-white border border-slate-200 h-96" />
      </div>
    </div>
  );
}
