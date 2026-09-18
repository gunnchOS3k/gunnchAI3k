/** Creator tool providers — no direct model-owned shell authority. */
export type CreatorTool =
  | 'studio'
  | 'terminal'
  | 'repo'
  | 'compiler'
  | 'tests'
  | 'docs'
  | 'pdf'
  | 'notebooks';

export interface CreatorToolProvider {
  tool: CreatorTool;
  broker_mediated: true;
  model_owned_shell_authority: false;
  side_effect_class: 'read_only' | 'mutating' | 'network';
}

export const CREATOR_TOOL_PROVIDERS: CreatorToolProvider[] = [
  { tool: 'studio', broker_mediated: true, model_owned_shell_authority: false, side_effect_class: 'mutating' },
  { tool: 'terminal', broker_mediated: true, model_owned_shell_authority: false, side_effect_class: 'mutating' },
  { tool: 'repo', broker_mediated: true, model_owned_shell_authority: false, side_effect_class: 'mutating' },
  { tool: 'compiler', broker_mediated: true, model_owned_shell_authority: false, side_effect_class: 'read_only' },
  { tool: 'tests', broker_mediated: true, model_owned_shell_authority: false, side_effect_class: 'read_only' },
  { tool: 'docs', broker_mediated: true, model_owned_shell_authority: false, side_effect_class: 'read_only' },
  { tool: 'pdf', broker_mediated: true, model_owned_shell_authority: false, side_effect_class: 'read_only' },
  { tool: 'notebooks', broker_mediated: true, model_owned_shell_authority: false, side_effect_class: 'mutating' },
];
