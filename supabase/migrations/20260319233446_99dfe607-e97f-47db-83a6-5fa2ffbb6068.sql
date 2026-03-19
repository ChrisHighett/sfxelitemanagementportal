
-- 1) ENUMS
do $$ begin
  create type public.alert_type as enum (
    'wellbeing_drop', 'overdue_review', 'injury_flag', 'parent_followup',
    'selection_setback', 'low_engagement', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.alert_severity as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.alert_status as enum ('open', 'in_progress', 'resolved', 'dismissed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status as enum ('open', 'pending', 'done', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_owner_type as enum ('agent', 'athlete', 'parent', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.call_type as enum (
    'monthly_review', 'check_in', 'parent_call', 'issue_followup', 'commercial', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.parent_engagement_level as enum ('low', 'moderate', 'high');
exception when duplicate_object then null;
end $$;

-- 2) GENERIC updated_at FUNCTION
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- 3) CALL HISTORY
create table if not exists public.call_history (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  call_type public.call_type not null default 'monthly_review',
  call_date timestamptz not null default now(),
  duration_minutes int check (duration_minutes >= 0),
  conducted_by uuid references public.portal_users(id) on delete set null,
  summary text not null,
  detailed_notes text,
  outcome text,
  audio_file_url text,
  transcript_text text,
  ai_summary_json jsonb,
  parent_involved boolean not null default false,
  follow_up_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_call_history_athlete_id on public.call_history(athlete_id);
create index if not exists idx_call_history_call_date on public.call_history(call_date desc);
create index if not exists idx_call_history_call_type on public.call_history(call_type);

drop trigger if exists trg_call_history_updated_at on public.call_history;
create trigger trg_call_history_updated_at
before update on public.call_history
for each row execute function public.set_updated_at();

-- 4) ATHLETE SCORECARDS
create table if not exists public.athlete_scorecards (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  review_month date not null,
  performance_score int not null check (performance_score between 1 and 5),
  lifestyle_score int not null check (lifestyle_score between 1 and 5),
  personal_score int not null check (personal_score between 1 and 5),
  education_score int not null check (education_score between 1 and 5),
  brand_score int not null check (brand_score between 1 and 5),
  overall_score numeric(3,2) generated always as (
    round(((performance_score + lifestyle_score + personal_score + education_score + brand_score)::numeric / 5), 2)
  ) stored,
  scoring_notes text,
  created_from_review_id uuid references public.monthly_reviews(id) on delete set null,
  created_by uuid references public.portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, review_month)
);

create index if not exists idx_athlete_scorecards_athlete_id on public.athlete_scorecards(athlete_id);
create index if not exists idx_athlete_scorecards_review_month on public.athlete_scorecards(review_month desc);
create index if not exists idx_athlete_scorecards_overall_score on public.athlete_scorecards(overall_score);

drop trigger if exists trg_athlete_scorecards_updated_at on public.athlete_scorecards;
create trigger trg_athlete_scorecards_updated_at
before update on public.athlete_scorecards
for each row execute function public.set_updated_at();

-- 5) ALERTS
create table if not exists public.athlete_alerts (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  alert_type public.alert_type not null,
  severity public.alert_severity not null default 'medium',
  status public.alert_status not null default 'open',
  title text not null,
  description text,
  triggered_from_review_id uuid references public.monthly_reviews(id) on delete set null,
  triggered_from_scorecard_id uuid references public.athlete_scorecards(id) on delete set null,
  assigned_to uuid references public.portal_users(id) on delete set null,
  resolved_by uuid references public.portal_users(id) on delete set null,
  triggered_at timestamptz not null default now(),
  due_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_athlete_alerts_athlete_id on public.athlete_alerts(athlete_id);
create index if not exists idx_athlete_alerts_status on public.athlete_alerts(status);
create index if not exists idx_athlete_alerts_severity on public.athlete_alerts(severity);
create index if not exists idx_athlete_alerts_triggered_at on public.athlete_alerts(triggered_at desc);

drop trigger if exists trg_athlete_alerts_updated_at on public.athlete_alerts;
create trigger trg_athlete_alerts_updated_at
before update on public.athlete_alerts
for each row execute function public.set_updated_at();

-- 6) TASKS
create table if not exists public.athlete_tasks (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  title text not null,
  description text,
  owner_type public.task_owner_type not null,
  assigned_to_user_id uuid references public.portal_users(id) on delete set null,
  related_alert_id uuid references public.athlete_alerts(id) on delete set null,
  related_review_id uuid references public.monthly_reviews(id) on delete set null,
  related_call_id uuid references public.call_history(id) on delete set null,
  status public.task_status not null default 'open',
  priority int not null default 3 check (priority between 1 and 5),
  due_date date,
  completed_at timestamptz,
  completed_by uuid references public.portal_users(id) on delete set null,
  created_by uuid references public.portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_athlete_tasks_athlete_id on public.athlete_tasks(athlete_id);
create index if not exists idx_athlete_tasks_status on public.athlete_tasks(status);
create index if not exists idx_athlete_tasks_due_date on public.athlete_tasks(due_date);
create index if not exists idx_athlete_tasks_assigned_to on public.athlete_tasks(assigned_to_user_id);

drop trigger if exists trg_athlete_tasks_updated_at on public.athlete_tasks;
create trigger trg_athlete_tasks_updated_at
before update on public.athlete_tasks
for each row execute function public.set_updated_at();

-- 7) PARENT ENGAGEMENT (without generated column to avoid enum cast issues)
create table if not exists public.parent_engagement_scores (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  guardian_id uuid references public.guardians(id) on delete set null,
  review_month date not null,
  engagement_score int not null check (engagement_score between 1 and 5),
  engagement_level public.parent_engagement_level generated always as (
    case
      when engagement_score <= 2 then 'low'::public.parent_engagement_level
      when engagement_score = 3 then 'moderate'::public.parent_engagement_level
      else 'high'::public.parent_engagement_level
    end
  ) stored,
  responsiveness_score int check (responsiveness_score between 1 and 5),
  trust_score int check (trust_score between 1 and 5),
  involvement_score int check (involvement_score between 1 and 5),
  notes text,
  created_by uuid references public.portal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, review_month)
);

