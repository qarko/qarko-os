import { Boxes, CircuitBoard, FolderKanban, Plug, Settings, Sparkles, UsersRound } from "lucide-react";
import { useQarkoStore } from "../../store/useQarkoStore";
import type { AppView } from "../../types/qarko";
import { StatusBadge } from "../ui/StatusBadge";

const navItems: Array<{ view: AppView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { view: "workspace", label: "대시보드", icon: CircuitBoard },
  { view: "new-project", label: "새 프로젝트", icon: Sparkles },
  { view: "plugins", label: "플러그인", icon: Plug },
];

export function Sidebar() {
  const { workspace, projects, selectedProjectId, view, setView, selectProject } = useQarkoStore();

  return (
    <aside className="flex h-full w-full flex-col border-r border-line bg-[#f5f7f2]">
      <div className="border-b border-line p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-ink">QARKO OS</h1>
            <p className="text-xs text-moss">{workspace.name}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-5 text-stone-600">{workspace.tagline}</p>
      </div>

      <nav className="space-y-1 border-b border-line p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                active ? "bg-white text-ink shadow-sm" : "text-stone-600 hover:bg-white/70 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 thin-scrollbar">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-moss">Projects</p>
          <FolderKanban className="h-4 w-4 text-moss" />
        </div>
        <div className="space-y-2">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => selectProject(project.id)}
              className={`w-full rounded-md border p-3 text-left transition ${
                selectedProjectId === project.id && view === "project"
                  ? "border-signal bg-white shadow-sm"
                  : "border-line bg-white/60 hover:bg-white"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-sm font-semibold text-ink">{project.name}</span>
                <StatusBadge tone={project.status} />
              </div>
              <p className="line-clamp-2 text-xs leading-5 text-stone-600">{project.idea}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line p-3">
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-stone-600 hover:bg-white">
          <UsersRound className="h-4 w-4" />
          커뮤니티
        </button>
        <button
          onClick={() => setView("settings")}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${
            view === "settings" ? "bg-white font-medium text-ink shadow-sm" : "text-stone-600 hover:bg-white"
          }`}
        >
          <Settings className="h-4 w-4" />
          설정
        </button>
      </div>
    </aside>
  );
}
