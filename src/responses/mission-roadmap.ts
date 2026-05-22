/**
 * Concise mission briefing when users ask what Edmund / gunnchOS3k is working on.
 */

const SPECTRUMX_REPO_URL = 'https://github.com/gunnchOS3k/spectrumx-ai-ran-gary';

export const GUNNCHOS3K_MISSION_BRIEFING = `⚡ **Current gunnchOS3k Mission Briefing** ⚡

Edmund is building toward the next level after the NYU Master's in Computer Engineering:

🎮 **Virtual Game Jam — Summer 2026**
A remote builder event for games, AI, education, and creative tech.

🛠️ **In-person hackathons**
Hands-on events for students, builders, and community members to create portfolio-ready work.

📡 **SpectrumX 6G AI-RAN Gary**
Expanding the Gary-focused 6G / AI-RAN research effort into a broader **7 global campuses** vision.

🌍 **Long-term goal**
Strengthening Edmund's **University of Oulu 6G PhD application portfolio** with real software, real events, real research direction, and real community impact — building toward the application, not claiming admission.

Research repo:
${SPECTRUMX_REPO_URL}

**The mission is wireless, educational, global, and community-rooted.**`;

const ROADMAP_TRIGGERS: Array<{ test: (text: string) => boolean; label: string }> = [
  {
    label: 'edmund working on',
    test: (t) =>
      (t.includes('edmund') && (t.includes('working on') || t.includes('roadmap'))) ||
      t.includes('what is edmund working on'),
  },
  {
    label: 'gunnchos working on',
    test: (t) =>
      (t.includes('gunnchos') || t.includes('gunnchai')) &&
      (t.includes('working on') || t.includes('roadmap')),
  },
  {
    label: 'game jam',
    test: (t) => t.includes('game jam') || t.includes('virtual game jam'),
  },
  {
    label: 'spectrumx',
    test: (t) =>
      t.includes('spectrumx') ||
      t.includes('ai-ran') ||
      t.includes('ai ran gary') ||
      t.includes('gary 6g'),
  },
  {
    label: '7 global campuses',
    test: (t) =>
      t.includes('7 global') ||
      t.includes('seven global') ||
      t.includes('global campuses'),
  },
  {
    label: 'oulu',
    test: (t) =>
      t.includes('oulu') ||
      t.includes('phd application') ||
      t.includes('6g phd'),
  },
  {
    label: 'hackathon',
    test: (t) => t.includes('hackathon') || t.includes('in-person hack'),
  },
  {
    label: 'roadmap',
    test: (t) => t.includes('roadmap') || t.includes('mission briefing'),
  },
];

export function isMissionRoadmapQuestion(content: string): boolean {
  const normalized = content.toLowerCase().replace(/@gunnchai3k/gi, '').trim();
  return ROADMAP_TRIGGERS.some(({ test }) => test(normalized));
}

export function getMissionRoadmapResponse(): string {
  return GUNNCHOS3K_MISSION_BRIEFING;
}
