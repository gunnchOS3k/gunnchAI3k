// gunnchAI3k Study Copilot v2 - Emergency "All Hands on Deck" Feature
// Comprehensive crash course for students behind on material

import { CourseModel, Topic, Exemplar } from './ingest';
import { StudyPlan, StudyPreferences } from './plan';
import { EmbedBuilder } from 'discord.js';

export interface EmergencyStudySession {
  courseName: string;
  examDate: Date;
  daysRemaining: number;
  currentLevel: 'behind' | 'very-behind' | 'critical';
  priorityTopics: PriorityTopic[];
  crashPlan: CrashPlan;
  practiceProblems: PracticeProblem[];
  quickReference: QuickReference;
}

export interface PriorityTopic {
  topic: Topic;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timeAllocation: number; // minutes
  prerequisites: string[];
  keyConcepts: string[];
  practiceProblems: number;
}

export interface CrashPlan {
  totalDays: number;
  hoursPerDay: number;
  dailySchedule: DailyCrashSchedule[];
  milestones: Milestone[];
  emergencyStrategies: EmergencyStrategy[];
}

export interface DailyCrashSchedule {
  day: number;
  focus: string;
  timeBlocks: TimeBlock[];
  goals: string[];
  practiceTarget: number;
}

export interface TimeBlock {
  duration: number;
  activity: 'crash-study' | 'practice' | 'review' | 'mock-exam';
  topic: string;
  description: string;
  intensity: 'high' | 'medium' | 'low';
}

export interface Milestone {
  day: number;
  goal: string;
  topics: string[];
  practiceProblems: number;
  mockExam: boolean;
}

export interface EmergencyStrategy {
  name: string;
  description: string;
  whenToUse: string;
  effectiveness: number; // 1-10
}

export interface PracticeProblem {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problem: string;
  solution: string;
  steps: string[];
  timeEstimate: number; // minutes
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface QuickReference {
  formulas: Formula[];
  definitions: Definition[];
  concepts: Concept[];
  patterns: Pattern[];
}

export interface Formula {
  name: string;
  formula: string;
  variables: string[];
  whenToUse: string;
  example: string;
}

export interface Definition {
  term: string;
  definition: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  relatedTerms: string[];
}

export interface Concept {
  name: string;
  explanation: string;
  keyPoints: string[];
  commonMistakes: string[];
}

export interface Pattern {
  name: string;
  description: string;
  examples: string[];
  whenToApply: string;
}

export class EmergencyStudyGenerator {
  async generateEmergencyPlan(
    courseModel: CourseModel,
    examDate: Date,
    currentLevel: 'behind' | 'very-behind' | 'critical'
  ): Promise<EmergencyStudySession> {
    console.log(`🚨 Generating emergency study plan for ${courseModel.courseName}`);
    
    const daysRemaining = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    // Prioritize topics based on exam importance and current level
    const priorityTopics = this.prioritizeTopics(courseModel.topics, currentLevel, daysRemaining);
    
    // Create crash plan
    const crashPlan = this.createCrashPlan(daysRemaining, currentLevel, priorityTopics);
    
    // Generate practice problems
    const practiceProblems = this.generatePracticeProblems(priorityTopics, daysRemaining);
    
    // Create quick reference
    const quickReference = this.createQuickReference(courseModel);
    
    return {
      courseName: courseModel.courseName,
      examDate,
      daysRemaining,
      currentLevel,
      priorityTopics,
      crashPlan,
      practiceProblems,
      quickReference
    };
  }
  
  private prioritizeTopics(
    topics: Topic[],
    currentLevel: string,
    daysRemaining: number
  ): PriorityTopic[] {
    const priorityTopics: PriorityTopic[] = [];
    
    // Critical topics that are absolutely essential
    const criticalTopics = topics.slice(0, Math.min(3, topics.length));
    criticalTopics.forEach(topic => {
      priorityTopics.push({
        topic,
        priority: 'critical',
        timeAllocation: this.calculateTimeAllocation(topic, 'critical', daysRemaining),
        prerequisites: topic.prerequisites,
        keyConcepts: topic.keyConcepts,
        practiceProblems: this.calculatePracticeProblems(topic, 'critical')
      });
    });
    
    // High priority topics
    const highPriorityTopics = topics.slice(3, Math.min(6, topics.length));
    highPriorityTopics.forEach(topic => {
      priorityTopics.push({
        topic,
        priority: 'high',
        timeAllocation: this.calculateTimeAllocation(topic, 'high', daysRemaining),
        prerequisites: topic.prerequisites,
        keyConcepts: topic.keyConcepts,
        practiceProblems: this.calculatePracticeProblems(topic, 'high')
      });
    });
    
    // Medium priority topics (if time allows)
    if (daysRemaining > 3) {
      const mediumPriorityTopics = topics.slice(6, Math.min(9, topics.length));
      mediumPriorityTopics.forEach(topic => {
        priorityTopics.push({
          topic,
          priority: 'medium',
          timeAllocation: this.calculateTimeAllocation(topic, 'medium', daysRemaining),
          prerequisites: topic.prerequisites,
          keyConcepts: topic.keyConcepts,
          practiceProblems: this.calculatePracticeProblems(topic, 'medium')
        });
      });
    }
    
    return priorityTopics;
  }
  
