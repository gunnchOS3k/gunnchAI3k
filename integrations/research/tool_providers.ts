/** Research tool providers — simulation / twin / corpus; broker-mediated. */
export type ResearchTool = 'simulation' | 'digital_twin' | 'research_corpus' | 'docs' | 'notebooks';

export interface ResearchToolProvider {
  tool: ResearchTool;
  broker_mediated: true;
  model_owned_shell_authority: false;
}

export const RESEARCH_TOOL_PROVIDERS: ResearchToolProvider[] = [
  { tool: 'simulation', broker_mediated: true, model_owned_shell_authority: false },
  { tool: 'digital_twin', broker_mediated: true, model_owned_shell_authority: false },
  { tool: 'research_corpus', broker_mediated: true, model_owned_shell_authority: false },
  { tool: 'docs', broker_mediated: true, model_owned_shell_authority: false },
  { tool: 'notebooks', broker_mediated: true, model_owned_shell_authority: false },
];
