import type { Resource } from "@prisma/client";

export type ResourceFilters = {
  query?: string;
  tag?: string;
  phase?: string;
  language?: string;
  status?: string;
};

export function filterResources<T extends Pick<Resource, "name" | "tags" | "phase" | "language" | "status">>(
  resources: T[],
  filters: ResourceFilters
): T[] {
  const query = filters.query?.trim().toLowerCase();

  return resources.filter((resource) => {
    if (query) {
      const haystack = [resource.name, ...resource.tags, ...resource.phase]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (filters.tag && !resource.tags.includes(filters.tag)) return false;
    if (filters.phase && !resource.phase.includes(filters.phase)) return false;
    if (filters.language && resource.language !== filters.language) return false;
    if (filters.status && resource.status !== filters.status) return false;

    return true;
  });
}

export function groupResourcesByDomain(resources: Pick<Resource, "tags">[]) {
  return resources.reduce(
    (counts, resource) => {
      const tags = resource.tags.join(" ").toLowerCase();
      if (tags.includes("eda") || tags.includes("rtl") || tags.includes("verification")) {
        counts.chipEda += 1;
      } else if (tags.includes("ai") || tags.includes("agent")) {
        counts.aiAgent += 1;
      } else if (tags.includes("business") || tags.includes("finance")) {
        counts.business += 1;
      } else if (tags.includes("music") || tags.includes("dance") || tags.includes("vocal")) {
        counts.arts += 1;
      } else {
        counts.infrastructure += 1;
      }

      return counts;
    },
    {
      chipEda: 0,
      aiAgent: 0,
      business: 0,
      arts: 0,
      infrastructure: 0
    }
  );
}
