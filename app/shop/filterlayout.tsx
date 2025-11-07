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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* LEFT: Filter Sidebar */}
        <aside className="order-2 md:order-1 md:col-span-3 md:sticky md:top-24 self-start">
          <div className="rounded-xl border bg-white shadow-sm p-4">
            {sidebar}
          </div>
        </aside>

        {/* RIGHT: Content Area */}
        <section className="order-1 md:order-2 md:col-span-9 flex flex-col gap-4 min-w-0">
          {topInfo}
          {children}
        </section>
      </div>
    </div>
  );
}