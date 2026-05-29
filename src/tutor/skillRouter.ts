export interface SkillRoute {
  domainId: string;
  domainTitle: string;
  suggestedMode: 'beginner' | 'apprentice' | 'industry' | 'research';
  repoLinks: string[];
}

const KEYWORD_ROUTES: Array<{ keywords: string[]; route: SkillRoute }> = [
  {
    keywords: ['wifi', '6g', '5g', 'ran', 'beam', 'spectrum', 'wireless'],
    route: {
      domainId: 'wireless_6g',
      domainTitle: 'DSP, Wireless, 5G/6G, and AI-RAN',
      suggestedMode: 'research',
      repoLinks: ['7gc-digital-twin', 'spectrumx-ai-ran-gary', 'readygary-6g-beam-selection'],
    },
  },
  {
    keywords: ['python', 'code', 'software', 'api', 'git'],
    route: {
      domainId: 'software_engineering',
      domainTitle: 'Software Engineering',
      suggestedMode: 'apprentice',
      repoLinks: ['gunnchos-device-os', 'waike-research-ops'],
    },
  },
  {
    keywords: ['security', 'cyber', 'soc', 'firewall'],
    route: {
      domainId: 'cybersecurity',
      domainTitle: 'Cybersecurity',
      suggestedMode: 'industry',
      repoLinks: ['waike-research-ops'],
    },
  },
  {
    keywords: ['network', 'ccna', 'tcp', 'dns'],
    route: {
      domainId: 'networking',
      domainTitle: 'Networking',
      suggestedMode: 'industry',
      repoLinks: ['waike-research-ops'],
    },
  },
  {
    keywords: ['hardware', 'cad', 'embedded', 'iot'],
    route: {
      domainId: 'hardware_embedded',
      domainTitle: 'Hardware, Embedded, and IoT',
      suggestedMode: 'apprentice',
      repoLinks: ['gunnchos-hardware-industrial-design', 'edge-io-measurement-node'],
    },
  },
];

export function routeSkillQuery(query: string): SkillRoute {
  const q = query.toLowerCase();
  for (const entry of KEYWORD_ROUTES) {
    if (entry.keywords.some((k) => q.includes(k))) {
      return entry.route;
    }
  }
  return {
    domainId: 'digital_confidence',
    domainTitle: 'Digital Confidence and Computer Basics',
    suggestedMode: 'beginner',
    repoLinks: ['waike-research-ops', 'gunnchAI3k'],
  };
}
