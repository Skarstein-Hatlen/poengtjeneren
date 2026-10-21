-- Push-varsler for Pointmaxing. Kjøres én gang i Supabase: SQL Editor → lim inn → Run.
-- Én rad per nettleser som har slått på varsler. Ingen navn eller e-post: bare push-adressen nettleseren gir
-- (endpoint og nøkler) og butikkene brukeren følger («NO:lyko»).

create table if not exists public.varsel_abonnement (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  butikker text[] not null default '{}',
  opprettet timestamptz not null default now(),
  oppdatert timestamptz not null default now()
);

-- Ingen policyer: nettleseren kan verken lese eller skrive tabellen direkte, bare gjennom funksjonene under.
-- Den nattlige jobben (scripts/send-varsler.mjs) leser og rydder med service-nøkkelen.
alter table public.varsel_abonnement enable row level security;

create or replace function public.lagre_abonnement(p_endpoint text, p_p256dh text, p_auth text, p_butikker text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_endpoint is null or p_endpoint not like 'https://%' or length(p_endpoint) > 1000
     or p_p256dh is null or length(p_p256dh) > 200 or p_auth is null or length(p_auth) > 100
     or coalesce(array_length(p_butikker, 1), 0) > 300 then
    raise exception 'ugyldig abonnement';
  end if;
  insert into varsel_abonnement (endpoint, p256dh, auth, butikker)
  values (p_endpoint, p_p256dh, p_auth, coalesce(p_butikker, '{}'))
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, butikker = excluded.butikker, oppdatert = now();
end;
$$;

create or replace function public.slett_abonnement(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from varsel_abonnement where endpoint = p_endpoint;
$$;

revoke all on function public.lagre_abonnement(text, text, text, text[]) from public;
revoke all on function public.slett_abonnement(text) from public;
grant execute on function public.lagre_abonnement(text, text, text, text[]) to anon;
grant execute on function public.slett_abonnement(text) to anon;
