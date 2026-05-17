import { ExecutionPanel } from "../execution/ExecutionPanel";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-panel text-ink">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_390px]">
        <div className="hidden min-h-0 lg:block">
          <Sidebar />
        </div>
        <main className="min-h-0 overflow-y-auto thin-scrollbar">{children}</main>
        <section className="hidden min-h-0 border-l border-line bg-[#fbfbf8] xl:block">
          <ExecutionPanel />
        </section>
      </div>
    </div>
  );
}
