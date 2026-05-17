import { WorkspaceDashboard } from "./components/dashboard/WorkspaceDashboard";
import { AppShell } from "./components/layout/AppShell";
import { NewProjectPanel } from "./components/projects/NewProjectPanel";
import { ProjectView } from "./components/projects/ProjectView";
import { PluginGallery } from "./components/plugins/PluginGallery";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { useQarkoStore } from "./store/useQarkoStore";

export default function App() {
  const view = useQarkoStore((state) => state.view);

  return (
    <AppShell>
      {view === "workspace" ? <WorkspaceDashboard /> : null}
      {view === "project" ? <ProjectView /> : null}
      {view === "new-project" ? <NewProjectPanel /> : null}
      {view === "plugins" ? <PluginGallery /> : null}
      {view === "settings" ? <SettingsPanel /> : null}
    </AppShell>
  );
}
