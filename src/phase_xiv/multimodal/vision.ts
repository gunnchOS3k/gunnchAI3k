/** Permissioned vision / image understanding (local fixtures). */

import * as fs from 'node:fs';
import { PermissionBroker } from '../../stage2/os/permissions';

export interface VisionResult {
  ok: boolean;
  description: string;
  labels: string[];
  permission: string;
}

export class VisionRuntime {
  constructor(private readonly permissions = new PermissionBroker()) {}

  getPermissions(): PermissionBroker {
    return this.permissions;
  }

  describeImage(user_id: string, imagePath: string): VisionResult {
    if (this.permissions.check(user_id, 'camera') !== 'granted' && this.permissions.check(user_id, 'file') !== 'granted') {
      return { ok: false, description: '', labels: [], permission: 'denied' };
    }
    if (!fs.existsSync(imagePath)) {
      return { ok: false, description: 'missing image', labels: [], permission: 'granted' };
    }
    const buf = fs.readFileSync(imagePath);
    const head = buf.subarray(0, 16).toString('hex');
    const labels = ['local_image'];
    if (imagePath.endsWith('.svg')) labels.push('svg', 'diagram');
    if (imagePath.endsWith('.png')) labels.push('png');
    return {
      ok: true,
      description: `Local vision stub inspected ${imagePath} (hdr=${head.slice(0, 8)}…). Not a fabricated frontier VLM claim.`,
      labels,
      permission: 'granted',
    };
  }
}
