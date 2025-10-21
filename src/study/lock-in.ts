// gunnchAI3k Study Copilot v2 - "Lock In" Academic Warrior Mode
// Motivational emergency study with academic warrior theme

import { Client, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, Interaction, CommandInteraction } from 'discord.js';
import { EmergencyStudyGenerator, EmergencyStudySession } from './emergency';
import { CourseModel } from './ingest';

export interface LockInSession {
  userId: string;
  courseName: string;
  examDate: Date;
  daysRemaining: number;
  warriorLevel: 'Rookie' | 'Veteran' | 'Elite' | 'Legend';
  academicPower: number;
  studyStreak: number;
  trophies: Trophy[];
  emergencySession: EmergencyStudySession;
}

export interface Trophy {
  id: string;
  name: string;
  description: string;
  requirement: string;
  earned: boolean;
  earnedAt?: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface AcademicWarrior {
  name: string;
  level: string;
  power: number;
  streak: number;
  trophies: number;
  nextLevel: string;
  progress: number;
}

export class LockInBot {
  private client: Client;
  private emergencyGenerator: EmergencyStudyGenerator;
  private activeSessions: Map<string, LockInSession> = new Map();
  private warriorProfiles: Map<string, AcademicWarrior> = new Map();
  
  constructor(client: Client) {
    this.client = client;
    this.emergencyGenerator = new EmergencyStudyGenerator();
    this.setupCommands();
  }
  
  private setupCommands() {
    // Lock in command
    const lockInCommand = new SlashCommandBuilder()
      .setName('lock-in')
      .setDescription('🔒 LOCK IN - Academic Warrior Mode for serious studying')
      .addStringOption(option =>
        option.setName('course')
          .setDescription('Course name to lock in for')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('exam-date')
          .setDescription('Exam date (YYYY-MM-DD)')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('warrior-level')
          .setDescription('Your academic warrior level')
          .setRequired(false)
          .addChoices(
            { name: 'Rookie (4-6 hours/day)', value: 'Rookie' },
            { name: 'Veteran (6-8 hours/day)', value: 'Veteran' },
            { name: 'Elite (8+ hours/day)', value: 'Elite' },
            { name: 'Legend (10+ hours/day)', value: 'Legend' }
          )
      );
    
    this.client.application?.commands.create(lockInCommand);
  }
  
