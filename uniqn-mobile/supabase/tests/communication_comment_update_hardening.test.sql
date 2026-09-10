BEGIN;
SELECT plan(14);

SELECT ok(
  has_column_privilege('authenticated', 'public.board_comments', 'body', 'UPDATE'),
  'authenticated retains the comment body update used by the app');

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.board_comments', 'post_id', 'UPDATE'),
  'authenticated cannot update immutable comment routing columns');

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.board_comments', 'author_role', 'UPDATE'),
  'authenticated cannot update comment identity columns');

INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('d1000000-0000-4000-8000-000000000001', '__ccuh_owner@test.local',  '{"role":"employer"}', '{}', now(), now()),
  ('d1000000-0000-4000-8000-000000000002', '__ccuh_author@test.local', '{"role":"staff"}', '{}', now(), now()),
  ('d1000000-0000-4000-8000-000000000003', '__ccuh_other@test.local',  '{"role":"staff"}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, name, role, is_active, created_at, updated_at)
VALUES
  ('d1000000-0000-4000-8000-000000000001', '__ccuh_owner@test.local',  'owner',  'employer', true, now(), now()),
  ('d1000000-0000-4000-8000-000000000002', '__ccuh_author@test.local', 'author', 'staff',    true, now(), now()),
  ('d1000000-0000-4000-8000-000000000003', '__ccuh_other@test.local',  'other',  'staff',    true, now(), now())
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_active = true;

INSERT INTO public.workspaces (id, name, owner_id)
VALUES ('d1000000-0000-4000-8000-000000000010', '__ccuh_ws', 'd1000000-0000-4000-8000-000000000001');

INSERT INTO public.job_postings (id, title, workspace_id, owner_id, status)
VALUES ('d1000000-0000-4000-8000-000000000020', '__ccuh_job',
        'd1000000-0000-4000-8000-000000000010', 'd1000000-0000-4000-8000-000000000001', 'active');

INSERT INTO public.board_posts
  (id, board_type, title, body, author_id, author_name, author_role, visibility,
   linked_job_posting_id, is_auto_created, status, is_locked)
VALUES
  ('schedule_d1000000-0000-4000-8000-000000000020', 'schedule', '__ccuh_room', 'body',
   'd1000000-0000-4000-8000-000000000001', 'owner', 'employer', 'participants_only',
   'd1000000-0000-4000-8000-000000000020', true, 'active', false),
  ('schedule_d1000000-0000-4000-8000-000000000021', 'schedule', '__ccuh_other_room', 'body',
   'd1000000-0000-4000-8000-000000000003', 'other', 'staff', 'participants_only',
   NULL, true, 'active', false);

INSERT INTO public.board_memberships
  (user_id, post_id, job_posting_id, role, can_read, can_comment, author_id)
VALUES
  ('d1000000-0000-4000-8000-000000000002',
   'schedule_d1000000-0000-4000-8000-000000000020',
   'd1000000-0000-4000-8000-000000000020', 'confirmed', true, true,
   'd1000000-0000-4000-8000-000000000001');

INSERT INTO public.board_comments
  (id, post_id, body, author_id, author_name, author_role, status)
VALUES
  ('d1000000-0000-4000-8000-000000000030',
   'schedule_d1000000-0000-4000-8000-000000000020', 'original',
   'd1000000-0000-4000-8000-000000000002', 'author', 'staff', 'active');

SELECT set_config('request.jwt.claims',
  jsonb_build_object('sub', 'd1000000-0000-4000-8000-000000000002',
                     'role', 'authenticated',
                     'app_metadata', jsonb_build_object('role', 'staff'))::text, true);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ UPDATE public.board_comments SET body = 'edited' WHERE id = 'd1000000-0000-4000-8000-000000000030' $$,
  'an active member can edit their own comment');

