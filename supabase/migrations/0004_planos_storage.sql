-- ══════════════════════════════════════════════════════════════
-- M3b — Storage para planos (SVG/imagen) subidos por el usuario
-- Bucket público: el <img src> de la ficha debe ser fetcheable por
-- puppeteer al renderizar el PDF, sin firmar URLs.
-- ══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('planos', 'planos', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'planos_read_public'
  ) then
    create policy "planos_read_public"
      on storage.objects for select
      using (bucket_id = 'planos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'planos_insert_auth'
  ) then
    create policy "planos_insert_auth"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'planos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'planos_update_auth'
  ) then
    create policy "planos_update_auth"
      on storage.objects for update to authenticated
      using (bucket_id = 'planos') with check (bucket_id = 'planos');
  end if;
end$$;
