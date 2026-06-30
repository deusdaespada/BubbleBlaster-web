-- BubbleBlaster - schema do Supabase
-- Rode este arquivo inteiro uma vez em: Supabase > SQL Editor > New query

-- 1. Tabela que guarda o historico de paginas processadas
create table if not exists public.blasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  language text not null,
  confidence numeric not null,
  original_path text not null,
  processed_path text not null,
  raw_text text,
  translated_text text,
  created_at timestamptz not null default now()
);

alter table public.blasts enable row level security;

drop policy if exists "Users can view their own blasts" on public.blasts;
create policy "Users can view their own blasts"
  on public.blasts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own blasts" on public.blasts;
create policy "Users can insert their own blasts"
  on public.blasts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own blasts" on public.blasts;
create policy "Users can delete their own blasts"
  on public.blasts for delete
  using (auth.uid() = user_id);

-- 2. Bucket de Storage para as imagens originais e processadas.
-- Cada usuario grava dentro de uma pasta com o proprio user_id
-- (ex: <user_id>/123_original_pagina.png), e as policies abaixo
-- garantem que cada um so acessa a propria pasta.
insert into storage.buckets (id, name, public)
values ('bubbleblaster', 'bubbleblaster', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload to their own folder" on storage.objects;
create policy "Users can upload to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'bubbleblaster'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read their own files" on storage.objects;
create policy "Users can read their own files"
  on storage.objects for select
  using (
    bucket_id = 'bubbleblaster'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own files" on storage.objects;
create policy "Users can delete their own files"
  on storage.objects for delete
  using (
    bucket_id = 'bubbleblaster'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
