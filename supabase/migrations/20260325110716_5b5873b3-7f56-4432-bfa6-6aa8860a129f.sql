
-- Update Jaxon Worthing's athlete profile
UPDATE athletes SET
  position = 'Fullback/Wing/Centre',
  club = 'Broncos/PBC',
  school = 'PBC'
WHERE id = 'a1111111-1111-1111-1111-111111111111';

-- Upsert Jan 2026 review (new)
INSERT INTO monthly_reviews (athlete_id, review_month, wellbeing_score, call_date, call_duration,
  performance_notes, areas_for_improvement, football_goal, personal_goal, school_life_goal,
  education_notes, parent_engagement_notes, follow_up_actions, review_source, attention_required)
VALUES (
  'a1111111-1111-1111-1111-111111111111', '2026-01-01', 4, '2026-01-15', '15min',
  'Loving training at the moment, even when he is not pumped to go, once he gets there he is excited and ready to rip in',
  'Jax mentioned that his competition at fullback has superior speed and fitness. We discussed that each player has talent and not to focus to much on the negative, however, if you can close the gap in these areas on your competitions "strengths" it will ensure you are giving yourself every opportunity to succeed',
  'Going to work on goal setting in our next catch up',
  'Will work through this in our next check-in',
  'N/A',
  'We spoke about setting standards, from little things like managing our area in the dressing shed and keeping a tidy neat "work area" as it starts to build those foundations for down the track. We also talked about getting to bed a little earlier and journalling what we are grateful for, being honest with the effort in "life" i gave today and what i can do better tomorrow.',
  'This was our first of our monthly calls and it always is a little awkward and takes time to get into a conversation that is open and flowing. In time these will become habit and honest, without Jax feeling like it is an interview and more of a chat. As far as first chats of this nature it went really well and I look forward to doing more of these to ensure we are doing everything we can to help him in his journey.',
  'Follow up action will be to see if he gave journaling a try and if he saw any value in it',
  'import', false
)
ON CONFLICT (athlete_id, review_month) DO UPDATE SET
  wellbeing_score = EXCLUDED.wellbeing_score,
  call_date = EXCLUDED.call_date,
  call_duration = EXCLUDED.call_duration,
  performance_notes = EXCLUDED.performance_notes,
  areas_for_improvement = EXCLUDED.areas_for_improvement,
  football_goal = EXCLUDED.football_goal,
  personal_goal = EXCLUDED.personal_goal,
  school_life_goal = EXCLUDED.school_life_goal,
  education_notes = EXCLUDED.education_notes,
  parent_engagement_notes = EXCLUDED.parent_engagement_notes,
  follow_up_actions = EXCLUDED.follow_up_actions,
  review_source = EXCLUDED.review_source,
  attention_required = EXCLUDED.attention_required;

-- Update Mar 2026 review (existing)
UPDATE monthly_reviews SET
  wellbeing_score = 4,
  call_date = '2026-03-04',
  call_duration = '10min',
  performance_notes = 'Enjoying training; consistent recovery; extra early-morning school sessions; focusing on communication and leadership, even under fatigue; selected for South Coast trials.',
  areas_for_improvement = 'Fitness/conditioning for fullback (Bronco); passing consistency; maintain communication when tired; manage ankle rehab properly; refine nutrition/fuelling to match training load.',
  football_goal = '100% effort in conditioning sessions + focused skill blocks (passing/communication); improve Bronco time / speed fitness.',
  personal_goal = 'Continue recovery habits; complete rehab plan; nutrition education and meal planning.',
  school_life_goal = 'Maintain balance outside footy (surfing, friends) to keep healthy headspace.',
  education_notes = 'Standards & 1% habits; accountability (what I did today / what to improve tomorrow); fuelling for performance.',
  parent_engagement_notes = 'Discussed food-based nutrition education; parents prefer natural/wholesome options—plan is to align intake with training load.',
  follow_up_actions = 'Jax to update once ankle is assessed/rehab plan set; Chris to connect Jax with sports nutritionist (education, food-based); review Bronco time/fitness once cleared.',
  review_source = 'import',
  attention_required = false
WHERE athlete_id = 'a1111111-1111-1111-1111-111111111111' AND review_month = '2026-03-01';

-- Insert goals
INSERT INTO goal_tracker (athlete_id, goal_type, goal_description, month_set, status, comments)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Football', 'Speed Fitness', 'Jan-26', 'In progress',
   'Follow up to see if the bronco time has improved and or if he feels within himself that he is fitter than our last chat. Month 2: Training strong; focusing on max effort in conditioning; ankle sprain being assessed and may limit short-term. Review Bronco time once cleared.'),
  ('a1111111-1111-1111-1111-111111111111', 'Personal', 'Nutrition / Fueling Education', 'Mar-26', 'In progress',
   'Eating better; keen to learn how much carbs/protein is needed for training volume and recovery (food-based plan; education-focused).'),
  ('a1111111-1111-1111-1111-111111111111', 'Football', 'Communication & Passing (Fullback)', 'Mar-26', 'In progress',
   'Define a good session as: high communication, tired from effort, confident passes, leadership. Keep talk up during conditioning and skill blocks.');

-- Insert parent comms (only if not existing for that date)
INSERT INTO comms_log (athlete_id, recipient_type, subject, body, sent_at)
SELECT 'a1111111-1111-1111-1111-111111111111', 'parent', 'email',
  'Discussion of what the monthly meetings will be like and consist of',
  '2026-01-14'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM comms_log WHERE athlete_id='a1111111-1111-1111-1111-111111111111' AND sent_at::date='2026-01-14');

INSERT INTO comms_log (athlete_id, recipient_type, subject, body, sent_at)
SELECT 'a1111111-1111-1111-1111-111111111111', 'parent', 'email',
  'Month 2 check-in: Jax enjoying training; recovery consistent; ankle sprain at South-East trials being assessed. Focus this month on conditioning, passing and communication. Plan to connect with sports nutritionist for food-based fuelling education aligned to training load.',
  '2026-03-04'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM comms_log WHERE athlete_id='a1111111-1111-1111-1111-111111111111' AND sent_at::date='2026-03-04');

-- Update guardian
UPDATE guardians SET parent_name = 'Geof and Cherie', parent_email = 'geofmilky@gmail.com'
WHERE athlete_id = 'a1111111-1111-1111-1111-111111111111';
