import { getFunctions, httpsCallable } from 'firebase/functions';

type ActionType =
  | 'login'
  | 'logout'
  | 'staff_added'
  | 'staff_added_with_id'
  | 'staff_updated'
  | 'staff_deleted'
  | 'event_added'
  | 'event_updated'
  | 'event_deleted'
  | 'participant_added'
  | 'participant_updated'
  | 'participant_deleted'
  | 'participant_busted'
  | 'participant_added_and_seated'
  | 'assignment_added'
  | 'assignment_updated'
  | 'assignment_deleted'
  | 'worklog_added'
  | 'worklog_updated'
  | 'worklog_deleted'
  | 'clock_in'
  | 'clock_out'
  | 'application_added'
  | 'application_status_updated'
  | 'table_created_standby'
  | 'table_activated'
  | 'table_closed'
  | 'table_details_updated'
  | 'table_order_updated'
  | 'seats_reassigned_with_balancing'
  | 'participants_moved'
  | 'seat_moved'
  | 'max_seats_updated'
  | 'settings_updated'
  | 'action_failed';


export const logAction = async (action: ActionType, details: Record<string, any> = {}) => {
  // Client-side function is now just a wrapper to call the cloud function.
  // This is a "fire-and-forget" call. We don't need to wait for the result
  // and will only log errors to the console if the call fails.
  try {
    const functions = getFunctions();
    const logActionCallable = httpsCallable(functions, 'logAction');
    logActionCallable({ action, details }); // Intentionally not using await
  } catch (error) {
    console.error("Error invoking logAction function:", error);
  }
};
