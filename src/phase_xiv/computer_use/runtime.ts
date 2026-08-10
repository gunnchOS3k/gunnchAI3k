/** Generic computer-use via accessibility/API stubs (not hardcoded app demos). */

export type UiActionType = 'focus' | 'click' | 'type' | 'scroll' | 'read';

export interface UiTarget {
  role: string;
  name: string;
  app?: string;
}

export interface UiAction {
  type: UiActionType;
  target: UiTarget;
  text?: string;
}

export interface UiActionResult {
  ok: boolean;
  action: UiAction;
  observed: string;
}

export class ComputerUseRuntime {
  private log: UiActionResult[] = [];

  /** Execute a generic UI action sequence against an accessibility tree fixture. */
  run(actions: UiAction[], tree: Array<UiTarget & { value?: string }> = []): UiActionResult[] {
    const results: UiActionResult[] = [];
    for (const action of actions) {
      const found = tree.find((n) => n.role === action.target.role && n.name === action.target.name);
      const ok = Boolean(found) || action.type === 'scroll';
      const observed = found?.value || (ok ? `${action.type}:${action.target.name}` : 'NOT_FOUND');
      const res = { ok, action, observed };
      results.push(res);
      this.log.push(res);
      if (!ok) break;
    }
    return results;
  }

  history(): UiActionResult[] {
    return [...this.log];
  }
}