SELECT throws_ok(
  $$ UPDATE public.board_comments SET is_pinned = true, pinned_by = 'd1000000-0000-4000-8000-000000000002'
     WHERE id = 'd1000000-0000-4000-8000-000000000030' $$,
  '42501', 'PERMISSION_DENIED: authors cannot moderate comments',
  'an author cannot pin their own comment');

SELECT throws_ok(
  $$ UPDATE public.board_comments SET status = 'deleted', body = 'rewritten while deleting',
       image_attachments = '[]'::jsonb, mentioned_user_ids = '{}'::text[],
       is_pinned = false, pinned_at = NULL, pinned_by = NULL
     WHERE id = 'd1000000-0000-4000-8000-000000000030' $$,
  '42501', 'PERMISSION_DENIED: invalid comment status transition',
  'an author cannot rewrite content while deleting a comment');

RESET ROLE;
SELECT set_config('request.jwt.claims',
  jsonb_build_object('sub', 'd1000000-0000-4000-8000-000000000001',
                     'role', 'authenticated',
                     'app_metadata', jsonb_build_object('role', 'employer'))::text, true);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ UPDATE public.board_comments
     SET is_pinned = true, pinned_at = now(), pinned_by = 'd1000000-0000-4000-8000-000000000001'
     WHERE id = 'd1000000-0000-4000-8000-000000000030' $$,
  'the schedule owner can moderate a participant comment');

SELECT throws_ok(
  $$ UPDATE public.board_comments SET pinned_at = NULL
     WHERE id = 'd1000000-0000-4000-8000-000000000030' $$,
  '42501', 'PERMISSION_DENIED: pinned comments require pin metadata',
  'a pinned comment cannot lose required metadata');

SELECT lives_ok(
  $$ UPDATE public.board_comments
     SET is_pinned = false, pinned_at = NULL, pinned_by = NULL
     WHERE id = 'd1000000-0000-4000-8000-000000000030' $$,
  'the schedule owner can consistently unpin a comment');

SELECT throws_ok(
  $$ UPDATE public.board_comments SET pinned_at = now()
     WHERE id = 'd1000000-0000-4000-8000-000000000030' $$,
  '42501', 'PERMISSION_DENIED: unpinned comments cannot retain pin metadata',
  'an unpinned comment cannot retain pin metadata');

SELECT throws_ok(
  $$ UPDATE public.board_comments SET body = 'owner rewrite'
     WHERE id = 'd1000000-0000-4000-8000-000000000030' $$,
  '42501', 'PERMISSION_DENIED: post authors cannot edit comment content',
  'the schedule owner cannot rewrite participant comment content');

SELECT lives_ok(
  $$ UPDATE public.board_comments
     SET status = 'hidden', body = '관리자에 의해 숨김된 댓글입니다.',
         image_attachments = '[]'::jsonb, mentioned_user_ids = '{}'::text[],
         is_pinned = false, pinned_at = NULL, pinned_by = NULL
     WHERE id = 'd1000000-0000-4000-8000-000000000030' $$,
  'the schedule owner can hide a participant comment consistently');

SELECT throws_ok(
  $$ UPDATE public.board_comments
     SET is_pinned = true, pinned_at = now(), pinned_by = 'd1000000-0000-4000-8000-000000000001'
     WHERE id = 'd1000000-0000-4000-8000-000000000030' $$,
  '42501', 'PERMISSION_DENIED: inactive comments cannot be pinned',
  'the schedule owner cannot repin a hidden comment');

RESET ROLE;

SELECT is(
  (SELECT count(*)::int
   FROM public.notifications n
   WHERE n.type IN ('board_comment', 'board_reply', 'board_mention', 'board_locked')
     AND COALESCE(n.data ->> 'postId', '') <> ''
     AND n.data ->> 'postId' NOT LIKE 'notice_%'
     AND NOT EXISTS (
       SELECT 1 FROM public.board_posts bp WHERE bp.id = n.data ->> 'postId'
     )),
  0,
  'retired communication notifications do not point to missing posts');

SELECT * FROM finish();
ROLLBACK;
