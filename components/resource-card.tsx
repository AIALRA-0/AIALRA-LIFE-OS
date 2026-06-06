import Link from "next/link";
import { ExternalLink } from "lucide-react";

export type ResourceCardData = {
  id: string;
  name: string;
  url: string;
  language: string;
  price: string;
  learningDepth: string;
  practicality: string;
  jobMatch: number;
  completionThreshold: string;
  replacementRisk: string;
  tags: string[];
  phase: string[];
  accessChannel: string;
  status: string;
};

export function ResourceCard({ resource }: { resource: ResourceCardData }) {
  return (
    <article className="rounded border border-white/10 bg-white/[0.035] p-4 transition hover:border-primary/30 hover:bg-primary/[0.04]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/resources/${resource.id}`} className="text-base font-semibold text-white hover:text-primary">
            {resource.name}
          </Link>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {resource.tags.slice(0, 6).map((tag) => (
              <span
                key={tag}
                className="rounded border border-white/10 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          className="grid h-8 w-8 shrink-0 place-items-center rounded border border-white/10 text-muted-foreground hover:text-white"
          aria-label={`打开 ${resource.name}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">匹配度</dt>
          <dd className="font-mono text-primary">{resource.jobMatch.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">深度</dt>
          <dd className="truncate text-white">{resource.learningDepth}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">价格</dt>
          <dd className="truncate text-white">{resource.price}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">替代风险</dt>
          <dd className="truncate text-white">{resource.replacementRisk}</dd>
        </div>
      </dl>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
        {resource.completionThreshold}
      </p>
    </article>
  );
}
