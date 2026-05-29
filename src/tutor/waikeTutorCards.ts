export interface TutorCard {
  id: string;
  title: string;
  waikeLevel: number;
  command: string;
  summary: string;
}

export const WAIKE_LEVELS = [
  { level: 0, name: 'Digital Confidence' },
  { level: 1, name: 'Computer User to Builder' },
  { level: 2, name: 'IT + Software Foundations' },
  { level: 3, name: 'Junior Industry Professional' },
  { level: 4, name: 'Specialist Tracks' },
  { level: 5, name: 'Product + Research Apprentice' },
  { level: 6, name: 'Lead Builder / Instructor' },
  { level: 7, name: 'Researcher / Founder / Architect' },
];

export function listTutorCards(): TutorCard[] {
  return [
    {
      id: 'digital_confidence',
      title: 'Digital Confidence to Computer Operator',
      waikeLevel: 0,
      command: '/waike lesson',
      summary: 'Mouse, keyboard, files, safety, and first lab.',
    },
    {
      id: 'seven_gc_apprenticeship',
      title: '7GC AI-RAN Research Apprenticeship',
      waikeLevel: 5,
      command: '/mentor',
      summary: 'Gary flagship + comparative campus research path.',
    },
  ];
}