create index if not exists idx_parent_engagement_scores_athlete_id on public.parent_engagement_scores(athlete_id);
create index if not exists idx_parent_engagement_scores_review_month on public.parent_engagement_scores(review_month desc);

drop trigger if exists trg_parent_engagement_scores_updated_at on public.parent_engagement_scores;
create trigger trg_parent_engagement_scores_updated_at
before update on public.parent_engagement_scores
for each row execute function public.set_updated_at();

-- 8) TREND VIEWS
create or replace view public.v_athlete_score_trends as
select
  athlete_id, review_month, performance_score, lifestyle_score,
  personal_score, education_score, brand_score, overall_score,
  lag(overall_score) over (partition by athlete_id order by review_month) as previous_overall_score,
  overall_score - lag(overall_score) over (partition by athlete_id order by review_month) as overall_score_delta
from public.athlete_scorecards;

create or replace view public.v_athlete_wellbeing_trends as
select
  athlete_id, review_month, wellbeing_score,
  lag(wellbeing_score) over (partition by athlete_id order by review_month) as previous_wellbeing_score,
  wellbeing_score - lag(wellbeing_score) over (partition by athlete_id order by review_month) as wellbeing_delta
from public.monthly_reviews;

-- 9) AUTOMATED ALERT TRIGGER
create or replace function public.create_wellbeing_alert()
returns trigger language plpgsql as $$
begin
  if new.wellbeing_score <= 3 then
    insert into public.athlete_alerts (
      athlete_id, alert_type, severity, status, title, description, triggered_from_review_id
    ) values (
      new.athlete_id, 'wellbeing_drop',
      case when new.wellbeing_score <= 2 then 'high'::public.alert_severity else 'medium'::public.alert_severity end,
      'open', 'Wellbeing alert',
      'Wellbeing score recorded as ' || new.wellbeing_score || '/5 for review month ' || new.review_month,
      new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_monthly_reviews_wellbeing_alert on public.monthly_reviews;
create trigger trg_monthly_reviews_wellbeing_alert
after insert on public.monthly_reviews
for each row execute function public.create_wellbeing_alert();

-- 10) ENABLE RLS
alter table public.call_history enable row level security;
alter table public.athlete_scorecards enable row level security;
alter table public.athlete_alerts enable row level security;
alter table public.athlete_tasks enable row level security;
alter table public.parent_engagement_scores enable row level security;

-- 11-16) RLS POLICIES
drop policy if exists "admin full access call_history" on public.call_history;
drop policy if exists "agent manage call_history" on public.call_history;
drop policy if exists "parent_or_athlete_read_own_call_history" on public.call_history;
drop policy if exists "admin full access scorecards" on public.athlete_scorecards;
drop policy if exists "agent manage scorecards" on public.athlete_scorecards;
drop policy if exists "parent_or_athlete_read_own_scorecards" on public.athlete_scorecards;
drop policy if exists "admin full access alerts" on public.athlete_alerts;
drop policy if exists "agent manage alerts" on public.athlete_alerts;
drop policy if exists "admin full access tasks" on public.athlete_tasks;
drop policy if exists "agent manage tasks" on public.athlete_tasks;
drop policy if exists "admin full access parent_engagement" on public.parent_engagement_scores;
drop policy if exists "agent manage parent_engagement" on public.parent_engagement_scores;

create policy "admin full access call_history" on public.call_history for all using (public.is_admin()) with check (public.is_admin());
create policy "agent manage call_history" on public.call_history for all using (public.is_agent() or public.is_admin()) with check (public.is_agent() or public.is_admin());
create policy "parent_or_athlete_read_own_call_history" on public.call_history for select using (public.is_approved_parent_or_athlete_for(athlete_id));

create policy "admin full access scorecards" on public.athlete_scorecards for all using (public.is_admin()) with check (public.is_admin());
create policy "agent manage scorecards" on public.athlete_scorecards for all using (public.is_agent() or public.is_admin()) with check (public.is_agent() or public.is_admin());
create policy "parent_or_athlete_read_own_scorecards" on public.athlete_scorecards for select using (public.is_approved_parent_or_athlete_for(athlete_id));

create policy "admin full access alerts" on public.athlete_alerts for all using (public.is_admin()) with check (public.is_admin());
create policy "agent manage alerts" on public.athlete_alerts for all using (public.is_agent() or public.is_admin()) with check (public.is_agent() or public.is_admin());

create policy "admin full access tasks" on public.athlete_tasks for all using (public.is_admin()) with check (public.is_admin());
create policy "agent manage tasks" on public.athlete_tasks for all using (public.is_agent() or public.is_admin()) with check (public.is_agent() or public.is_admin());

create policy "admin full access parent_engagement" on public.parent_engagement_scores for all using (public.is_admin()) with check (public.is_admin());
create policy "agent manage parent_engagement" on public.parent_engagement_scores for all using (public.is_agent() or public.is_admin()) with check (public.is_agent() or public.is_admin());
