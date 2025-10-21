// gunnchAI3k Study Copilot v2 - Discord Bot Integration
// Handles study workflow with file generation and storage

import { Client, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, Interaction, CommandInteraction } from 'discord.js';
import { ingestFiles, CourseModel } from './ingest';
import { makeStudyPlan, StudyPlan, StudyPreferences } from './plan';
import { toPPTX } from './exporters/pptx';
import { toDOCX } from './exporters/docx';
import { toPDF } from './exporters/pdf';
import { storeFile, getFileUrl } from './storage';

export class StudyCopilotBot {
  private client: Client;
  private studySessions: Map<string, StudySession> = new Map();
  
  constructor(client: Client) {
    this.client = client;
    this.setupCommands();
  }
  
  private setupCommands() {
    // Study start command
    const studyStartCommand = new SlashCommandBuilder()
      .setName('study')
      .setDescription('Start a new study session')
      .addSubcommand(subcommand =>
        subcommand
          .setName('start')
          .setDescription('Begin a new study session with course materials')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('make-notes')
          .setDescription('Regenerate study materials with new inputs')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('quiz')
          .setDescription('Generate a quiz for a specific topic')
          .addStringOption(option =>
            option.setName('topic')
              .setDescription('Topic to quiz on')
              .setRequired(true)
          )
          .addIntegerOption(option =>
            option.setName('items')
              .setDescription('Number of quiz items (1-10)')
              .setMinValue(1)
              .setMaxValue(10)
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('explain')
          .setDescription('Get explanation for a specific concept')
          .addStringOption(option =>
            option.setName('concept')
              .setDescription('Concept to explain')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('plan')
          .setDescription('Create a custom study plan')
          .addIntegerOption(option =>
            option.setName('days')
              .setDescription('Days until exam/assignment')
              .setRequired(true)
          )
          .addIntegerOption(option =>
            option.setName('hours')
              .setDescription('Hours per day available')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('assignment-mode')
          .setDescription('Convert assignment into guided lesson')
      );
    
    this.client.application?.commands.create(studyStartCommand);
  }
  
  async handleInteraction(interaction: Interaction) {
    if (!interaction.isCommand()) return;
    
    try {
      switch (interaction.commandName) {
        case 'study':
          await this.handleStudyCommand(interaction);
          break;
      }
    } catch (error) {
      console.error('Error handling interaction:', error);
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true
        });
      }
    }
  }
  
