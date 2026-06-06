import { NextRequest } from "next/server";
import { ResourceStatus } from "@prisma/client";
import { z } from "zod";
import { requireUserProfile, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filterResources } from "@/lib/resources/filter";
import { parseJsonBody } from "@/lib/utils/json";

export const dynamic = "force-dynamic";

const ResourceInputSchema = z.object({
  id: z.string().min(2).optional(),
  name: z.string().min(1),
  url: z.string().url(),
  language: z.string().default("English"),
  price: z.string().default("Unknown"),
  learningDepth: z.string().default("unknown"),
  practicality: z.string().default("unknown"),
  jobMatch: z.coerce.number().min(0).max(10).default(5),
  completionThreshold: z.string().min(1),
  replacementRisk: z.string().default("unknown"),
  tags: z.array(z.string()).default([]),
  phase: z.array(z.string()).default(["review"]),
  accessChannel: z.string().default("manual"),
  notes: z.string().optional()
});

function slugResourceId(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    await requireUserProfile();
    const resources = await prisma.resource.findMany({
      orderBy: [{ jobMatch: "desc" }, { name: "asc" }]
    });

    const filtered = filterResources(resources, {
      query: request.nextUrl.searchParams.get("q") ?? undefined,
      tag: request.nextUrl.searchParams.get("tag") ?? undefined,
      phase: request.nextUrl.searchParams.get("phase") ?? undefined,
      language: request.nextUrl.searchParams.get("language") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined
    });

    return Response.json({ resources: filtered });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch (inner) {
      return Response.json(
        { error: inner instanceof Error ? inner.message : String(inner) },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUserProfile();
    const payload = await parseJsonBody(request, ResourceInputSchema);
    const id = payload.id ?? slugResourceId(payload.name);

    const resource = await prisma.resource.upsert({
      where: { id },
      update: {
        name: payload.name,
        url: payload.url,
        language: payload.language,
        price: payload.price,
        learningDepth: payload.learningDepth,
        practicality: payload.practicality,
        jobMatch: payload.jobMatch,
        completionThreshold: payload.completionThreshold,
        replacementRisk: payload.replacementRisk,
        tags: payload.tags,
        phase: payload.phase,
        accessChannel: payload.accessChannel,
        status: ResourceStatus.REVIEW,
        notes: payload.notes ?? null
      },
      create: {
        id,
        name: payload.name,
        url: payload.url,
        language: payload.language,
        price: payload.price,
        learningDepth: payload.learningDepth,
        practicality: payload.practicality,
        jobMatch: payload.jobMatch,
        completionThreshold: payload.completionThreshold,
        replacementRisk: payload.replacementRisk,
        tags: payload.tags,
        phase: payload.phase,
        accessChannel: payload.accessChannel,
        status: ResourceStatus.REVIEW,
        notes: payload.notes ?? null
      }
    });

    return Response.json({ resource });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch (inner) {
      return Response.json(
        { error: inner instanceof Error ? inner.message : String(inner) },
        { status: 500 }
      );
    }
  }
}
