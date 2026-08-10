/** Planner that expands a goal into a task graph. */

import { TaskGraph } from './task_graph';
import { isHighImpact, type HighImpactAction } from './approval';

export interface PlanInput {
  goal: string;
  steps: Array<{
    id: string;
    title: string;
    tool?: string;
    action?: string;
    args?: Record<string, unknown>;
    depends_on?: string[];
  }>;
}

export function planGoal(input: PlanInput): TaskGraph {
  const graph = new TaskGraph();
  for (const step of input.steps) {
    graph.add(step);
    if (step.action && isHighImpact(step.action)) {
      // high-impact nodes remain pending until approval is attached at runtime
      void (step.action as HighImpactAction);
    }
  }
  return graph;
}

/** Canonical lab-report plan: measure → plot → docs → stop before submit. */
export function planLabReportWorkflow(): TaskGraph {
  return planGoal({
    goal: 'Produce lab report from local measurements; stop before submit',
    steps: [
      { id: 'load_measurements', title: 'Load local measurements', tool: 'files', action: 'read', args: { path: 'measurements.json' } },
      { id: 'compute_stats', title: 'Compute summary statistics', tool: 'shell', action: 'exec', args: { cmd: 'node', argv: ['-e', 'console.log("stats_ok")'] }, depends_on: ['load_measurements'] },
      { id: 'make_plot', title: 'Generate plot SVG', tool: 'files', action: 'write', args: { path: 'plot.svg', content_key: 'plot' }, depends_on: ['compute_stats'] },
      { id: 'write_docx', title: 'Write DOCX report', tool: 'artifacts', action: 'docx', depends_on: ['make_plot'] },
      { id: 'write_pdf', title: 'Write PDF report', tool: 'artifacts', action: 'pdf', depends_on: ['write_docx'] },
      { id: 'prepare_submit', title: 'Prepare submit (approval required)', tool: 'approval', action: 'submit', depends_on: ['write_pdf'] },
    ],
  });
}
