import { Activity, CheckCircle2, Clock, FolderKanban, ShieldAlert } from "lucide-react";
import { useQarkoStore } from "../../store/useQarkoStore";
import { ApprovalCard } from "../approvals/ApprovalCard";
import { ArtifactLibrary } from "../artifacts/ArtifactLibrary";
import { SectionHeader } from "../ui/SectionHeader";
import { StatusBadge } from "../ui/StatusBadge";

export function WorkspaceDashboard() {
  const { projects, approvals, artifacts, plugins, actionNotice, selectProject } = useQarkoStore();
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
  const activePlugins = plugins.filter((plugin) => plugin.enabled);
  const runningProjects = projects.filter((project) => project.status === "running").length;

  return (
    <div className="mx-auto max-w-6xl p-5 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-moss">Workspace dashboard</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">1인 AI 회사 운영 현황</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            사업 아이디어, AI 역할, 승인 요청, 산출물, 피드백을 한 화면에서 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="mock" label="Hermes Mock" />
          <StatusBadge tone="running" label={`${runningProjects}개 실행 중`} />
        </div>
      </div>

      <div className="mb-6 rounded-md border border-line bg-white p-4 text-sm leading-6 text-stone-700 shadow-sm">
        <span className="font-semibold text-ink">상태 안내: </span>
        {actionNotice}
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
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => (
            <button key={project.id} onClick={() => selectProject(project.id)} className="rounded-md border border-line bg-white p-4 text-left shadow-sm transition hover:border-signal">
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

      <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section>
          <SectionHeader title="승인 대기" eyebrow="Approval Queue" />
          <div className="space-y-3">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.map((approval) => <ApprovalCard key={approval.id} approval={approval} />)
            ) : (
              <div className="rounded-md border border-dashed border-line bg-white p-5 text-sm leading-6 text-stone-600 shadow-sm">
                <p className="font-semibold text-ink">승인 대기 작업이 없습니다.</p>
                <p className="mt-1">외부 게시, 비용 발생, 삭제 같은 위험 작업이 생기면 이곳에 표시됩니다.</p>
              </div>
            )}
          </div>
        </section>
        <section>
          <SectionHeader title="오늘의 우선순위" eyebrow="Daily Priorities" />
          <div className="rounded-md border border-line bg-white p-4 shadow-sm">
            <ol className="space-y-3 text-sm text-stone-700">
              <li>1. Hermes 설정 마법사로 런타임 확인</li>
              <li>2. 베타 테스터에게 설치 파일 전달</li>
              <li>3. 피드백이 Discord로 들어오는지 확인</li>
              <li>4. Threads 홍보 프로젝트 초안 작성</li>
            </ol>
          </div>
        </section>
      </div>

      <ArtifactLibrary artifacts={artifacts.slice(0, 3)} />
    </div>
  );
}
