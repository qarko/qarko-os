import { Plus, Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { defaultRules } from "../../data/mockData";
import { useQarkoStore } from "../../store/useQarkoStore";
import type { AutomationMode } from "../../types/qarko";
import { SectionHeader } from "../ui/SectionHeader";
import { StatusBadge } from "../ui/StatusBadge";

export function NewProjectPanel() {
  const { automationPolicies, createProject } = useQarkoStore();
  const [idea, setIdea] = useState("");
  const [mode, setMode] = useState<AutomationMode>("assisted");
  const [rules, setRules] = useState(defaultRules);
  const selectedPolicy = automationPolicies.find((policy) => policy.mode === mode) ?? automationPolicies[1];

  const previewName = useMemo(() => {
    const trimmed = idea.trim();
    if (!trimmed) return "새 Hermes 프로젝트";
    return trimmed.length > 34 ? `${trimmed.slice(0, 34)}...` : trimmed;
  }, [idea]);

  return (
    <div className="mx-auto max-w-6xl p-5 lg:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-normal text-moss">New project</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Hermes 작업 프로젝트 만들기</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          하고 싶은 작업, 분석할 폴더, 만들고 싶은 결과를 입력하고 QARKO OS가 어디까지 자동화할지 먼저 정하세요.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-md border border-line bg-white p-5 shadow-sm">
          <SectionHeader title="작업 목표" eyebrow="Prompt" />
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            className="min-h-40 w-full resize-none rounded-md border border-line bg-panel p-4 text-sm leading-6 outline-none focus:border-signal"
            placeholder="예: 이 폴더 구조를 분석하고 실행 가능한 다음 작업을 제안해줘."
          />
          <div className="mt-4 rounded-md bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-moss">프로젝트 미리보기</p>
            <p className="mt-2 text-base font-semibold text-ink">{previewName}</p>
            <p className="mt-1 text-xs text-stone-600">목표, 작업, 역할, 승인 범위가 자동으로 생성됩니다.</p>
          </div>
          <button
            onClick={() => createProject({ idea, mode, customRules: rules })}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            프로젝트 생성
          </button>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-sm">
          <SectionHeader title="자동화/승인 범위" eyebrow="Automation Scope" />
          <div className="grid gap-3 md:grid-cols-2">
            {automationPolicies.map((policy) => (
              <button
                key={policy.mode}
                onClick={() => setMode(policy.mode)}
                className={`rounded-md border p-4 text-left transition ${
                  mode === policy.mode ? "border-signal bg-emerald-50" : "border-line bg-white hover:bg-panel"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">{policy.label}</h3>
                  {mode === policy.mode ? <StatusBadge tone="running" label="선택됨" /> : null}
                </div>
                <p className="text-xs leading-5 text-stone-600">{policy.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-md bg-panel p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <Shield className="h-4 w-4 text-signal" />
              {selectedPolicy.label}
            </div>
            <p className="text-xs leading-5 text-stone-600">자동 허용: {selectedPolicy.allowedSummary}</p>
            <p className="text-xs leading-5 text-stone-600">승인 필요: {selectedPolicy.approvalSummary}</p>
          </div>

          {mode === "custom" ? (
            <div className="mt-4">
              <SectionHeader title="작업별 승인 규칙" eyebrow="Custom Rules" />
              <div className="grid gap-2">
                {rules.map((rule) => (
                  <label key={rule.id} className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{rule.label}</p>
                      <p className="text-xs text-stone-600">{rule.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={rule.requiresApproval}
                      onChange={() =>
                        setRules((items) =>
                          items.map((item) =>
                            item.id === rule.id ? { ...item, requiresApproval: !item.requiresApproval } : item
                          )
                        )
                      }
                      className="h-5 w-5 accent-signal"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
