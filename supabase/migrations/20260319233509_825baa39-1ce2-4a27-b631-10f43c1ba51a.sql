
-- Fix security definer views by making them security invoker
alter view public.v_athlete_score_trends set (security_invoker = on);
alter view public.v_athlete_wellbeing_trends set (security_invoker = on);

-- Fix function search_path for set_updated_at and create_wellbeing_alert
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.create_wellbeing_alert()
returns trigger language plpgsql
set search_path = public
as $$
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
