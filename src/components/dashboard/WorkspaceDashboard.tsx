import { Activity, CheckCircle2, Clock, FolderKanban, ShieldAlert } from "lucide-react";
import { useQarkoStore } from "../../store/useQarkoStore";
import { ApprovalCard } from "../approvals/ApprovalCard";
import { ArtifactLibrary } from "../artifacts/ArtifactLibrary";
import { StatusBadge } from "../ui/StatusBadge";
import { SectionHeader } from "../ui/SectionHeader";

export function WorkspaceDashboard() {
  const { projects, approvals, artifacts, plugins, selectProject } = useQarkoStore();
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
  const activePlugins = plugins.filter((plugin) => plugin.enabled);
  const runningProjects = projects.filter((project) => project.status === "running").length;

  return (
    <div className="mx-auto max-w-7xl p-5 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-moss">Workspace dashboard</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">1인 AI 회사 상황판</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            사업 아이디어, AI 역할, 자동화 범위, 승인 요청, 산출물을 한 화면에서 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="mock" label="Hermes Mock" />
          <StatusBadge tone="running" label={`${runningProjects}개 실행 중`} />
        </div>
      </div>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        {[
          { label: "프로젝트", value: projects.length, icon: FolderKanban },
          { label: "승인 대기", value: pendingApprovals.length, icon: ShieldAlert },
          { label: "활성 플러그인", value: activePlugins.length, icon: CheckCircle2 },
          { label: "진행 로그", value: "Live", icon: Activity },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-md border border-line bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-normal text-moss">{metric.label}</span>
                <Icon className="h-4 w-4 text-signal" />
              </div>
              <p className="text-2xl font-bold text-ink">{metric.value}</p>
            </div>
          );
        })}
      </section>

      <section className="mb-6">
        <SectionHeader title="프로젝트 운영 현황" eyebrow="Projects" />
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => selectProject(project.id)}
              className="rounded-md border border-line bg-white p-4 text-left shadow-sm transition hover:border-signal"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">{project.name}</h3>
                <StatusBadge tone={project.status} />
              </div>
              <p className="mb-4 text-sm leading-5 text-stone-600">{project.idea}</p>
              <div className="flex items-center gap-2 text-xs text-moss">
                <Clock className="h-3.5 w-3.5" />
                {project.nextAction}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section>
          <SectionHeader title="승인 대기" eyebrow="Approval Queue" />
          <div className="space-y-3">
            {pendingApprovals.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} />
            ))}
          </div>
        </section>
        <section>
          <SectionHeader title="오늘의 우선순위" eyebrow="Daily Priorities" />
          <div className="rounded-md border border-line bg-white p-4 shadow-sm">
            <ol className="space-y-3 text-sm text-stone-700">
              <li>1. 자동화 범위가 맞는지 확인</li>
              <li>2. 승인 대기 작업을 처리</li>
              <li>3. 실행 로그에서 AI 작업 흐름 확인</li>
              <li>4. 새 사업 아이디어를 프로젝트로 전환</li>
            </ol>
          </div>
        </section>
      </div>

      <ArtifactLibrary artifacts={artifacts.slice(0, 3)} />
    </div>
  );
}