  private calculateTimeAllocation(topic: Topic, priority: string, daysRemaining: number): number {
    const baseTime = {
      'critical': 120, // 2 hours
      'high': 90,     // 1.5 hours
      'medium': 60,    // 1 hour
      'low': 30        // 30 minutes
    };
    
    const urgencyMultiplier = Math.max(1, 7 - daysRemaining) / 7; // More time if more days
    return Math.round(baseTime[priority] * urgencyMultiplier);
  }
  
  private calculatePracticeProblems(topic: Topic, priority: string): number {
    const baseProblems = {
      'critical': 15,
      'high': 10,
      'medium': 5,
      'low': 3
    };
    
    return baseProblems[priority];
  }
  
  private createCrashPlan(
    daysRemaining: number,
    currentLevel: string,
    priorityTopics: PriorityTopic[]
  ): CrashPlan {
    const hoursPerDay = this.calculateHoursPerDay(currentLevel, daysRemaining);
    const dailySchedule = this.createDailySchedule(daysRemaining, priorityTopics, hoursPerDay);
    const milestones = this.createMilestones(daysRemaining, priorityTopics);
    const emergencyStrategies = this.getEmergencyStrategies(currentLevel);
    
    return {
      totalDays: daysRemaining,
      hoursPerDay,
      dailySchedule,
      milestones,
      emergencyStrategies
    };
  }
  
  private calculateHoursPerDay(currentLevel: string, daysRemaining: number): number {
    const baseHours = {
      'behind': 4,
      'very-behind': 6,
      'critical': 8
    };
    
    const urgencyMultiplier = Math.max(1, 7 - daysRemaining) / 7;
    return Math.round(baseHours[currentLevel] * (1 + urgencyMultiplier));
  }
  
  private createDailySchedule(
    daysRemaining: number,
    priorityTopics: PriorityTopic[],
    hoursPerDay: number
  ): DailyCrashSchedule[] {
    const schedule: DailyCrashSchedule[] = [];
    
    for (let day = 1; day <= daysRemaining; day++) {
      const focus = this.determineDailyFocus(day, priorityTopics);
      const timeBlocks = this.createTimeBlocks(day, focus, hoursPerDay);
      const goals = this.setDailyGoals(day, focus);
      const practiceTarget = this.calculatePracticeTarget(day, priorityTopics);
      
      schedule.push({
        day,
        focus,
        timeBlocks,
        goals,
        practiceTarget
      });
    }
    
    return schedule;
  }
  
  private determineDailyFocus(day: number, priorityTopics: PriorityTopic[]): string {
    if (day <= 2) return 'Critical Topics - Foundation Building';
    if (day <= 4) return 'High Priority Topics - Core Concepts';
    if (day <= 6) return 'Practice and Application';
    return 'Review and Mock Exams';
  }
  
  private createTimeBlocks(day: number, focus: string, hoursPerDay: number): TimeBlock[] {
    const blocks: TimeBlock[] = [];
    
    // Morning intensive study block
    blocks.push({
      duration: Math.floor(hoursPerDay * 0.4 * 60), // 40% of time
      activity: 'crash-study',
      topic: 'Core Concepts',
      description: 'Intensive study of fundamental concepts',
      intensity: 'high'
    });
    
    // Practice block
    blocks.push({
      duration: Math.floor(hoursPerDay * 0.3 * 60), // 30% of time
      activity: 'practice',
      topic: 'Problem Solving',
      description: 'Work through practice problems',
      intensity: 'high'
    });
    
    // Review block
    blocks.push({
      duration: Math.floor(hoursPerDay * 0.2 * 60), // 20% of time
      activity: 'review',
      topic: 'Previous Material',
      description: 'Review and reinforce learned concepts',
      intensity: 'medium'
    });
    
    // Mock exam block (last few days)
    if (day >= 3) {
      blocks.push({
        duration: Math.floor(hoursPerDay * 0.1 * 60), // 10% of time
        activity: 'mock-exam',
        topic: 'Exam Practice',
        description: 'Practice exam questions',
        intensity: 'high'
      });
    }
    
    return blocks;
  }
  
