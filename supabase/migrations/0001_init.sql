-- SafeShare schema for Supabase (PostgreSQL).
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

-- Profiles hold everything a user might share. One row per auth user.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  share_name text,
  email      text,
  phone      text,
  address    text,
  socials    jsonb not null default '{}'::jsonb,   -- {"twitter": "@x", ...}
  updated_at timestamptz not null default now()
);

-- A share is a timed, cancellable release of selected profile fields.
-- `token` is the unguessable capability used in the public URL / QR code.
create table if not exists public.shares (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  token          text not null unique default replace(gen_random_uuid()::text, '-', ''),  -- 128-bit random hex
  fields         text[] not null,                  -- subset of shareable field keys
  message        text,                             -- shown to the scanner once released
  cancel_message text,                             -- shown to the scanner if cancelled
  status         text not null default 'active' check (status in ('active', 'cancelled')),
  release_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  cancelled_at   timestamptz
);

alter table public.profiles enable row level security;
alter table public.shares   enable row level security;

-- Users can only ever touch their own rows.
create policy "profiles: owner only" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "shares: owner only" on public.shares
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.shares   to authenticated;
-- NOTE: anon gets NO direct table access. Public (unauthenticated) reads go
-- exclusively through the security-definer function below, which only ever
-- exposes data by unguessable token and only after the release time.

-- Public endpoint behind s.html?t=<token>. The release check happens here,
-- server-side in Postgres, so the payload cannot be read early client-side.
create or replace function public.get_public_share(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s     public.shares%rowtype;
  p     public.profiles%rowtype;
  f     text;
  v     text;
  items jsonb := '[]'::jsonb;
begin
  select * into s from public.shares where token = p_token;
  if not found then
    return null;
  end if;

  if s.status = 'cancelled' then
    return jsonb_build_object(
      'status', 'cancelled',
      'cancel_message', coalesce(nullif(s.cancel_message, ''), 'This share was cancelled by the sender.')
    );
  end if;

  if now() < s.release_at then
    return jsonb_build_object('status', 'pending', 'release_at', s.release_at);
  end if;

  select * into p from public.profiles where user_id = s.user_id;
  foreach f in array s.fields loop
    case f
      when 'name'    then v := p.share_name;
      when 'email'   then v := p.email;
      when 'phone'   then v := p.phone;
      when 'address' then v := p.address;
      else
        if p.socials ? f then v := p.socials ->> f; else v := null; end if;
    end case;
    if v is not null and v <> '' then
      items := items || jsonb_build_object('key', f, 'value', v);
    end if;
  end loop;

  return jsonb_build_object(
    'status', 'released',
    'items', items,
    'message', s.message
  );
end;
$$;

revoke all on function public.get_public_share(text) from public;
grant execute on function public.get_public_share(text) to anon, authenticated;
