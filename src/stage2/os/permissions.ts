/** Permission broker stubs for OS-native surfaces. */

export type PermissionScope =
  | 'screen'
  | 'text'
  | 'file'
  | 'camera'
  | 'mic'
  | 'device'
  | 'network'
  | 'calendar'
  | 'memory';

export type PermissionDecision = 'granted' | 'denied' | 'prompt';

export class PermissionBroker {
  private grants = new Map<string, Set<PermissionScope>>();

  grant(user_id: string, scope: PermissionScope): void {
    if (!this.grants.has(user_id)) this.grants.set(user_id, new Set());
    this.grants.get(user_id)!.add(scope);
  }

  revoke(user_id: string, scope: PermissionScope): void {
    this.grants.get(user_id)?.delete(scope);
  }

  check(user_id: string, scope: PermissionScope): PermissionDecision {
    return this.grants.get(user_id)?.has(scope) ? 'granted' : 'denied';
  }

  require(user_id: string, scope: PermissionScope): void {
    if (this.check(user_id, scope) !== 'granted') {
      throw new Error(`PERMISSION_DENIED:${scope}`);
    }
  }
}