  private setDailyGoals(day: number, focus: string): string[] {
    const goals: string[] = [];
    
    if (day <= 2) {
      goals.push('Master fundamental concepts');
      goals.push('Complete 10+ practice problems');
      goals.push('Create study notes');
    } else if (day <= 4) {
      goals.push('Apply concepts to problems');
      goals.push('Complete 15+ practice problems');
      goals.push('Review previous day\'s material');
    } else if (day <= 6) {
      goals.push('Practice exam-style questions');
      goals.push('Complete 20+ practice problems');
      goals.push('Take practice exam');
    } else {
      goals.push('Final review of all topics');
      goals.push('Complete mock exams');
      goals.push('Focus on weak areas');
    }
    
    return goals;
  }
  
  private calculatePracticeTarget(day: number, priorityTopics: PriorityTopic[]): number {
    const baseTarget = 10;
    const dayMultiplier = Math.min(2, day / 3); // Increase over time
    return Math.round(baseTarget * (1 + dayMultiplier));
  }
  
  private createMilestones(daysRemaining: number, priorityTopics: PriorityTopic[]): Milestone[] {
    const milestones: Milestone[] = [];
    
    // Day 2 milestone
    milestones.push({
      day: 2,
      goal: 'Master critical topics',
      topics: priorityTopics.filter(t => t.priority === 'critical').map(t => t.topic.name),
      practiceProblems: 20,
      mockExam: false
    });
    
    // Day 4 milestone
    if (daysRemaining >= 4) {
      milestones.push({
        day: 4,
        goal: 'Complete high priority topics',
        topics: priorityTopics.filter(t => t.priority === 'high').map(t => t.topic.name),
        practiceProblems: 30,
        mockExam: true
      });
    }
    
    // Final milestone
    milestones.push({
      day: daysRemaining,
      goal: 'Ready for exam',
      topics: priorityTopics.map(t => t.topic.name),
      practiceProblems: 50,
      mockExam: true
    });
    
    return milestones;
  }
  
  private getEmergencyStrategies(currentLevel: string): EmergencyStrategy[] {
    const strategies: EmergencyStrategy[] = [
      {
        name: 'Pomodoro Technique',
        description: '25-minute focused study sessions with 5-minute breaks',
        whenToUse: 'When concentration is low',
        effectiveness: 8
      },
      {
        name: 'Active Recall',
        description: 'Test yourself without looking at notes',
        whenToUse: 'For memorization and understanding',
        effectiveness: 9
      },
      {
        name: 'Spaced Repetition',
        description: 'Review material at increasing intervals',
        whenToUse: 'For long-term retention',
        effectiveness: 9
      },
      {
        name: 'Practice Problems',
        description: 'Work through as many problems as possible',
        whenToUse: 'For application and problem-solving',
        effectiveness: 10
      },
      {
        name: 'Study Groups',
        description: 'Explain concepts to others',
        whenToUse: 'When you need to clarify understanding',
        effectiveness: 7
      },
      {
        name: 'Mock Exams',
        description: 'Take practice exams under timed conditions',
        whenToUse: 'To simulate exam conditions',
        effectiveness: 10
      }
    ];
    
    return strategies;
  }
  
  private generatePracticeProblems(
    priorityTopics: PriorityTopic[],
    daysRemaining: number
  ): PracticeProblem[] {
    const problems: PracticeProblem[] = [];
    
    priorityTopics.forEach(priorityTopic => {
      for (let i = 0; i < priorityTopic.practiceProblems; i++) {
        problems.push({
          id: `${priorityTopic.topic.name}-${i + 1}`,
          topic: priorityTopic.topic.name,
          difficulty: this.determineDifficulty(priorityTopic.priority, i),
          problem: this.generateProblemText(priorityTopic.topic.name, i + 1),
          solution: this.generateSolutionText(priorityTopic.topic.name, i + 1),
          steps: this.generateSolutionSteps(priorityTopic.topic.name, i + 1),
          timeEstimate: this.estimateTime(priorityTopic.priority),
          priority: priorityTopic.priority
        });
      }
    });
    
    return problems;
  }
  
  private determineDifficulty(priority: string, index: number): 'easy' | 'medium' | 'hard' {
    if (priority === 'critical') return 'hard';
    if (priority === 'high') return index < 3 ? 'medium' : 'hard';
    return index < 2 ? 'easy' : 'medium';
  }
  
  private generateProblemText(topic: string, number: number): string {
    return `Problem ${number}: ${topic} - This is a practice problem designed to test your understanding of key concepts. Work through this step by step.`;
  }
  
  private generateSolutionText(topic: string, number: number): string {
    return `Solution ${number}: Here's the complete solution for the ${topic} problem. Make sure you understand each step.`;
  }
  
  private generateSolutionSteps(topic: string, number: number): string[] {
    return [
      'Step 1: Identify what you know and what you need to find',
      'Step 2: Choose the appropriate method or formula',
      'Step 3: Work through the solution step by step',
      'Step 4: Check your answer for reasonableness',
      'Step 5: Review the solution and understand the process'
    ];
  }
  
