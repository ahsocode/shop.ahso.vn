// app/shop/solution/[slug]/loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-4 w-48 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-2/3 bg-gray-200 rounded mb-6" />
      <div className="h-64 w-full bg-gray-200 rounded-xl mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <div className="h-44 bg-gray-200 rounded-lg" />
        <div className="h-44 bg-gray-200 rounded-lg" />
        <div className="h-44 bg-gray-200 rounded-lg" />
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}
