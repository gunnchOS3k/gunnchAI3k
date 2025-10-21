// gunnchAI3k Study Copilot v2 - Emergency "All Hands on Deck" Discord Integration
// Discord bot commands for emergency study sessions

import { Client, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, Interaction, CommandInteraction } from 'discord.js';
import { EmergencyStudyGenerator, EmergencyStudySession, DailyCrashSchedule } from './emergency';
import { CourseModel } from './ingest';
import { toPPTX } from './exporters/pptx';
import { toDOCX } from './exporters/docx';
import { toPDF } from './exporters/pdf';

export class EmergencyStudyBot {
  private client: Client;
  private emergencyGenerator: EmergencyStudyGenerator;
  private activeSessions: Map<string, EmergencyStudySession> = new Map();
  
  constructor(client: Client) {
    this.client = client;
    this.emergencyGenerator = new EmergencyStudyGenerator();
    this.setupCommands();
  }
  
  private setupCommands() {
    // Emergency study command
    const emergencyCommand = new SlashCommandBuilder()
      .setName('emergency')
      .setDescription('🚨 ALL HANDS ON DECK - Emergency study session for midterms/finals')
      .addSubcommand(subcommand =>
        subcommand
          .setName('start')
          .setDescription('Start emergency study session')
          .addStringOption(option =>
            option.setName('course')
              .setDescription('Course name')
              .setRequired(true)
          )
          .addStringOption(option =>
            option.setName('exam-date')
              .setDescription('Exam date (YYYY-MM-DD)')
              .setRequired(true)
          )
          .addStringOption(option =>
            option.setName('level')
              .setDescription('How behind are you?')
              .setRequired(true)
              .addChoices(
                { name: 'Behind (4-6 hours/day)', value: 'behind' },
                { name: 'Very Behind (6-8 hours/day)', value: 'very-behind' },
                { name: 'Critical (8+ hours/day)', value: 'critical' }
              )
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('schedule')
          .setDescription('Get daily study schedule')
          .addIntegerOption(option =>
            option.setName('day')
              .setDescription('Day number (1-7)')
              .setMinValue(1)
              .setMaxValue(7)
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('problems')
          .setDescription('Get practice problems for today')
          .addStringOption(option =>
            option.setName('topic')
              .setDescription('Specific topic (optional)')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('reference')
          .setDescription('Get quick reference guide')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('mock-exam')
          .setDescription('Take a mock exam')
          .addIntegerOption(option =>
            option.setName('duration')
              .setDescription('Exam duration in minutes')
              .setMinValue(30)
              .setMaxValue(180)
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('strategies')
          .setDescription('Get emergency study strategies')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('progress')
          .setDescription('Check your progress')
      );
    
    this.client.application?.commands.create(emergencyCommand);
  }
  
  async handleInteraction(interaction: Interaction) {
    if (!interaction.isCommand()) return;
    
    try {
      switch (interaction.commandName) {
        case 'emergency':
          await this.handleEmergencyCommand(interaction);
          break;
      }
    } catch (error) {
      console.error('Error handling emergency interaction:', error);
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: '❌ An error occurred while processing your emergency request.',
          ephemeral: true
        });
      }
    }
  }
  
  private async handleEmergencyCommand(interaction: CommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'start':
        await this.handleEmergencyStart(interaction);
        break;
      case 'schedule':
        await this.handleSchedule(interaction);
        break;
      case 'problems':
        await this.handleProblems(interaction);
        break;
      case 'reference':
        await this.handleReference(interaction);
        break;
      case 'mock-exam':
        await this.handleMockExam(interaction);
        break;
      case 'strategies':
        await this.handleStrategies(interaction);
        break;
      case 'progress':
        await this.handleProgress(interaction);
        break;
    }
  }
  
  private async handleEmergencyStart(interaction: CommandInteraction) {
    const courseName = interaction.options.get('course')?.value as string;
    const examDateStr = interaction.options.get('exam-date')?.value as string;
    const level = interaction.options.get('level')?.value as 'behind' | 'very-behind' | 'critical';
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const examDate = new Date(examDateStr);
      const daysRemaining = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 0) {
        await interaction.editReply({
          content: '❌ Exam date has already passed. Please check your date.'
        });
        return;
      }
      
      // Create mock course model for demonstration
      const courseModel: CourseModel = {
        courseName,
        topics: this.generateMockTopics(courseName),
        learningObjectives: this.generateMockObjectives(courseName),
        keyFormulas: this.generateMockFormulas(courseName),
        deadlines: [examDate],
        examDates: [examDate],
        exemplars: this.generateMockExemplars(courseName)
      };
      
      // Generate emergency study session
      const session = await this.emergencyGenerator.generateEmergencyPlan(
        courseModel,
        examDate,
        level
      );
      
