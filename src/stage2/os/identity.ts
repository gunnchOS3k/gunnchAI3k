/** Shared identity abstraction for session / memory / projects. */

export interface UserIdentity {
  user_id: string;
  display_name?: string;
  session_id: string;
}

export function createIdentity(user_id: string, display_name?: string): UserIdentity {
  return {
    user_id,
    display_name,
    session_id: `sess_${user_id}_${Date.now().toString(36)}`,
  };
}
