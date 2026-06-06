-- Supabase setup helpers for Aialra Life OS.
-- Run in Supabase SQL editor after Prisma migrations if you want pgvector/retrieval support.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- Optional V2 table for internal embeddings over resources, notes, reports.
create table if not exists public.semantic_chunks (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  chunk_index integer not null default 0,
  title text,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists semantic_chunks_source_idx on public.semantic_chunks(source_type, source_id);
-- Change vector dimensions if your embedding model uses a different size.
-- Use ivfflat only after enough rows exist.
-- create index semantic_chunks_embedding_idx on public.semantic_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Recommended: enable RLS for user-owned tables once Supabase Auth integration is complete.
-- MVP may run single-user private deployment behind Supabase Auth and Vercel env-protected service role.