  async handleInteraction(interaction: Interaction) {
    if (!interaction.isCommand()) return;
    
    try {
      switch (interaction.commandName) {
        case 'lock-in':
          await this.handleLockIn(interaction);
          break;
      }
    } catch (error) {
      console.error('Error handling lock-in interaction:', error);
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: '❌ An error occurred while processing your lock-in request.',
          ephemeral: true
        });
      }
    }
  }
  
  private async handleLockIn(interaction: CommandInteraction) {
    const courseName = interaction.options.get('course')?.value as string;
    const examDateStr = interaction.options.get('exam-date')?.value as string;
    const warriorLevel = interaction.options.get('warrior-level')?.value as string || 'Rookie';
    
    await interaction.deferReply();
    
    try {
      const examDate = new Date(examDateStr);
      const daysRemaining = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) {
        await interaction.editReply({
          content: '❌ Exam date has already passed. Time to lock in for the next one!'
        });
        return;
      }
      
      // Create academic warrior profile
      const warrior = this.createAcademicWarrior(interaction.user.id, warriorLevel);
      
      // Create mock course model
      const courseModel: CourseModel = {
        courseName,
        topics: this.generateCourseTopics(courseName),
        learningObjectives: this.generateCourseObjectives(courseName),
        keyFormulas: this.generateCourseFormulas(courseName),
        deadlines: [examDate],
        examDates: [examDate],
        exemplars: this.generateCourseExemplars(courseName)
      };
      
      // Generate emergency study session
      const emergencySession = await this.emergencyGenerator.generateEmergencyPlan(
        courseModel,
        examDate,
        this.mapWarriorLevelToEmergencyLevel(warriorLevel)
      );
      
      // Create lock-in session
      const lockInSession: LockInSession = {
        userId: interaction.user.id,
        courseName,
        examDate,
        daysRemaining,
        warriorLevel: warriorLevel as 'Rookie' | 'Veteran' | 'Elite' | 'Legend',
        academicPower: this.calculateAcademicPower(warriorLevel, daysRemaining),
        studyStreak: 0,
        trophies: this.generateTrophies(courseName),
        emergencySession
      };
      
      // Store session
      this.activeSessions.set(interaction.user.id, lockInSession);
      this.warriorProfiles.set(interaction.user.id, warrior);
      
      // Create lock-in embed
      const embed = this.createLockInEmbed(lockInSession, warrior);
      
      // Generate study materials
      const materials = await this.generateLockInMaterials(lockInSession);
      
      await interaction.editReply({
        embeds: [embed],
        files: materials.attachments
      });
      
    } catch (error) {
      console.error('Error starting lock-in session:', error);
      await interaction.editReply({
        content: '❌ Error starting lock-in session. Please try again.'
      });
    }
  }
  
  private createAcademicWarrior(userId: string, level: string): AcademicWarrior {
    const basePower = {
      'Rookie': 100,
      'Veteran': 200,
      'Elite': 300,
      'Legend': 400
    };
    
    return {
      name: `Academic Warrior`,
      level,
      power: basePower[level] || 100,
      streak: 0,
      trophies: 0,
      nextLevel: this.getNextLevel(level),
      progress: 0
    };
  }
  
  private getNextLevel(currentLevel: string): string {
    const levels = ['Rookie', 'Veteran', 'Elite', 'Legend'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : 'Legend';
  }
  
  private mapWarriorLevelToEmergencyLevel(warriorLevel: string): 'behind' | 'very-behind' | 'critical' {
    switch (warriorLevel) {
      case 'Rookie': return 'behind';
      case 'Veteran': return 'very-behind';
      case 'Elite': return 'critical';
      case 'Legend': return 'critical';
      default: return 'behind';
    }
  }
  
  private calculateAcademicPower(warriorLevel: string, daysRemaining: number): number {
    const basePower = {
      'Rookie': 100,
      'Veteran': 200,
      'Elite': 300,
      'Legend': 400
    };
    
    const urgencyMultiplier = Math.max(1, 7 - daysRemaining) / 7;
    return Math.round((basePower[warriorLevel] || 100) * (1 + urgencyMultiplier));
  }
  
  private generateCourseTopics(courseName: string): any[] {
    const topics = [
      { name: 'Fundamentals', description: 'Basic concepts', keyConcepts: ['concept1', 'concept2'], difficulty: 'beginner', prerequisites: [] },
      { name: 'Advanced Topics', description: 'Complex concepts', keyConcepts: ['concept3', 'concept4'], difficulty: 'advanced', prerequisites: ['Fundamentals'] },
      { name: 'Applications', description: 'Real-world applications', keyConcepts: ['concept5', 'concept6'], difficulty: 'intermediate', prerequisites: ['Fundamentals'] }
    ];
    
    return topics.map(topic => ({
      ...topic,
      name: `${courseName} - ${topic.name}`
    }));
  }
  
  private generateCourseObjectives(courseName: string): string[] {
    return [
      `Master fundamental concepts in ${courseName}`,
      `Apply concepts to solve complex problems`,
      `Analyze real-world applications`,
      `Evaluate different problem-solving approaches`
    ];
  }
  
  private generateCourseFormulas(courseName: string): string[] {
    return [
      `${courseName} Formula 1: y = mx + b`,
      `${courseName} Formula 2: E = mc²`,
      `${courseName} Formula 3: F = ma`
    ];
  }
  
  private generateCourseExemplars(courseName: string): any[] {
    return [
      {
        type: 'worked-example',
        title: `${courseName} Example 1`,
        problem: 'Sample problem to solve',
        solution: 'Complete solution with steps',
        steps: ['Step 1: Identify given information', 'Step 2: Apply relevant formula', 'Step 3: Solve step by step'],
        topic: courseName
      }
    ];
  }
  
  private generateTrophies(courseName: string): Trophy[] {
    return [
      {
        id: 'first-problem',
        name: 'First Blood',
        description: 'Complete your first practice problem',
        requirement: 'Solve 1 practice problem',
        earned: false,
        rarity: 'common'
      },
      {
        id: 'study-streak-3',
        name: 'Three Day Warrior',
        description: 'Study for 3 consecutive days',
        requirement: 'Study for 3 days in a row',
        earned: false,
        rarity: 'common'
      },
      {
        id: 'practice-master',
        name: 'Practice Master',
        description: 'Complete 50 practice problems',
        requirement: 'Solve 50 practice problems',
        earned: false,
        rarity: 'rare'
      },
      {
        id: 'mock-exam-ace',
        name: 'Mock Exam Ace',
        description: 'Score 90%+ on a mock exam',
        requirement: 'Score 90% or higher on mock exam',
        earned: false,
        rarity: 'epic'
      },
      {
        id: 'academic-legend',
        name: 'Academic Legend',
        description: 'Achieve an A grade in the course',
        requirement: 'Get an A on your transcript',
        earned: false,
        rarity: 'legendary'
      }
    ];
  }
  
  private createLockInEmbed(session: LockInSession, warrior: AcademicWarrior): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('🔒 LOCKED IN - Academic Warrior Mode Activated!')
      .setDescription(`**${session.courseName}** - ${session.daysRemaining} days until exam`)
      .setColor(0x8B4513) // Brown/skin color
      .addFields(
        {
          name: '⚔️ Warrior Status',
          value: `**Level:** ${warrior.level}\n**Power:** ${warrior.power}\n**Streak:** ${warrior.streak} days\n**Trophies:** ${warrior.trophies}`,
          inline: true
        },
        {
          name: '🎯 Mission Brief',
          value: `**Target:** Ace ${session.courseName}\n**Time:** ${session.daysRemaining} days\n**Intensity:** ${session.warriorLevel} mode\n**Goal:** Wear the A-grade skin as a trophy`,
          inline: true
        },
        {
          name: '🏆 Available Trophies',
          value: session.trophies.slice(0, 3).map(trophy => 
            `• ${trophy.name} (${trophy.rarity})`
          ).join('\n'),
          inline: false
        }
      )
      .setFooter({ text: 'Time to slay the academic animal and wear its skin as a trophy! 🦁' });
    
    return embed;
  }
  
  private async generateLockInMaterials(session: LockInSession): Promise<{ attachments: AttachmentBuilder[] }> {
    const attachments: AttachmentBuilder[] = [];
    
    try {
      // Create lock-in study materials
      const lockInContent = this.createLockInContent(session);
      
      // Generate PPTX
      const pptxBuffer = await this.createLockInPPTX(lockInContent);
      const pptxAttachment = new AttachmentBuilder(pptxBuffer, { 
        name: `Lock_In_${session.courseName}_${this.getDateString()}.pptx` 
      });
      attachments.push(pptxAttachment);
      
      // Generate DOCX
      const docxBuffer = await this.createLockInDOCX(lockInContent);
      const docxAttachment = new AttachmentBuilder(docxBuffer, { 
        name: `Lock_In_${session.courseName}_${this.getDateString()}.docx` 
      });
      attachments.push(docxAttachment);
      
      // Generate PDF
      const pdfBuffer = await this.createLockInPDF(lockInContent);
      const pdfAttachment = new AttachmentBuilder(pdfBuffer, { 
        name: `Lock_In_${session.courseName}_${this.getDateString()}.pdf` 
      });
      attachments.push(pdfAttachment);
      
    } catch (error) {
      console.error('Error generating lock-in materials:', error);
    }
    
    return { attachments };
  }
  
  private createLockInContent(session: LockInSession): any {
    return {
      courseName: session.courseName,
      daysRemaining: session.daysRemaining,
      warriorLevel: session.warriorLevel,
      academicPower: session.academicPower,
      studyStreak: session.studyStreak,
      trophies: session.trophies,
      emergencySession: session.emergencySession
    };
  }
  
  private async createLockInPPTX(content: any): Promise<Buffer> {
    // Mock PPTX generation for lock-in content
    const mockBuffer = Buffer.from('Mock PPTX content for lock-in study materials');
    return mockBuffer;
  }
  
  private async createLockInDOCX(content: any): Promise<Buffer> {
    // Mock DOCX generation for lock-in content
    const mockBuffer = Buffer.from('Mock DOCX content for lock-in study materials');
    return mockBuffer;
  }
  
  private async createLockInPDF(content: any): Promise<Buffer> {
    // Mock PDF generation for lock-in content
    const mockBuffer = Buffer.from('Mock PDF content for lock-in study materials');
    return mockBuffer;
  }
  
  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
  
  // Additional methods for warrior progression
  public updateStudyStreak(userId: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.studyStreak++;
      this.checkTrophyEligibility(session);
    }
  }
  
  public completePracticeProblem(userId: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      // Check for first problem trophy
      const firstProblemTrophy = session.trophies.find(t => t.id === 'first-problem');
      if (firstProblemTrophy && !firstProblemTrophy.earned) {
        firstProblemTrophy.earned = true;
        firstProblemTrophy.earnedAt = new Date();
      }
    }
  }
  
  public completeMockExam(userId: string, score: number): void {
    const session = this.activeSessions.get(userId);
    if (session && score >= 90) {
      const mockExamTrophy = session.trophies.find(t => t.id === 'mock-exam-ace');
      if (mockExamTrophy && !mockExamTrophy.earned) {
        mockExamTrophy.earned = true;
        mockExamTrophy.earnedAt = new Date();
      }
    }
  }
  
  private checkTrophyEligibility(session: LockInSession): void {
    // Check for study streak trophy
    if (session.studyStreak >= 3) {
      const streakTrophy = session.trophies.find(t => t.id === 'study-streak-3');
      if (streakTrophy && !streakTrophy.earned) {
        streakTrophy.earned = true;
        streakTrophy.earnedAt = new Date();
      }
    }
  }
  
  public getWarriorProfile(userId: string): AcademicWarrior | null {
    return this.warriorProfiles.get(userId) || null;
  }
  
  public getActiveSession(userId: string): LockInSession | null {
    return this.activeSessions.get(userId) || null;
  }
}