      // Store session for user
      this.activeSessions.set(interaction.user.id, session);
      
      // Create emergency embed
      const embed = this.emergencyGenerator.createEmergencyEmbed(session);
      
      // Generate study materials
      const materials = await this.generateEmergencyMaterials(session);
      
      await interaction.editReply({
        embeds: [embed],
        files: materials.attachments
      });
      
    } catch (error) {
      console.error('Error starting emergency session:', error);
      await interaction.editReply({
        content: '❌ Error starting emergency study session. Please try again.'
      });
    }
  }
  
  private async handleSchedule(interaction: CommandInteraction) {
    const day = interaction.options.get('day')?.value as number;
    const session = this.activeSessions.get(interaction.user.id);
    
    if (!session) {
      await interaction.reply({
        content: '❌ No active emergency session found. Use `/emergency start` first.',
        ephemeral: true
      });
      return;
    }
    
    const schedule = session.crashPlan.dailySchedule[day - 1];
    if (!schedule) {
      await interaction.reply({
        content: `❌ Day ${day} not found in your study plan.`,
        ephemeral: true
      });
      return;
    }
    
    const embed = this.emergencyGenerator.createDailyScheduleEmbed(schedule);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  private async handleProblems(interaction: CommandInteraction) {
    const topic = interaction.options.get('topic')?.value as string;
    const session = this.activeSessions.get(interaction.user.id);
    
    if (!session) {
      await interaction.reply({
        content: '❌ No active emergency session found. Use `/emergency start` first.',
        ephemeral: true
      });
      return;
    }
    
    let problems = session.practiceProblems;
    if (topic) {
      problems = problems.filter(p => p.topic.toLowerCase().includes(topic.toLowerCase()));
    }
    
    // Get today's problems (first 5)
    const todayProblems = problems.slice(0, 5);
    
    const embed = new EmbedBuilder()
      .setTitle('📝 Practice Problems for Today')
      .setDescription(`Here are ${todayProblems.length} problems to work on:`)
      .setColor(0x27AE60);
    
    todayProblems.forEach((problem, index) => {
      embed.addFields({
        name: `Problem ${index + 1}: ${problem.topic}`,
        value: `**Difficulty:** ${problem.difficulty}\n**Time:** ${problem.timeEstimate} min\n**Priority:** ${problem.priority}\n\n${problem.problem}`,
        inline: false
      });
    });
    
    embed.addFields({
      name: '💡 Tips',
      value: '• Work through each problem step by step\n• Don\'t look at solutions until you\'ve attempted\n• Focus on understanding the process\n• Take breaks between problems',
      inline: false
    });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  private async handleReference(interaction: CommandInteraction) {
    const session = this.activeSessions.get(interaction.user.id);
    
    if (!session) {
      await interaction.reply({
        content: '❌ No active emergency session found. Use `/emergency start` first.',
        ephemeral: true
      });
      return;
    }
    
    const embed = this.emergencyGenerator.createQuickReferenceEmbed(session.quickReference);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  private async handleMockExam(interaction: CommandInteraction) {
    const duration = interaction.options.get('duration')?.value as number || 60;
    const session = this.activeSessions.get(interaction.user.id);
    
    if (!session) {
      await interaction.reply({
        content: '❌ No active emergency session found. Use `/emergency start` first.',
        ephemeral: true
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📝 Mock Exam')
      .setDescription(`**Duration:** ${duration} minutes\n**Questions:** ${Math.floor(duration / 5)} problems`)
      .setColor(0xE74C3C)
      .addFields(
        {
          name: '📋 Instructions',
          value: '• Work through each problem\n• Show your work\n• Don\'t use notes\n• Time yourself',
          inline: false
        },
        {
          name: '⏰ Timer',
          value: `Start your ${duration}-minute timer now!`,
          inline: false
        },
        {
          name: '📊 Scoring',
          value: '• 90-100%: Excellent! You\'re ready\n• 80-89%: Good, review weak areas\n• 70-79%: Needs more practice\n• Below 70%: Focus on fundamentals',
          inline: false
        }
      );
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  private async handleStrategies(interaction: CommandInteraction) {
    const session = this.activeSessions.get(interaction.user.id);
    
    if (!session) {
      await interaction.reply({
        content: '❌ No active emergency session found. Use `/emergency start` first.',
        ephemeral: true
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🚀 Emergency Study Strategies')
      .setDescription('Proven techniques for rapid learning')
      .setColor(0x8E44AD);
    
    session.crashPlan.emergencyStrategies.forEach((strategy, index) => {
      embed.addFields({
        name: `${index + 1}. ${strategy.name}`,
        value: `**Description:** ${strategy.description}\n**When to use:** ${strategy.whenToUse}\n**Effectiveness:** ${strategy.effectiveness}/10`,
        inline: false
      });
    });
    
    embed.addFields({
      name: '🎯 Pro Tips',
      value: '• Study in 25-minute blocks with 5-minute breaks\n• Test yourself frequently\n• Focus on understanding, not memorization\n• Get enough sleep\n• Stay hydrated and eat well',
      inline: false
    });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  private async handleProgress(interaction: CommandInteraction) {
    const session = this.activeSessions.get(interaction.user.id);
    
    if (!session) {
      await interaction.reply({
        content: '❌ No active emergency session found. Use `/emergency start` first.',
        ephemeral: true
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📊 Your Progress')
      .setDescription(`**Course:** ${session.courseName}\n**Days remaining:** ${session.daysRemaining}`)
      .setColor(0x3498DB)
      .addFields(
        {
          name: '📚 Topics Covered',
          value: `Critical: ${session.priorityTopics.filter(t => t.priority === 'critical').length}\nHigh: ${session.priorityTopics.filter(t => t.priority === 'high').length}\nMedium: ${session.priorityTopics.filter(t => t.priority === 'medium').length}`,
          inline: true
        },
        {
          name: '📝 Practice Problems',
          value: `Total: ${session.practiceProblems.length}\nCompleted: 0 (track manually)`,
          inline: true
        },
        {
          name: '🎯 Next Milestone',
          value: session.crashPlan.milestones[0]?.goal || 'Complete all topics',
          inline: true
        }
      );
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  private async generateEmergencyMaterials(session: EmergencyStudySession): Promise<{ attachments: AttachmentBuilder[] }> {
    const attachments: AttachmentBuilder[] = [];
    
    try {
      // Create emergency study materials
      const emergencyContent = this.createEmergencyContent(session);
      
      // Generate PPTX
      const pptxBuffer = await this.createEmergencyPPTX(emergencyContent);
      const pptxAttachment = new AttachmentBuilder(pptxBuffer, { 
        name: `Emergency_Study_${session.courseName}_${this.getDateString()}.pptx` 
      });
      attachments.push(pptxAttachment);
      
      // Generate DOCX
      const docxBuffer = await this.createEmergencyDOCX(emergencyContent);
      const docxAttachment = new AttachmentBuilder(docxBuffer, { 
        name: `Emergency_Study_${session.courseName}_${this.getDateString()}.docx` 
      });
      attachments.push(docxAttachment);
      
      // Generate PDF
      const pdfBuffer = await this.createEmergencyPDF(emergencyContent);
      const pdfAttachment = new AttachmentBuilder(pdfBuffer, { 
        name: `Emergency_Study_${session.courseName}_${this.getDateString()}.pdf` 
      });
      attachments.push(pdfAttachment);
      
    } catch (error) {
      console.error('Error generating emergency materials:', error);
    }
    
    return { attachments };
  }
  
  private createEmergencyContent(session: EmergencyStudySession): any {
    return {
      courseName: session.courseName,
      daysRemaining: session.daysRemaining,
      currentLevel: session.currentLevel,
      priorityTopics: session.priorityTopics,
      crashPlan: session.crashPlan,
      practiceProblems: session.practiceProblems,
      quickReference: session.quickReference
    };
  }
  
  private async createEmergencyPPTX(content: any): Promise<Buffer> {
    // Mock PPTX generation for emergency content
    const mockBuffer = Buffer.from('Mock PPTX content for emergency study materials');
    return mockBuffer;
  }
  
  private async createEmergencyDOCX(content: any): Promise<Buffer> {
    // Mock DOCX generation for emergency content
    const mockBuffer = Buffer.from('Mock DOCX content for emergency study materials');
    return mockBuffer;
  }
  
  private async createEmergencyPDF(content: any): Promise<Buffer> {
    // Mock PDF generation for emergency content
    const mockBuffer = Buffer.from('Mock PDF content for emergency study materials');
    return mockBuffer;
  }
  
  private generateMockTopics(courseName: string): any[] {
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
  
  private generateMockObjectives(courseName: string): string[] {
    return [
      `Understand fundamental concepts in ${courseName}`,
      `Apply concepts to solve problems`,
      `Analyze complex scenarios`,
      `Evaluate different approaches`
    ];
  }
  
  private generateMockFormulas(courseName: string): string[] {
    return [
      `${courseName} Formula 1: y = mx + b`,
      `${courseName} Formula 2: E = mc²`,
      `${courseName} Formula 3: F = ma`
    ];
  }
  
  private generateMockExemplars(courseName: string): any[] {
    return [
      {
        type: 'worked-example',
        title: `${courseName} Example 1`,
        problem: 'Sample problem',
        solution: 'Sample solution',
        steps: ['Step 1', 'Step 2', 'Step 3'],
        topic: courseName
      }
    ];
  }
  
  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
}

