/** Permissioned screen/window awareness. */

import { PermissionBroker } from '../../stage2/os/permissions';

export interface ScreenContext {
  ok: boolean;
  window_title: string;
  text_excerpt: string;
  permission: string;
}

export class ScreenAwareness {
  constructor(private readonly permissions = new PermissionBroker()) {}

  getPermissions(): PermissionBroker {
    return this.permissions;
  }

  captureActive(user_id: string, fixture?: { title: string; text: string }): ScreenContext {
    if (this.permissions.check(user_id, 'screen') !== 'granted') {
      return { ok: false, window_title: '', text_excerpt: '', permission: 'denied' };
    }
    const title = fixture?.title || 'Local Editor';
    const text = fixture?.text || 'compiler error: example TS2345';
    return {
      ok: true,
      window_title: title,
      text_excerpt: text.slice(0, 2000),
      permission: 'granted',
    };
  }
}
