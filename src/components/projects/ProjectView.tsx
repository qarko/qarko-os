import { ArrowRight, Bot, ShieldCheck } from "lucide-react";
import { automationPolicies } from "../../data/mockData";
import { useQarkoStore } from "../../store/useQarkoStore";
import { ApprovalCard } from "../approvals/ApprovalCard";
import { ArtifactLibrary } from "../artifacts/ArtifactLibrary";
import { StatusBadge } from "../ui/StatusBadge";
import { SectionHeader } from "../ui/SectionHeader";

export function ProjectView() {
  const { projects, selectedProjectId, approvals, artifacts } = useQarkoStore();
  const project = projects.find((item) => item.id === selectedProjectId) ?? projects[0];
  const policy = automationPolicies.find((item) => item.mode === project.automationMode) ?? automationPolicies[1];
  const projectApprovals = approvals.filter((approval) => approval.projectId === project.id);
  const projectArtifacts = artifacts.filter((artifact) => artifact.projectId === project.id);

  return (
    <div className="mx-auto max-w-7xl p-5 lg:p-8">
      <div className="mb-6 rounded-md border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-moss">Active project</p>
            <h1 className="mt-1 text-3xl font-bold text-ink">{project.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{project.idea}</p>
          </div>
          <StatusBadge tone={project.status} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          <div className="rounded-md bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-moss">목표</p>
            <p className="mt-2 text-sm font-semibold text-ink">{project.goal.title}</p>
            <p className="mt-1 text-xs text-stone-600">{project.goal.metric}</p>
          </div>
          <div className="rounded-md bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-moss">자동화 범위</p>
            <p className="mt-2 text-sm font-semibold text-ink">{policy.label}</p>
            <p className="mt-1 text-xs text-stone-600">{policy.approvalSummary}</p>
          </div>
          <div className="rounded-md bg-panel p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-moss">다음 액션</p>
            <p className="mt-2 text-sm font-semibold text-ink">{project.nextAction}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section>
          <SectionHeader title="워크플로 단계" eyebrow={project.workflow.title} />
          <div className="space-y-3">
            {project.workflow.stages.map((stage, index) => (
              <div key={stage.id} className="flex items-center gap-3 rounded-md border border-line bg-white p-4 shadow-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-panel text-sm font-bold text-moss">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{stage.title}</p>
                  <p className="text-xs text-stone-600">Owner: {stage.ownerRoleId}</p>
                </div>
                <StatusBadge tone={stage.status} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="AI 역할" eyebrow="Agent Roles" />
          <div className="grid gap-3">
            {project.roles.map((role) => (
              <article key={role.id} className="rounded-md border border-line bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-signal" />
                    <h3 className="text-sm font-semibold text-ink">{role.name}</h3>
                  </div>
                  <StatusBadge tone={role.status} />
                </div>
                <p className="text-xs leading-5 text-stone-600">{role.mission}</p>
                <p className="mt-2 text-xs font-medium text-moss">{role.currentFocus}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mb-6">
        <SectionHeader title="작업 카드" eyebrow="Tasks" />
        <div className="grid gap-3 lg:grid-cols-3">
          {project.tasks.map((task) => (
            <article key={task.id} className="rounded-md border border-line bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">{task.title}</h3>
                <StatusBadge tone={task.status} />
              </div>
              <p className="text-xs leading-5 text-stone-600">{task.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-moss">
                <span>Role: {task.roleId}</span>
                {task.approvalRequired ? (
                  <span className="inline-flex items-center gap-1 text-caution">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    승인 필요
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mb-6 grid gap-6 xl:grid-cols-[0.9fr_1fr]">
        <section>
          <SectionHeader title="주요 리스크" eyebrow="Risk Review" />
          <div className="rounded-md border border-line bg-white p-4 shadow-sm">
            <ul className="space-y-3">
              {project.risks.map((risk) => (
                <li key={risk} className="flex items-start gap-2 text-sm text-stone-700">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section>
          <SectionHeader title="프로젝트 승인" eyebrow="Approval" />
          <div className="space-y-3">
            {projectApprovals.length > 0 ? (
              projectApprovals.map((approval) => <ApprovalCard key={approval.id} approval={approval} />)
            ) : (
              <div className="rounded-md border border-line bg-white p-4 text-sm text-stone-600 shadow-sm">
                현재 이 프로젝트의 승인 대기 작업은 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>

      <ArtifactLibrary artifacts={projectArtifacts.length > 0 ? projectArtifacts : artifacts.slice(0, 2)} />
    </div>
  );
}
