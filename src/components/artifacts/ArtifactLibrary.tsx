import { FileText } from "lucide-react";
import type { Artifact } from "../../types/qarko";
import { SectionHeader } from "../ui/SectionHeader";

interface ArtifactLibraryProps {
  artifacts: Artifact[];
}

export function ArtifactLibrary({ artifacts }: ArtifactLibraryProps) {
  return (
    <section>
      <SectionHeader title="산출물 보관함" eyebrow="Artifacts" />
      <div className="grid gap-3 md:grid-cols-2">
        {artifacts.map((artifact) => (
          <article key={artifact.id} className="rounded-md border border-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start gap-3">
              <div className="rounded-md bg-panel p-2 text-signal">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">{artifact.title}</h3>
                <p className="text-xs text-moss">{artifact.type} · {artifact.createdAt}</p>
              </div>
            </div>
            <p className="text-xs leading-5 text-stone-600">{artifact.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
