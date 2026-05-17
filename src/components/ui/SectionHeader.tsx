interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, eyebrow, action }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-normal text-moss">{eyebrow}</p> : null}
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}
