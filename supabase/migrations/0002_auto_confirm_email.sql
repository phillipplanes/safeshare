-- Auto-confirm email addresses at the database level, so no confirmation
-- link is required: sign up -> instantly confirmed -> can log in and create
-- shares right away.
-- Run once in the Supabase SQL editor (after 0001_init.sql).

-- 1. Confirm any users that already exist but were never confirmed.
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- 2. Stamp every newly created user as confirmed.
create or replace function public.auto_confirm_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_auto_confirm on auth.users;
create trigger on_auth_user_created_auto_confirm
  before insert on auth.users
  for each row execute function public.auto_confirm_email();
