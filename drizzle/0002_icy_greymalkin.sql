WITH ranked AS (
  SELECT id, started_at, ROW_NUMBER() OVER (PARTITION BY workspace_id, user_id ORDER BY started_at DESC, id DESC) AS position
  FROM focus_sessions
  WHERE is_completed = false AND ended_at IS NULL
), interrupted AS (
  SELECT id, GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - started_at)))::integer) AS elapsed_seconds
  FROM ranked
  WHERE position > 1
)
UPDATE focus_sessions AS focus
SET ended_at = NOW(),
    actual_seconds = CASE
      WHEN focus.mode = 'pomodoro' THEN LEAST(focus.planned_seconds, interrupted.elapsed_seconds)
      ELSE interrupted.elapsed_seconds
    END,
    is_completed = false
FROM interrupted
WHERE focus.id = interrupted.id;
--> statement-breakpoint
CREATE UNIQUE INDEX "focus_one_active_per_user_idx" ON "focus_sessions" USING btree ("workspace_id","user_id") WHERE "focus_sessions"."is_completed" = false AND "focus_sessions"."ended_at" IS NULL;