// gunnchAI3k Study Copilot v2 - Study Planning with Spaced Retrieval & Interleaving
// Implements evidence-based learning science principles

import { CourseModel, Topic, Exemplar } from './ingest';

export interface StudyPlan {
  weekPlan: WeekPlan[];
  todayPlan: DailyPlan;
  retrievalPrompts: RetrievalPrompt[];
  practiceSets: PracticeSet[];
}

export interface WeekPlan {
  day: string;
  timeBlocks: TimeBlock[];
  focus: string;
  retrievalHits: number;
}

export interface TimeBlock {
  duration: number; // minutes
  activity: 'study' | 'retrieval' | 'practice' | 'review';
  topic: string;
  description: string;
  materials: string[];
}

export interface DailyPlan {
  totalTime: number;
  blocks: TimeBlock[];
  focus: string;
  quickStart: string;
}

export interface RetrievalPrompt {
  topic: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  spacing: number; // days until next review
}

export interface PracticeSet {
  topic: string;
  problems: PracticeProblem[];
  workedExamples: Exemplar[];
  hints: string[];
}

export interface PracticeProblem {
  id: string;
  problem: string;
  solution: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface StudyPreferences {
  hoursPerWeek: number;
  sessionLength: number; // minutes
  dueDate?: Date;
  examDate?: Date;
  focusAreas?: string[];
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
}

export function makeStudyPlan(
  model: CourseModel,
  prefs: StudyPreferences
): StudyPlan {
  console.log(`📅 Creating study plan for ${model.courseName}`);
  
  const weekPlan = createWeekPlan(model, prefs);
  const todayPlan = createTodayPlan(model, prefs);
  const retrievalPrompts = createRetrievalPrompts(model);
  const practiceSets = createPracticeSets(model);
  
  return {
    weekPlan,
    todayPlan,
    retrievalPrompts,
    practiceSets
  };
}

function createWeekPlan(model: CourseModel, prefs: StudyPreferences): WeekPlan[] {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekPlan: WeekPlan[] = [];
  
  // Distribute topics across the week with spacing
  const topicsPerDay = Math.ceil(model.topics.length / 7);
  const sessionLength = prefs.sessionLength || 50;
  
  days.forEach((day, dayIndex) => {
    const startTopic = dayIndex * topicsPerDay;
    const endTopic = Math.min(startTopic + topicsPerDay, model.topics.length);
    const dayTopics = model.topics.slice(startTopic, endTopic);
    
    const timeBlocks: TimeBlock[] = [];
    let currentTime = 0;
    
    // Morning study block
    if (dayTopics.length > 0) {
      timeBlocks.push({
        duration: Math.min(sessionLength, 60),
        activity: 'study',
        topic: dayTopics[0].name,
        description: `Study ${dayTopics[0].name} - Read materials, take notes`,
        materials: [`${dayTopics[0].name} slides`, `${dayTopics[0].name} textbook`]
      });
      currentTime += Math.min(sessionLength, 60);
    }
    
    // Retrieval practice block
    if (dayIndex > 0) { // Start retrieval from day 2
      const previousTopics = model.topics.slice(0, Math.min(dayIndex * topicsPerDay, model.topics.length));
      const retrievalTopic = previousTopics[Math.floor(Math.random() * previousTopics.length)];
      
      timeBlocks.push({
        duration: 20,
        activity: 'retrieval',
        topic: retrievalTopic.name,
        description: `Retrieval practice: ${retrievalTopic.name}`,
        materials: ['Retrieval questions', 'Previous notes']
      });
      currentTime += 20;
    }
    
    // Practice block
    if (dayTopics.length > 1) {
      timeBlocks.push({
        duration: 30,
        activity: 'practice',
        topic: dayTopics[1]?.name || dayTopics[0].name,
        description: `Practice problems: ${dayTopics[1]?.name || dayTopics[0].name}`,
        materials: ['Practice problems', 'Worked examples']
      });
      currentTime += 30;
    }
    
    // Interleaving review block
    if (dayIndex >= 2) {
      const reviewTopics = model.topics.slice(0, Math.min(3, model.topics.length));
      timeBlocks.push({
        duration: 25,
        activity: 'review',
        topic: 'Mixed Review',
        description: `Interleaved review: ${reviewTopics.map(t => t.name).join(', ')}`,
        materials: ['Mixed practice problems', 'Cross-topic connections']
      });
      currentTime += 25;
    }
    
    weekPlan.push({
      day,
      timeBlocks,
      focus: dayTopics.map(t => t.name).join(', '),
      retrievalHits: timeBlocks.filter(b => b.activity === 'retrieval').length
    });
  });
  
  return weekPlan;
}

function createTodayPlan(model: CourseModel, prefs: StudyPreferences): DailyPlan {
  const sessionLength = prefs.sessionLength || 50;
  const blocks: TimeBlock[] = [];
  
  // Quick 30-minute plan
  blocks.push({
    duration: 15,
    activity: 'study',
    topic: model.topics[0]?.name || 'Course Overview',
    description: 'Quick review of key concepts',
    materials: ['Lecture slides', 'Key formulas']
  });
  
  blocks.push({
    duration: 10,
    activity: 'retrieval',
    topic: 'Previous Material',
    description: 'Test your memory on yesterday\'s topics',
    materials: ['Retrieval questions', 'Flashcards']
  });
  
  blocks.push({
    duration: 5,
    activity: 'practice',
    topic: model.topics[0]?.name || 'Practice',
    description: 'Quick practice problem',
    materials: ['Practice problems', 'Worked examples']
  });
  
  return {
    totalTime: 30,
    blocks,
    focus: model.topics[0]?.name || 'Course Overview',
    quickStart: `Start with ${model.topics[0]?.name || 'course overview'} - 15 min study, 10 min retrieval, 5 min practice`
  };
}

function createRetrievalPrompts(model: CourseModel): RetrievalPrompt[] {
  const prompts: RetrievalPrompt[] = [];
  
  model.topics.forEach((topic, index) => {
    // Create 2-3 retrieval prompts per topic
    const topicPrompts = [
      {
        topic: topic.name,
        question: `What are the key concepts in ${topic.name}?`,
        answer: `Key concepts include: ${topic.keyConcepts.join(', ') || 'See course materials'}`,
        difficulty: 'easy' as const,
        spacing: 1 // Review in 1 day
      },
      {
        topic: topic.name,
        question: `Explain ${topic.name} in your own words.`,
        answer: `This topic covers ${topic.description || 'important concepts'}`,
        difficulty: 'medium' as const,
        spacing: 3 // Review in 3 days
      },
      {
        topic: topic.name,
        question: `How does ${topic.name} relate to other course topics?`,
        answer: `Connections to other topics: ${topic.prerequisites.join(', ') || 'See course materials'}`,
        difficulty: 'hard' as const,
        spacing: 7 // Review in 7 days
      }
    ];
    
    prompts.push(...topicPrompts);
  });
  
  return prompts;
}

function createPracticeSets(model: CourseModel): PracticeSet[] {
  const practiceSets: PracticeSet[] = [];
  
  model.topics.forEach(topic => {
    const problems: PracticeProblem[] = [
      {
        id: `${topic.name}-1`,
        problem: `Basic problem in ${topic.name}`,
        solution: `Solution to basic problem`,
        steps: ['Step 1: Identify given information', 'Step 2: Apply relevant formula', 'Step 3: Solve'],
        difficulty: 'easy',
        topic: topic.name
      },
      {
        id: `${topic.name}-2`,
        problem: `Intermediate problem in ${topic.name}`,
        solution: `Solution to intermediate problem`,
        steps: ['Step 1: Analyze the problem', 'Step 2: Break into smaller parts', 'Step 3: Solve each part', 'Step 4: Combine results'],
        difficulty: 'medium',
        topic: topic.name
      }
    ];
    
    practiceSets.push({
      topic: topic.name,
      problems,
      workedExamples: model.exemplars.filter(e => e.topic === topic.name),
      hints: [
        `Start by identifying what you know and what you need to find`,
        `Look for patterns or formulas that apply`,
        `Break complex problems into smaller steps`
      ]
    });
  });
  
  return practiceSets;
}

export function getSpacedReviewSchedule(): { [key: number]: number[] } {
  // Spacing intervals: 1 day, 3 days, 7 days, 14 days, 30 days
  return {
    1: [1, 3, 7], // First review: 1 day, then 3 days, then 7 days
    2: [3, 7, 14], // Second review: 3 days, then 7 days, then 14 days
    3: [7, 14, 30], // Third review: 7 days, then 14 days, then 30 days
    4: [14, 30, 60] // Fourth review: 14 days, then 30 days, then 60 days
  };
}

export function getInterleavingTopics(topics: Topic[], currentIndex: number): Topic[] {
  // Interleave current topic with 2-3 related topics
  const relatedTopics = topics.filter((_, index) => 
    Math.abs(index - currentIndex) <= 2 && index !== currentIndex
  );
  
  return [topics[currentIndex], ...relatedTopics.slice(0, 2)];
}

export function createMicroPlan(totalMinutes: number, focus: string): DailyPlan {
  const blocks: TimeBlock[] = [];
  
  if (totalMinutes >= 30) {
    blocks.push({
      duration: 15,
      activity: 'study',
      topic: focus,
      description: 'Focused study session',
      materials: ['Lecture materials', 'Notes']
    });
    
    blocks.push({
      duration: 10,
      activity: 'retrieval',
      topic: focus,
      description: 'Test your understanding',
      materials: ['Retrieval questions', 'Self-quiz']
    });
    
    blocks.push({
      duration: 5,
      activity: 'practice',
      topic: focus,
      description: 'Quick practice',
      materials: ['Practice problems', 'Examples']
    });
  } else if (totalMinutes >= 15) {
    blocks.push({
      duration: 10,
      activity: 'study',
      topic: focus,
      description: 'Quick review',
      materials: ['Key concepts', 'Formulas']
    });
    
    blocks.push({
      duration: 5,
      activity: 'retrieval',
      topic: focus,
      description: 'Memory check',
      materials: ['Flashcards', 'Quick quiz']
    });
  } else {
    blocks.push({
      duration: totalMinutes,
      activity: 'study',
      topic: focus,
      description: 'Quick overview',
      materials: ['Summary notes', 'Key points']
    });
  }
  
  return {
    totalTime: totalMinutes,
    blocks,
    focus,
    quickStart: `${totalMinutes}-minute focused session on ${focus}`
  };
}

