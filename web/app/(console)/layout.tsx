import Sidebar from "@/components/Sidebar";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-line bg-cream px-6 py-3 flex items-center justify-between">
          <div>
            <div className="font-display font-bold text-sm uppercase tracking-widest text-maroon">
              MIA Wealth
            </div>
            <div className="text-xs text-ink/60">Bank / RM Console</div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-ink/50">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" />
            Sandbox data
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
