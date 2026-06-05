-- ══════════════════════════════════════════════════════════════
-- M2 — Storage para PDFs de normas
-- Bucket privado: usuarios autenticados leen/escriben; el cliente accede vía signed URL.
-- ══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('normas', 'normas', false)
on conflict (id) do nothing;

-- Lectura: cualquier usuario autenticado puede leer los PDFs del bucket.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'normas_read_auth'
  ) then
    create policy "normas_read_auth"
      on storage.objects for select to authenticated
      using (bucket_id = 'normas');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'normas_insert_auth'
  ) then
    create policy "normas_insert_auth"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'normas');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'normas_update_auth'
  ) then
    create policy "normas_update_auth"
      on storage.objects for update to authenticated
      using (bucket_id = 'normas') with check (bucket_id = 'normas');
  end if;
end$$;