  private estimateTime(priority: string): number {
    const baseTime = {
      'critical': 15,
      'high': 12,
      'medium': 8,
      'low': 5
    };
    
    return baseTime[priority];
  }
  
  private createQuickReference(courseModel: CourseModel): QuickReference {
    return {
      formulas: this.extractFormulas(courseModel),
      definitions: this.extractDefinitions(courseModel),
      concepts: this.extractConcepts(courseModel),
      patterns: this.extractPatterns(courseModel)
    };
  }
  
  private extractFormulas(courseModel: CourseModel): Formula[] {
    return courseModel.keyFormulas.map((formula, index) => ({
      name: `Formula ${index + 1}`,
      formula,
      variables: this.extractVariables(formula),
      whenToUse: 'When solving problems involving this concept',
      example: 'Example application of this formula'
    }));
  }
  
  private extractVariables(formula: string): string[] {
    // Simple extraction of variables from formula
    const variables = formula.match(/[a-zA-Z]+/g) || [];
    return [...new Set(variables)]; // Remove duplicates
  }
  
  private extractDefinitions(courseModel: CourseModel): Definition[] {
    return courseModel.learningObjectives.map((objective, index) => ({
      term: `Key Term ${index + 1}`,
      definition: objective,
      importance: index < 3 ? 'critical' : 'high',
      relatedTerms: []
    }));
  }
  
  private extractConcepts(courseModel: CourseModel): Concept[] {
    return courseModel.topics.map(topic => ({
      name: topic.name,
      explanation: topic.description || 'Key concept explanation',
      keyPoints: topic.keyConcepts,
      commonMistakes: ['Common mistake 1', 'Common mistake 2']
    }));
  }
  
  private extractPatterns(courseModel: CourseModel): Pattern[] {
    return courseModel.topics.map(topic => ({
      name: `${topic.name} Pattern`,
      description: `Common pattern in ${topic.name}`,
      examples: ['Example 1', 'Example 2'],
      whenToApply: 'When you see this type of problem'
    }));
  }
  
  // Discord integration methods
  createEmergencyEmbed(session: EmergencyStudySession): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('🚨 ALL HANDS ON DECK - Emergency Study Plan')
      .setDescription(`**${session.courseName}** - ${session.daysRemaining} days until exam`)
      .setColor(0xff0000)
      .addFields(
        {
          name: '📊 Current Status',
          value: `Level: ${session.currentLevel.toUpperCase()}\nHours per day: ${session.crashPlan.hoursPerDay}\nTotal topics: ${session.priorityTopics.length}`,
          inline: true
        },
        {
          name: '🎯 Critical Topics',
          value: session.priorityTopics
            .filter(t => t.priority === 'critical')
            .map(t => `• ${t.topic.name}`)
            .join('\n') || 'None',
          inline: true
        },
        {
          name: '📚 Practice Problems',
          value: `Total: ${session.practiceProblems.length}\nCritical: ${session.practiceProblems.filter(p => p.priority === 'critical').length}`,
          inline: true
        }
      );
    
    return embed;
  }
  
  createDailyScheduleEmbed(schedule: DailyCrashSchedule): EmbedBuilder {
    if (!schedule) {
      return new EmbedBuilder()
        .setTitle('❌ Schedule Not Found')
        .setDescription('No schedule found for the specified day.')
        .setColor(0xff0000);
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`📅 Day ${schedule.day} - ${schedule.focus}`)
      .setColor(0xff6b35)
      .addFields(
        {
          name: '⏰ Time Blocks',
          value: schedule.timeBlocks.map(block => 
            `**${block.activity}** (${block.duration}min): ${block.description}`
          ).join('\n'),
          inline: false
        },
        {
          name: '🎯 Goals',
          value: schedule.goals.map(goal => `• ${goal}`).join('\n'),
          inline: false
        },
        {
          name: '📝 Practice Target',
          value: `${schedule.practiceTarget} problems`,
          inline: true
        }
      );
    
    return embed;
  }
  
  createQuickReferenceEmbed(reference: QuickReference): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('📚 Quick Reference Guide')
      .setColor(0x3498db)
      .addFields(
        {
          name: '🧮 Key Formulas',
          value: reference.formulas.slice(0, 3).map(f => `**${f.name}**: ${f.formula}`).join('\n'),
          inline: false
        },
        {
          name: '📖 Important Definitions',
          value: reference.definitions.slice(0, 3).map(d => `**${d.term}**: ${d.definition}`).join('\n'),
          inline: false
        },
        {
          name: '💡 Study Tips',
          value: '• Focus on understanding, not memorization\n• Practice problems daily\n• Review previous material\n• Take breaks to avoid burnout',
          inline: false
        }
      );
    
    return embed;
  }
}
