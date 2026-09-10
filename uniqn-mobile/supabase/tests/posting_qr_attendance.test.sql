-- 공고별 고정 QR 자동 판별·다중 날짜·15분 정합성 회귀
BEGIN;
SELECT plan(1);

DO $$
DECLARE
  v_owner uuid := gen_random_uuid();
  v_staff uuid := gen_random_uuid();
  v_workspace uuid := gen_random_uuid();
  v_posting uuid := gen_random_uuid();
  v_app uuid := gen_random_uuid();
  v_first uuid := gen_random_uuid();
  v_second uuid := gen_random_uuid();
  v_today text := to_char(clock_timestamp() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD');
  v_slot text := to_char(clock_timestamp() AT TIME ZONE 'Asia/Seoul', 'HH24:MI');
  v_result jsonb;
  v_selection_token uuid;
  v_initial_scanned_at timestamptz;
BEGIN
  INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_owner, '__sql_fixture_posting_qr_owner@test.local', '{"role":"employer"}', '{"name":"OWNER"}', now(), now()),
    (v_staff, '__sql_fixture_posting_qr_staff@test.local', '{"role":"staff"}', '{"name":"STAFF"}', now(), now());

  INSERT INTO public.users (id, email, name, role, is_active, created_at, updated_at)
  VALUES
    (v_owner, '__sql_fixture_posting_qr_owner@test.local', 'OWNER', 'employer', true, now(), now()),
    (v_staff, '__sql_fixture_posting_qr_staff@test.local', 'STAFF', 'staff', true, now(), now())
  ON CONFLICT (id) DO UPDATE SET is_active = true;

  INSERT INTO public.workspaces (id, name, owner_id, created_at, updated_at)
  VALUES (v_workspace, '__sql_fixture_posting_qr_ws', v_owner, now(), now());
  INSERT INTO public.job_postings (
    id, owner_id, workspace_id, title, total_positions, filled_positions, status, created_at, updated_at
  ) VALUES (v_posting, v_owner, v_workspace, '__sql_fixture: posting qr', 5, 2, 'active', now(), now());
  INSERT INTO public.applications (
    id, job_posting_id, applicant_id, applicant_name, status, created_at, updated_at
  ) VALUES (v_app, v_posting, v_staff, 'STAFF', 'confirmed', now(), now());
  INSERT INTO public.work_logs (
    id, application_id, assignment_group_id, staff_id, job_posting_id, date,
    status, role, time_slot, is_fixed_posting, payroll_status, created_at, updated_at
  ) VALUES
    (v_first, v_app, 'a', v_staff, v_posting, v_today, 'scheduled', 'staff', v_slot, false, 'pending', now(), now()),
    (v_second, v_app, 'b', v_staff, v_posting, v_today, 'scheduled', 'staff', v_slot, false, 'pending', now(), now());

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);

  -- 후보가 둘이면 임의 처리하지 않는다.
  v_result := public.process_posting_qr_attendance(v_posting, v_staff, NULL);
  IF v_result->>'error' <> 'selection_required'
     OR jsonb_array_length(v_result->'candidates') <> 2 THEN
    RAISE EXCEPTION 'selection contract failed: %', v_result;
  END IF;
  v_selection_token := (v_result->>'selection_token')::uuid;
  SELECT scanned_at INTO v_initial_scanned_at
  FROM public.qr_attendance_selections WHERE token = v_selection_token;

  -- 선택한 행만 출근하며 서버 원본/15분 적용 시각이 함께 남는다.
  v_result := public.process_posting_qr_attendance(
    v_posting, v_staff, v_first, v_selection_token
  );
  IF NOT (v_result->>'success')::boolean OR v_result->>'action' <> 'checkIn' THEN
    RAISE EXCEPTION 'selected check-in failed: %', v_result;
  END IF;
  IF (v_result->>'scanned_at')::timestamptz IS DISTINCT FROM v_initial_scanned_at THEN
    RAISE EXCEPTION 'initial server scan timestamp was not preserved: %', v_result;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.work_logs
    WHERE id = v_first
      AND check_in_scanned_at IS NOT NULL
      AND mod(extract(epoch FROM check_in_ts)::bigint, 900) = 0
  ) THEN
    RAISE EXCEPTION 'raw/applied check-in invariant failed';
  END IF;

  -- nullable payroll_status is still unsettled and must remain QR-eligible.
  UPDATE public.work_logs
  SET status = 'checked_out'
  WHERE id = v_first;
  UPDATE public.work_logs
  SET payroll_status = NULL
  WHERE id = v_second;
  v_result := public.process_posting_qr_attendance(v_posting, v_staff, NULL, NULL);
  IF NOT (v_result->>'success')::boolean
     OR v_result->>'work_log_id' <> v_second::text THEN
    RAISE EXCEPTION 'nullable payroll status was excluded: %', v_result;
  END IF;

  -- A pre-existing invalid row must permit unrelated repairs/settlement updates.
  ALTER TABLE public.work_logs DISABLE TRIGGER work_logs_checkout_after_checkin;
  UPDATE public.work_logs SET check_out_ts = check_in_ts WHERE id = v_first;
  ALTER TABLE public.work_logs ENABLE TRIGGER work_logs_checkout_after_checkin;
  UPDATE public.work_logs SET notes = 'legacy row remains editable' WHERE id = v_first;

  -- 같은 적용 슬롯에서 즉시 퇴근하면 0시간 기록 대신 차단한다.
  v_result := public.process_posting_qr_attendance(v_posting, v_staff, NULL);
  IF v_result->>'error' <> 'checkout_too_early' THEN
    RAISE EXCEPTION 'zero-duration checkout was not blocked: %', v_result;
  END IF;

  -- 관리자 수정과 같은 일반 시각 변경도 15분 정규화 후 duration을 재계산한다.
  UPDATE public.work_logs
  SET check_in_ts = now() - interval '1 hour 1 minute',
      check_out_ts = now()
  WHERE id = v_first;
  IF NOT EXISTS (
    SELECT 1 FROM public.work_logs
    WHERE id = v_first
      AND mod(extract(epoch FROM check_in_ts)::bigint, 900) = 0
      AND mod(extract(epoch FROM check_out_ts)::bigint, 900) = 0
      AND work_duration = round((extract(epoch FROM (check_out_ts - check_in_ts)) / 3600)::numeric, 2)
  ) THEN
    RAISE EXCEPTION 'quarter-hour/duration recompute invariant failed';
  END IF;

  DELETE FROM public.work_logs WHERE id IN (v_first, v_second);
  DELETE FROM public.applications WHERE id = v_app;
  DELETE FROM public.job_postings WHERE id = v_posting;
  DELETE FROM public.workspaces WHERE owner_id = v_owner;
  DELETE FROM auth.users WHERE id IN (v_owner, v_staff);
END $$;

SELECT pass('POSTING_QR_ATTENDANCE_TEST_PASSED');
SELECT * FROM finish();
ROLLBACK;
