-- Apply once using the Supabase SQL editor or `supabase db push`.
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'CarePlate member',
 role text not null default 'senior' check(role in ('senior','caregiver')),
 created_at timestamptz not null default now()
);
create table public.caregiver_permissions (
 id uuid primary key default gen_random_uuid(), senior_id uuid not null references auth.users(id) on delete cascade,
 invitee_email text not null, caregiver_id uuid references auth.users(id) on delete cascade,
 can_write boolean not null default true, accepted_at timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default now(), check (caregiver_id is null or caregiver_id <> senior_id)
);
create or replace function public.has_care_access(target uuid, writing boolean default false) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid()=target or exists(select 1 from public.caregiver_permissions where senior_id=target and caregiver_id=auth.uid() and accepted_at is not null and revoked_at is null and (not writing or can_write));
$$;
create table public.recipes(id text primary key,name text not null, data jsonb not null default '{}');
insert into public.recipes(id,name) values ('salmon','Lemon herb salmon bowl'),('oats','Blueberry overnight oats'),('chicken','Garden chicken & vegetables'),('apple','Apple & sunflower butter');
create table public.glucose_readings (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, created_by uuid not null references auth.users(id),
 value numeric not null check(value>0 and value<=2000), unit text not null check(unit in ('mg/dL','mmol/L')),
 context text not null check(context in ('fasting','before meal','after meal','bedtime','other')),recorded_at timestamptz not null,meal_id uuid,notes text not null default '',created_at timestamptz not null default now()
);
create table public.blood_pressure_readings (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, created_by uuid not null references auth.users(id),
 systolic integer not null check(systolic between 30 and 350), diastolic integer not null check(diastolic between 20 and 250),pulse integer not null check(pulse between 20 and 250),
 recorded_at timestamptz not null, notes text not null default '',created_at timestamptz not null default now(),check(systolic>diastolic)
);
create table public.food_preferences (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, created_by uuid not null references auth.users(id),
 allergies text[] not null default '{}',dislikes text[] not null default '{}',preferred text not null default '',restrictions text not null default '',cuisines text not null default '',ability text not null default '',max_time integer not null check(max_time between 5 and 240),budget text not null default '',servings integer not null check(servings between 1 and 20),shopping text not null default '',equipment text not null default '',diabetes_type text not null default '',guidance text not null default '',kidney_guidance text not null default '',created_at timestamptz not null default now()
);
create table public.meal_plans (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,created_by uuid not null references auth.users(id),recipe_id text not null references public.recipes(id),date date not null,slot text not null check(slot in ('Breakfast','Lunch','Dinner','Snack')),servings numeric not null check(servings>0 and servings<=20),created_at timestamptz not null default now()
);
create table public.meal_logs (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,created_by uuid not null references auth.users(id),recipe_id text references public.recipes(id),name text not null,servings numeric not null check(servings>0 and servings<=20),carbs numeric not null check(carbs>=0),recorded_at timestamptz not null,notes text not null default '',factors text not null default '',created_at timestamptz not null default now(),unique(owner_id,id)
);
alter table public.glucose_readings add foreign key(owner_id,meal_id) references public.meal_logs(owner_id,id) on delete cascade;
create table public.meal_ratings (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,created_by uuid not null references auth.users(id),meal_id uuid not null,stars integer not null check(stars between 1 and 5),enjoyed boolean not null,easy boolean not null,again boolean not null,created_at timestamptz not null default now(),foreign key(owner_id,meal_id) references public.meal_logs(owner_id,id) on delete cascade
);
create table public.shopping_lists (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,created_by uuid not null references auth.users(id),items jsonb not null check(jsonb_typeof(items)='array'),days integer not null check(days in (3,7)),created_at timestamptz not null default now()
);
create table public.caregiver_notes (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,created_by uuid not null references auth.users(id),text text not null,recorded_at timestamptz not null,created_at timestamptz not null default now()
);
create table public.pattern_observations (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,created_by uuid not null references auth.users(id),evidence jsonb not null,observation_count integer not null check(observation_count>=3),created_at timestamptz not null default now()
);
-- Clinician settings are deliberately read-only for app roles. Provision through a verified clinical process.
create table public.clinician_settings (
 owner_id uuid primary key references auth.users(id) on delete cascade,glucose_low_mg numeric,glucose_high_mg numeric,action_low_mg numeric,action_high_mg numeric,action_plan text,clinician_reference text not null,verified_at timestamptz not null,check(glucose_low_mg<glucose_high_mg)
);
create table public.audit_log (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null,actor_id uuid,table_name text not null,record_id uuid,action text not null,created_at timestamptz not null default now()
);
create or replace function public.audit_record() returns trigger language plpgsql security definer set search_path=public as $$
 begin
 if TG_OP='DELETE' then insert into public.audit_log(owner_id,actor_id,table_name,record_id,action) values(old.owner_id,auth.uid(),TG_TABLE_NAME,old.id,TG_OP); return old;
 else insert into public.audit_log(owner_id,actor_id,table_name,record_id,action) values(new.owner_id,auth.uid(),TG_TABLE_NAME,new.id,TG_OP); return new;end if;
 end $$;
