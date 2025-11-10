export default async function AdminDashboard() {
  const cards = [
    { label: "Users", value: "—" },
    { label: "Staff", value: "—" },
    { label: "Products", value: "—" },
    { label: "Variants", value: "—" },
    { label: "Software", value: "—" },
    { label: "Solutions", value: "—" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-gray-600">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-4 min-h-64">
        <h2 className="font-semibold mb-2">Traffic & Orders (placeholder)</h2>
        <div className="h-40 bg-gray-50 rounded" />
      </div>
    </div>
  );
}

