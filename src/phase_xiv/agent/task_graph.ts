/** Task graph (DAG) for gunnchAgent planning/execution. */

export type NodeStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked' | 'cancelled';

export interface TaskNode {
  id: string;
  title: string;
  tool?: string;
  action?: string;
  args?: Record<string, unknown>;
  depends_on: string[];
  status: NodeStatus;
  result?: unknown;
  error?: string;
  approval_id?: string;
}

export class TaskGraph {
  nodes = new Map<string, TaskNode>();

  add(node: Omit<TaskNode, 'status' | 'depends_on'> & { depends_on?: string[] }): TaskNode {
    if (this.nodes.has(node.id)) throw new Error(`DUPLICATE_NODE:${node.id}`);
    const full: TaskNode = {
      ...node,
      depends_on: node.depends_on ?? [],
      status: 'pending',
    };
    this.nodes.set(full.id, full);
    return full;
  }

  ready(): TaskNode[] {
    return [...this.nodes.values()].filter((n) => {
      if (n.status !== 'pending') return false;
      return n.depends_on.every((d) => this.nodes.get(d)?.status === 'done');
    });
  }

  mark(id: string, status: NodeStatus, patch: Partial<TaskNode> = {}): TaskNode {
    const n = this.nodes.get(id);
    if (!n) throw new Error(`UNKNOWN_NODE:${id}`);
    Object.assign(n, patch, { status });
    return n;
  }

  isComplete(): boolean {
    return [...this.nodes.values()].every((n) =>
      n.status === 'done' || n.status === 'cancelled' || n.status === 'blocked',
    );
  }

  serialize(): TaskNode[] {
    return [...this.nodes.values()];
  }

  static deserialize(nodes: TaskNode[]): TaskGraph {
    const g = new TaskGraph();
    for (const n of nodes) g.nodes.set(n.id, { ...n });
    return g;
  }
}
