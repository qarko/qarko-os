import { Plug, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useQarkoStore } from "../../store/useQarkoStore";
import type { Plugin } from "../../types/qarko";
import { StatusBadge } from "../ui/StatusBadge";
import { SectionHeader } from "../ui/SectionHeader";

const tabs: Array<{ id: Plugin["category"]; label: string }> = [
  { id: "installed", label: "설치됨" },
  { id: "recommended", label: "추천" },
  { id: "community", label: "커뮤니티" },
];

export function PluginGallery() {
  const [activeTab, setActiveTab] = useState<Plugin["category"]>("installed");
  const { plugins, actionNotice, togglePlugin } = useQarkoStore();
  const visiblePlugins = plugins.filter((plugin) => plugin.category === activeTab);

  return (
    <div className="mx-auto max-w-7xl p-5 lg:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-moss">Plugins</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Codex식 플러그인 갤러리</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Hermes 작업을 확장할 권한, 위험, 워크플로 호환성을 확인하고 필요한 도구만 켜는 공간입니다.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${
              activeTab === tab.id ? "bg-ink text-white" : "border border-line bg-white text-stone-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-5 rounded-md border border-line bg-white p-4 text-sm leading-6 text-stone-700 shadow-sm">
        <span className="font-semibold text-ink">플러그인 상태: </span>
        {actionNotice}
      </div>

      <SectionHeader title="플러그인 카드" eyebrow={tabs.find((tab) => tab.id === activeTab)?.label} />
      <div className="grid gap-4 lg:grid-cols-2">
        {visiblePlugins.length > 0 ? (
          visiblePlugins.map((plugin) => (
            <article key={plugin.id} className="rounded-md border border-line bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-panel p-2 text-signal">
                  <Plug className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">{plugin.name}</h3>
                  <p className="mt-1 text-sm leading-5 text-stone-600">{plugin.capability}</p>
                </div>
              </div>
              <StatusBadge tone={plugin.risk} label={`위험 ${plugin.risk}`} />
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-panel p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-moss">권한</p>
                <ul className="space-y-1 text-xs text-stone-700">
                  {plugin.permissions.map((permission) => (
                    <li key={permission} className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-signal" />
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md bg-panel p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-moss">워크플로</p>
                <div className="flex flex-wrap gap-1">
                  {plugin.workflows.map((workflow) => (
                    <span key={workflow} className="rounded-full bg-white px-2 py-1 text-xs text-stone-700">
                      {workflow}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => togglePlugin(plugin.id)}
              className={`w-full rounded-md px-4 py-3 text-sm font-semibold ${
                plugin.enabled ? "border border-line bg-white text-ink" : "bg-signal text-white"
              }`}
            >
              {plugin.enabled ? "비활성화" : "연결 / 설정"}
            </button>
          </article>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-line bg-white p-6 text-sm leading-6 text-stone-600 shadow-sm lg:col-span-2">
            <p className="font-semibold text-ink">이 탭에는 아직 표시할 플러그인이 없습니다.</p>
            <p className="mt-1">커뮤니티/설치 기능이 연결되면 이 영역에 플러그인 카드가 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