  private async handleStudyCommand(interaction: CommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'start':
        await this.handleStudyStart(interaction);
        break;
      case 'make-notes':
        await this.handleMakeNotes(interaction);
        break;
      case 'quiz':
        await this.handleQuiz(interaction);
        break;
      case 'explain':
        await this.handleExplain(interaction);
        break;
      case 'plan':
        await this.handlePlan(interaction);
        break;
      case 'assignment-mode':
        await this.handleAssignmentMode(interaction);
        break;
    }
  }
  
  private async handleStudyStart(interaction: CommandInteraction) {
    const userId = interaction.user.id;
    
    // Check if user already has an active session
    if (this.studySessions.has(userId)) {
      await interaction.reply({
        content: '⚠️ You already have an active study session. Use `/study make-notes` to regenerate materials.',
        ephemeral: true
      });
      return;
    }
    
    // Create new study session
    const session = new StudySession(userId);
    this.studySessions.set(userId, session);
    
    const embed = new EmbedBuilder()
      .setTitle('📚 gunnchAI3k Study Copilot v2')
      .setDescription('Drop 4 things:\n1. Course name\n2. Syllabus (link/file)\n3. ONE assignment (file)\n4. Latest lecture slide (file)\n\nOptional: due date + weekly time. I\'ll return a plan + PPTX/DOCX/PDF in one message.')
      .setColor('#4ECDC4')
      .setFooter({ text: 'Study pack for learning only. Follow your course\'s policy—do not submit generated content as your own.' });
    
    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
  
  private async handleMakeNotes(interaction: CommandInteraction) {
    const userId = interaction.user.id;
    const session = this.studySessions.get(userId);
    
    if (!session) {
      await interaction.reply({
        content: '❌ No active study session found. Use `/study start` first.',
        ephemeral: true
      });
      return;
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Generate study materials
      const materials = await this.generateStudyMaterials(session);
      
      const embed = new EmbedBuilder()
        .setTitle('📚 Study Materials Generated')
        .setDescription('Your study pack is ready!')
        .setColor('#27AE60')
        .addFields(
          { name: '📊 PowerPoint', value: 'Study slides with retrieval practice', inline: true },
          { name: '📝 Word Document', value: 'Comprehensive notes and practice problems', inline: true },
          { name: '📄 PDF', value: 'Portable study guide', inline: true }
        );
      
      await interaction.editReply({
        embeds: [embed],
        files: materials.attachments
      });
      
    } catch (error) {
      console.error('Error generating materials:', error);
      await interaction.editReply({
        content: '❌ Error generating study materials. Please try again.'
      });
    }
  }
  
  private async handleQuiz(interaction: CommandInteraction) {
    const topic = interaction.options.get('topic')?.value as string;
    const items = interaction.options.get('items')?.value as number || 5;
    
    await interaction.deferReply({ ephemeral: true });
    
    // Generate quiz for the topic
    const quiz = this.generateQuiz(topic, items);
    
    const embed = new EmbedBuilder()
      .setTitle(`🧠 Quiz: ${topic}`)
      .setDescription(`Here are ${items} questions to test your knowledge:`)
      .setColor('#8E44AD');
    
    quiz.questions.forEach((question, index) => {
      embed.addFields({
        name: `Question ${index + 1}`,
        value: question.text,
        inline: false
      });
    });
    
    embed.addFields({
      name: '💡 Tips',
      value: 'Try to answer without looking at solutions first. This improves retention!',
      inline: false
    });
    
    await interaction.editReply({ embeds: [embed] });
  }
  
  private async handleExplain(interaction: CommandInteraction) {
    const concept = interaction.options.get('concept')?.value as string;
    
    await interaction.deferReply({ ephemeral: true });
    
    // Generate explanation for the concept
    const explanation = this.generateExplanation(concept);
    
    const embed = new EmbedBuilder()
      .setTitle(`💡 Explanation: ${concept}`)
      .setDescription(explanation.text)
      .setColor('#E67E22')
      .addFields(
        { name: 'Key Points', value: explanation.keyPoints.join('\n'), inline: false },
        { name: 'Examples', value: explanation.examples.join('\n'), inline: false }
      );
    
    await interaction.editReply({ embeds: [embed] });
  }
  
  private async handlePlan(interaction: CommandInteraction) {
    const days = interaction.options.get('days')?.value as number;
    const hours = interaction.options.get('hours')?.value as number;
    
    await interaction.deferReply({ ephemeral: true });
    
    // Generate custom study plan
    const plan = this.generateCustomPlan(days, hours);
    
    const embed = new EmbedBuilder()
      .setTitle('📅 Custom Study Plan')
      .setDescription(`Plan for ${days} days with ${hours} hours per day`)
      .setColor('#27AE60');
    
    plan.weeklySchedule.forEach((day, index) => {
      embed.addFields({
        name: `Day ${index + 1}`,
        value: day.activities.join('\n'),
        inline: true
      });
    });
    
    embed.addFields({
      name: '📊 Study Strategy',
      value: plan.strategy,
      inline: false
    });
    
    await interaction.editReply({ embeds: [embed] });
  }
  
  private async handleAssignmentMode(interaction: CommandInteraction) {
    const userId = interaction.user.id;
    const session = this.studySessions.get(userId);
    
    if (!session) {
      await interaction.reply({
        content: '❌ No active study session found. Use `/study start` first.',
        ephemeral: true
      });
      return;
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    // Convert assignment to guided lesson
    const lesson = await this.convertAssignmentToLesson(session);
    
    const embed = new EmbedBuilder()
      .setTitle('📝 Assignment Mode: Guided Lesson')
      .setDescription('This assignment has been converted into a learning experience with hints and step-by-step solutions.')
      .setColor('#E67E22')
      .addFields(
        { name: '🎯 Learning Objectives', value: lesson.objectives.join('\n'), inline: false },
        { name: '📚 Study Steps', value: lesson.steps.join('\n'), inline: false },
        { name: '💡 Hints Available', value: `${lesson.hints.length} hints to help you learn`, inline: true }
      )
      .setFooter({ text: 'For study, not to submit. Use this to learn the concepts!' });
    
    await interaction.editReply({ embeds: [embed] });
  }
  
  private async generateStudyMaterials(session: StudySession): Promise<{ attachments: AttachmentBuilder[] }> {
    const attachments: AttachmentBuilder[] = [];
    
    try {
      // Generate PPTX
      const pptxBuffer = await toPPTX(session.courseModel!, session.studyPlan!, session.courseName);
      const pptxAttachment = new AttachmentBuilder(pptxBuffer, { name: `Study_Pack_${session.courseName}_${this.getDateString()}.pptx` });
      attachments.push(pptxAttachment);
      
      // Generate DOCX
      const docxBuffer = await toDOCX(session.courseModel!, session.studyPlan!, session.courseName);
      const docxAttachment = new AttachmentBuilder(docxBuffer, { name: `Study_Pack_${session.courseName}_${this.getDateString()}.docx` });
      attachments.push(docxAttachment);
      
      // Generate PDF
      const pdfBuffer = await toPDF(session.courseModel!, session.studyPlan!, session.courseName);
      const pdfAttachment = new AttachmentBuilder(pdfBuffer, { name: `Study_Pack_${session.courseName}_${this.getDateString()}.pdf` });
      attachments.push(pdfAttachment);
      
    } catch (error) {
      console.error('Error generating materials:', error);
      throw error;
    }
    
    return { attachments };
  }
  
  private generateQuiz(topic: string, items: number): { questions: Array<{ text: string; answer: string }> } {
    // Mock quiz generation - in real implementation, this would use AI
    const questions = [];
    for (let i = 1; i <= items; i++) {
      questions.push({
        text: `What is a key concept in ${topic}? (Question ${i})`,
        answer: `This is the answer to question ${i} about ${topic}.`
      });
    }
    return { questions };
  }
  
  private generateExplanation(concept: string): { text: string; keyPoints: string[]; examples: string[] } {
    // Mock explanation generation - in real implementation, this would use AI
    return {
      text: `This is an explanation of ${concept}. It covers the fundamental principles and applications.`,
      keyPoints: [
        `Key point 1 about ${concept}`,
        `Key point 2 about ${concept}`,
        `Key point 3 about ${concept}`
      ],
      examples: [
        `Example 1: ${concept} in practice`,
        `Example 2: ${concept} application`
      ]
    };
  }
  
  private generateCustomPlan(days: number, hours: number): { weeklySchedule: Array<{ activities: string[] }>; strategy: string } {
    const weeklySchedule = [];
    for (let day = 1; day <= days; day++) {
      weeklySchedule.push({
        activities: [
          `${Math.floor(hours * 0.4)}h focused study`,
          `${Math.floor(hours * 0.3)}h practice problems`,
          `${Math.floor(hours * 0.3)}h review and retrieval`
        ]
      });
    }
    
    return {
      weeklySchedule,
      strategy: 'Spaced repetition with interleaved practice for optimal learning retention.'
    };
  }
  
  private async convertAssignmentToLesson(session: StudySession): Promise<{ objectives: string[]; steps: string[]; hints: string[] }> {
    // Mock assignment conversion - in real implementation, this would analyze the assignment
    return {
      objectives: [
        'Understand the problem requirements',
        'Apply relevant concepts and formulas',
        'Work through the solution step by step'
      ],
      steps: [
        'Read the problem carefully',
        'Identify what you know and what you need to find',
        'Choose the appropriate method or formula',
        'Work through the solution',
        'Check your answer for reasonableness'
      ],
      hints: [
        'Start by identifying the given information',
        'Look for patterns or formulas that apply',
        'Break complex problems into smaller steps'
      ]
    };
  }
  
  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
}

class StudySession {
  userId: string;
  courseName?: string;
  courseModel?: CourseModel;
  studyPlan?: StudyPlan;
  files: Map<string, Buffer> = new Map();
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  async addFile(filename: string, buffer: Buffer) {
    this.files.set(filename, buffer);
  }
  
  async processFiles(): Promise<void> {
    if (!this.courseName) {
      throw new Error('Course name not provided');
    }
    
    // Process files and create course model
    const files = {
      syllabus: this.files.get('syllabus'),
      assignment: this.files.get('assignment'),
      lecture: this.files.get('lecture')
    };
    
    this.courseModel = await ingestFiles(this.courseName, files);
    
    // Create study plan
    const prefs: StudyPreferences = {
      hoursPerWeek: 10,
      sessionLength: 50
    };
    
    this.studyPlan = makeStudyPlan(this.courseModel, prefs);
  }
}

