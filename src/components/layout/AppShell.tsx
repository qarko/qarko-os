import { ExecutionPanel } from "../execution/ExecutionPanel";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-[#0f1115] text-ink">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <div className="max-h-[42vh] overflow-y-auto border-b border-line lg:hidden thin-scrollbar">
          <Sidebar />
        </div>
        <div className="hidden min-h-0 lg:block">
          <Sidebar />
        </div>
        <main className="min-h-0 overflow-hidden bg-[#0f1115] pr-14 lg:pr-16">
          {children}
        </main>
      </div>
      <ExecutionPanel />
    </div>
  );
}
