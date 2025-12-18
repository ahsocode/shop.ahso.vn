"use client";

export default function FilterLayout({
  sidebar,
  searchBar,
  topInfo,
  children,
}: {
  sidebar: React.ReactNode;
  searchBar: React.ReactNode;
  topInfo?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar - Full Width ở trên cùng */}
      <div className="w-full">
        {searchBar}
      </div>

      {/* Layout 2 cột: Sidebar trái + Content phải */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-4">
        {/* LEFT: Filter Sidebar */}
        <aside className="order-2 lg:order-1 lg:sticky lg:top-24 self-start">
          <div className="rounded-xl border bg-white shadow-sm p-3 text-sm">
            {sidebar}
          </div>
        </aside>

        {/* RIGHT: Content Area */}
        <section className="order-1 lg:order-2 flex flex-col gap-4 min-w-0">
          {topInfo}
          {children}
        </section>
      </div>
    </div>
  );
}
