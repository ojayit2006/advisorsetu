import Sidebar from "@/components/Sidebar";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b-4 border-ink bg-cream px-6 py-3 flex items-center justify-between">
          <div>
            <div className="font-display font-bold text-sm uppercase tracking-widest text-maroon">
              MIA Wealth
            </div>
            <div className="text-xs text-ink/60">Bank / RM Console</div>
          </div>
          <div className="badge bg-ink text-cream">Mock-mode demo</div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
