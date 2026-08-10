/** gunnchSkills registry — first-party skills including requested set. */

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  tools: string[];
  safety: string[];
}

export const BUILTIN_SKILLS: SkillDefinition[] = [
  {
    id: 'math_tutor',
    name: 'Math Tutor',
    description: 'Step-by-step math tutoring with worked examples.',
    system_prompt: 'You are Math Tutor for gunnchAI. Teach with steps. No auto-submit.',
    tools: ['files', 'artifacts'],
    safety: ['no_auto_submit', 'show_work'],
  },
  {
    id: 'wireless_eng',
    name: 'Wireless Eng',
    description: 'RF/wireless engineering helper for labs and analysis.',
    system_prompt: 'You are Wireless Engineering skill. Prefer local measurements and honest units.',
    tools: ['files', 'shell', 'artifacts'],
    safety: ['no_fabricated_citations'],
  },
  {
    id: 'cyber',
    name: 'Cyber',
    description: 'Cybersecurity analyst skill for triage and hardening advice.',
    system_prompt: 'You are Cybersecurity Analyst. Defensive guidance only.',
    tools: ['files', 'shell'],
    safety: ['defensive_only', 'approval_for_destructive'],
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Research assistant with citation integrity checks.',
    system_prompt: 'You are Research Assistant. Never invent citations.',
    tools: ['files', 'browser'],
    safety: ['citation_integrity', 'local_first'],
  },
  {
    id: 'device',
    name: 'Device',
    description: 'Device repair/diagnostics assistant.',
    system_prompt: 'You are Device Repair Assistant. Use authorized device telemetry only.',
    tools: ['files'],
    safety: ['permissioned_device_access'],
  },
  {
    id: 'archive',
    name: 'Archive',
    description: 'Archive/naturalist scientific attribution assistant.',
    system_prompt: 'You are Archive Naturalist. Attribute specimens carefully.',
    tools: ['files', 'artifacts'],
    safety: ['scientific_attribution'],
  },
  {
    id: 'game_coach',
    name: 'Game Coach',
    description: 'Game coaching within fair-play boundaries.',
    system_prompt: 'You are Game Coach. No cheating/botting. Fair-play only.',
    tools: ['files'],
    safety: ['fair_play', 'no_botting'],
  },
];

export class SkillRegistry {
  private skills = new Map<string, SkillDefinition>();

  constructor(seed: SkillDefinition[] = BUILTIN_SKILLS) {
    for (const s of seed) this.skills.set(s.id, s);
  }

  list(): SkillDefinition[] {
    return [...this.skills.values()];
  }

  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  invoke(id: string, input: string): { ok: boolean; skill: string; output: string } {
    const skill = this.skills.get(id);
    if (!skill) return { ok: false, skill: id, output: 'UNKNOWN_SKILL' };
    return {
      ok: true,
      skill: skill.name,
      output: `[${skill.name}] ${skill.system_prompt.split('.')[0]}. Input: ${input.slice(0, 500)}`,
    };
  }
}