do $$ declare t text; begin
 foreach t in array array['glucose_readings','blood_pressure_readings','food_preferences','meal_plans','meal_logs','meal_ratings','shopping_lists','caregiver_notes','pattern_observations'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy read_authorized on public.%I for select to authenticated using (public.has_care_access(owner_id))',t);
 execute format('create policy insert_authorized on public.%I for insert to authenticated with check (public.has_care_access(owner_id,true) and created_by=auth.uid())',t);
 execute format('create policy delete_own on public.%I for delete to authenticated using (owner_id=auth.uid())',t);
 execute format('create trigger record_audit after insert or update or delete on public.%I for each row execute function public.audit_record()',t);
 execute format('create index on public.%I(owner_id,created_at)',t);
 end loop; end $$;
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(public.has_care_access(id));
create policy profiles_insert on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
alter table public.recipes enable row level security;
create policy recipes_read on public.recipes for select using(true);
alter table public.caregiver_permissions enable row level security;
create policy grants_read on public.caregiver_permissions for select to authenticated using(senior_id=auth.uid() or caregiver_id=auth.uid() or lower(invitee_email)=lower(auth.jwt()->>'email'));
alter table public.clinician_settings enable row level security;
create policy clinical_read on public.clinician_settings for select to authenticated using(public.has_care_access(owner_id));
alter table public.audit_log enable row level security;
create policy audit_read on public.audit_log for select to authenticated using(public.has_care_access(owner_id));
create or replace function public.care_invite(email text) returns void language plpgsql security definer set search_path=public as $$
 begin
 if auth.uid() is null or email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' or lower(email)=lower(auth.jwt()->>'email') then raise exception 'Invalid invitation'; end if;
 insert into public.caregiver_permissions(senior_id,invitee_email) values(auth.uid(),lower(trim(email)));
 insert into public.audit_log(owner_id,actor_id,table_name,action) values(auth.uid(),auth.uid(),'caregiver_permissions','INVITE');
 end $$;
create or replace function public.care_accept(invitation uuid) returns void language plpgsql security definer set search_path=public as $$
 declare senior uuid;
 begin
 update public.caregiver_permissions set caregiver_id=auth.uid(),accepted_at=now() where id=invitation and lower(invitee_email)=lower(auth.jwt()->>'email') and senior_id<>auth.uid() and revoked_at is null and accepted_at is null returning senior_id into senior;
 if senior is null then raise exception 'Invitation unavailable'; end if;
 insert into public.audit_log(owner_id,actor_id,table_name,record_id,action) values(senior,auth.uid(),'caregiver_permissions',invitation,'ACCEPT');
 end $$;
create or replace function public.care_revoke(invitation uuid) returns void language plpgsql security definer set search_path=public as $$
 begin
 update public.caregiver_permissions set revoked_at=now() where id=invitation and senior_id=auth.uid();
 if not found then raise exception 'Invitation unavailable'; end if;
 insert into public.audit_log(owner_id,actor_id,table_name,record_id,action) values(auth.uid(),auth.uid(),'caregiver_permissions',invitation,'REVOKE');
 end $$;
create or replace function public.delete_my_records() returns void language plpgsql security definer set search_path=public as $$
 declare t text; begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 foreach t in array array['glucose_readings','blood_pressure_readings','meal_ratings','meal_logs','meal_plans','food_preferences','shopping_lists','caregiver_notes','pattern_observations','clinician_settings'] loop
 execute format('delete from public.%I where owner_id=$1',t) using auth.uid();end loop;
 delete from public.caregiver_permissions where senior_id=auth.uid();
 delete from public.profiles where id=auth.uid();
 -- Audit metadata contains no measurements, names, or note text. Erase user audit metadata on deletion.
 delete from public.audit_log where owner_id=auth.uid();
 end $$;
revoke all on function public.care_invite(text),public.care_accept(uuid),public.care_revoke(uuid),public.delete_my_records() from public;
grant execute on function public.care_invite(text),public.care_accept(uuid),public.care_revoke(uuid),public.delete_my_records() to authenticated;
