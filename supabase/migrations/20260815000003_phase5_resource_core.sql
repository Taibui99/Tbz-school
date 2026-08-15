-- TBZ School — Phase 5: Resource core support
-- Index cho truy vấn "recently opened" (activity_logs action='open').

create index activity_logs_user_action_created_idx
  on public.activity_logs (user_id, action, created_at desc);