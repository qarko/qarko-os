import { ExecutionPanel } from "../execution/ExecutionPanel";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-[#f4f5f2] text-ink">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_420px]">
        <div className="max-h-[42vh] overflow-y-auto border-b border-line lg:hidden thin-scrollbar">
          <Sidebar />
        </div>
        <div className="hidden min-h-0 lg:block">
          <Sidebar />
        </div>
        <main className="min-h-0 overflow-y-auto bg-[#f8f8f5] thin-scrollbar">
          {children}
          <section className="border-t border-line bg-[#fbfbf8] xl:hidden">
            <ExecutionPanel />
          </section>
        </main>
        <section className="hidden min-h-0 border-l border-line bg-[#fbfbf8] xl:block">
          <ExecutionPanel />
        </section>
      </div>
    </div>
  );
}
