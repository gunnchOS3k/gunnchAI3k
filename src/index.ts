import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } from 'discord.js';
import { config } from 'dotenv';
import { LearningEngine } from './core/learning';
import { DecisionAnalyzer } from './core/analyzer';
import { RiskAssessment } from './core/risk';
import { StrategicPlanner } from './core/planner';
import { GitHubIntegration } from './integrations/github';
import { CursorIntegration } from './integrations/cursor';
import { NotificationManager } from './core/notifications';
import { DatabaseManager } from './core/database';
import { Logger } from './utils/logger';

config();

class GunnchAI3k {
  private client: Client;
  private learningEngine: LearningEngine;
  private decisionAnalyzer: DecisionAnalyzer;
  private riskAssessment: RiskAssessment;
  private strategicPlanner: StrategicPlanner;
  private githubIntegration: GitHubIntegration;
  private cursorIntegration: CursorIntegration;
  private notificationManager: NotificationManager;
  private databaseManager: DatabaseManager;
  private logger: Logger;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ]
    });

    this.logger = new Logger();
    this.databaseManager = new DatabaseManager();
    this.learningEngine = new LearningEngine(this.databaseManager);
    this.decisionAnalyzer = new DecisionAnalyzer(this.learningEngine);
    this.riskAssessment = new RiskAssessment(this.learningEngine);
    this.strategicPlanner = new StrategicPlanner(this.learningEngine);
    this.githubIntegration = new GitHubIntegration();
    this.cursorIntegration = new CursorIntegration();
    this.notificationManager = new NotificationManager(this.client);
  }

  async initialize() {
    try {
      await this.databaseManager.initialize();
      await this.learningEngine.initialize();
      await this.githubIntegration.initialize();
      await this.cursorIntegration.initialize();
      
      this.logger.info('gunnchAI3k initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize gunnchAI3k:', error);
      throw error;
    }
  }

  async start() {
    await this.initialize();
    await this.registerCommands();
    await this.setupEventHandlers();
    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }

  private async registerCommands() {
    const commands = [
      // Learning Commands
      new SlashCommandBuilder()
        .setName('learn')
        .setDescription('Teach the AI from your decisions')
        .addStringOption(option =>
          option.setName('decision')
            .setDescription('The decision you made')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('outcome')
            .setDescription('The outcome of the decision')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('context')
            .setDescription('Additional context')
                .setRequired(false)
        ),

      // Analysis Commands
      new SlashCommandBuilder()
        .setName('analyze')
        .setDescription('Get strategic analysis of your projects')
        .addStringOption(option =>
          option.setName('project')
            .setDescription('Project to analyze')
            .setRequired(false)
        ),

      // Suggestion Commands
      new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Receive AI-powered recommendations')
        .addStringOption(option =>
          option.setName('situation')
            .setDescription('Current situation or challenge')
            .setRequired(true)
        ),

      // Tracking Commands
      new SlashCommandBuilder()
        .setName('track')
        .setDescription('Monitor progress and metrics')
        .addStringOption(option =>
          option.setName('metric')
            .setDescription('Metric to track')
            .setRequired(false)
        ),

      // Focus Commands
      new SlashCommandBuilder()
        .setName('focus')
        .setDescription('Enable/disable notifications')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable focus mode')
            .setRequired(true)
        ),

      // Project Management
      new SlashCommandBuilder()
        .setName('assign')
        .setDescription('Create and assign tasks')
        .addStringOption(option =>
          option.setName('task')
            .setDescription('Task description')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('assignee')
            .setDescription('Who to assign to')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('deadline')
            .setDescription('Task deadline')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('update')
        .setDescription('Report progress and updates')
        .addStringOption(option =>
          option.setName('progress')
            .setDescription('Progress update')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('project')
            .setDescription('Project name')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('meeting')
        .setDescription('Schedule and manage meetings')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Meeting title')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('time')
            .setDescription('Meeting time')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('url')
            .setDescription('Meeting URL')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Share important information')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Announcement message')
            .setRequired(true)
        ),

      // Intelligence Features
      new SlashCommandBuilder()
        .setName('pattern')
        .setDescription('Analyze patterns in your work')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of pattern to analyze')
            .setRequired(false)
            .addChoices(
              { name: 'Decision Patterns', value: 'decisions' },
              { name: 'Work Patterns', value: 'work' },
              { name: 'Success Patterns', value: 'success' },
              { name: 'Failure Patterns', value: 'failure' }
            )
        ),

      new SlashCommandBuilder()
        .setName('risk')
        .setDescription('Assess potential risks')
        .addStringOption(option =>
          option.setName('project')
            .setDescription('Project to assess')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('optimize')
        .setDescription('Get efficiency suggestions')
        .addStringOption(option =>
          option.setName('area')
            .setDescription('Area to optimize')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('predict')
        .setDescription('Forecast outcomes')
        .addStringOption(option =>
          option.setName('scenario')
            .setDescription('Scenario to predict')
            .setRequired(true)
        ),

      // Help Command
      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show available commands and features')
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);
    
    try {
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_GUILD_ID!),
        { body: commands }
      );
      this.logger.info('Slash commands registered successfully');
    } catch (error) {
      this.logger.error('Failed to register slash commands:', error);
    }
  }

  private async setupEventHandlers() {
    this.client.once('ready', async () => {
      this.logger.info(`🤖 gunnchAI3k is online as ${this.client.user?.tag}!`);
      this.logger.info('🧠 Learning engine active');
      this.logger.info('📊 Analytics tracking enabled');
      this.logger.info('🔔 Smart notifications configured');
    });

    this.client.on('interactionCreate', async interaction => {
      if (!interaction.isChatInputCommand()) return;

      try {
        await this.handleCommand(interaction);
      } catch (error) {
        this.logger.error('Error handling command:', error);
        await interaction.reply({ 
          content: '❌ An error occurred while processing your command.', 
          ephemeral: true 
        });
      }
    });
  }

  private async handleCommand(interaction: any) {
    const { commandName, options } = interaction;

    switch (commandName) {
      case 'learn':
        await this.handleLearnCommand(interaction, options);
        break;
      case 'analyze':
        await this.handleAnalyzeCommand(interaction, options);
        break;
      case 'suggest':
        await this.handleSuggestCommand(interaction, options);
        break;
      case 'track':
        await this.handleTrackCommand(interaction, options);
        break;
      case 'focus':
        await this.handleFocusCommand(interaction, options);
        break;
      case 'assign':
        await this.handleAssignCommand(interaction, options);
        break;
      case 'update':
        await this.handleUpdateCommand(interaction, options);
        break;
      case 'meeting':
        await this.handleMeetingCommand(interaction, options);
        break;
      case 'announce':
        await this.handleAnnounceCommand(interaction, options);
        break;
      case 'pattern':
        await this.handlePatternCommand(interaction, options);
        break;
      case 'risk':
        await this.handleRiskCommand(interaction, options);
        break;
      case 'optimize':
        await this.handleOptimizeCommand(interaction, options);
        break;
      case 'predict':
        await this.handlePredictCommand(interaction, options);
        break;
      case 'help':
        await this.handleHelpCommand(interaction);
        break;
    }
  }

  private async handleLearnCommand(interaction: any, options: any) {
    const decision = options.getString('decision', true);
    const outcome = options.getString('outcome', true);
    const context = options.getString('context') || '';

    await this.learningEngine.learnFromDecision({
      decision,
      outcome,
      context,
      timestamp: new Date(),
      userId: interaction.user.id
    });

    const embed = new EmbedBuilder()
      .setTitle('🧠 Learning Update')
      .setDescription('I\'ve learned from your decision and will use this to provide better suggestions in the future.')
      .setColor(0x00ff00)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleAnalyzeCommand(interaction: any, options: any) {
    const project = options.getString('project');
    
    await interaction.deferReply();
    
    const analysis = await this.decisionAnalyzer.analyzeProject(project);
    
    const embed = new EmbedBuilder()
      .setTitle('📊 Strategic Analysis')
      .setDescription(analysis.summary)
      .addFields(
        { name: 'Strengths', value: analysis.strengths.join('\n'), inline: true },
        { name: 'Weaknesses', value: analysis.weaknesses.join('\n'), inline: true },
        { name: 'Opportunities', value: analysis.opportunities.join('\n'), inline: true }
      )
      .setColor(0x0099ff)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleSuggestCommand(interaction: any, options: any) {
    const situation = options.getString('situation', true);
    
    await interaction.deferReply();
    
    const suggestions = await this.strategicPlanner.generateSuggestions(situation);
    
    const embed = new EmbedBuilder()
      .setTitle('💡 AI Recommendations')
      .setDescription(suggestions.summary)
      .addFields(
        { name: 'Recommended Actions', value: suggestions.actions.join('\n') },
        { name: 'Priority Level', value: suggestions.priority, inline: true },
        { name: 'Confidence', value: `${suggestions.confidence}%`, inline: true }
      )
      .setColor(0xff6b35)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleTrackCommand(interaction: any, options: any) {
    const metric = options.getString('metric');
    
    const metrics = await this.databaseManager.getMetrics(metric);
    
    const embed = new EmbedBuilder()
      .setTitle('📈 Progress Tracking')
      .setDescription('Here are your current metrics:')
      .addFields(
        { name: 'Tasks Completed', value: metrics.tasksCompleted.toString(), inline: true },
        { name: 'Success Rate', value: `${metrics.successRate}%`, inline: true },
        { name: 'Learning Progress', value: `${metrics.learningProgress}%`, inline: true }
      )
      .setColor(0x2ecc71)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleFocusCommand(interaction: any, options: any) {
    const enabled = options.getBoolean('enabled', true);
    
    await this.notificationManager.setFocusMode(enabled);
    
    const embed = new EmbedBuilder()
      .setTitle(enabled ? '🔕 Focus Mode Enabled' : '🔔 Notifications Enabled')
      .setDescription(enabled 
        ? 'I\'ll minimize notifications to help you focus. Use `/focus false` to re-enable.'
        : 'All notifications are now enabled.'
      )
      .setColor(enabled ? 0xff6b6b : 0x2ecc71)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleAssignCommand(interaction: any, options: any) {
    const task = options.getString('task', true);
    const assignee = options.getString('assignee');
    const deadline = options.getString('deadline');

    const taskId = await this.databaseManager.createTask({
      description: task,
      assignee,
      deadline: deadline ? new Date(deadline) : undefined,
      createdBy: interaction.user.id,
      createdAt: new Date()
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ Task Created')
      .setDescription(`**Task:** ${task}`)
      .addFields(
        { name: 'Assignee', value: assignee || 'Unassigned', inline: true },
        { name: 'Deadline', value: deadline || 'No deadline', inline: true },
        { name: 'Task ID', value: taskId, inline: true }
      )
      .setColor(0x2ecc71)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleUpdateCommand(interaction: any, options: any) {
    const progress = options.getString('progress', true);
    const project = options.getString('project');

    await this.databaseManager.addProgressUpdate({
      progress,
      project,
      userId: interaction.user.id,
      timestamp: new Date()
    });

    const embed = new EmbedBuilder()
      .setTitle('📝 Progress Update')
      .setDescription(`**Update:** ${progress}`)
      .addFields(
        { name: 'Project', value: project || 'General', inline: true },
        { name: 'Time', value: new Date().toLocaleString(), inline: true }
      )
      .setColor(0x3498db)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleMeetingCommand(interaction: any, options: any) {
    const title = options.getString('title', true);
    const time = options.getString('time', true);
    const url = options.getString('url');

    const meetingId = await this.databaseManager.createMeeting({
      title,
      time,
      url,
      createdBy: interaction.user.id,
      createdAt: new Date()
    });

    const embed = new EmbedBuilder()
      .setTitle('📅 Meeting Scheduled')
      .setDescription(`**${title}**`)
      .addFields(
        { name: 'Time', value: time, inline: true },
        { name: 'Link', value: url || 'TBD', inline: true },
        { name: 'Meeting ID', value: meetingId, inline: true }
      )
      .setColor(0xff6b35)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleAnnounceCommand(interaction: any, options: any) {
    const message = options.getString('message', true);

    const embed = new EmbedBuilder()
      .setTitle('📢 Announcement')
      .setDescription(message)
      .setColor(0x00ff00)
      .setTimestamp()
      .setFooter({ text: 'gunnchAI3k' });

    await interaction.reply({ embeds: [embed] });
  }

  private async handlePatternCommand(interaction: any, options: any) {
    const type = options.getString('type') || 'all';
    
    await interaction.deferReply();
    
    const patterns = await this.learningEngine.analyzePatterns(type);
    
    const embed = new EmbedBuilder()
      .setTitle('🔍 Pattern Analysis')
      .setDescription(patterns.summary)
      .addFields(
        { name: 'Key Patterns', value: patterns.keyPatterns.join('\n') },
        { name: 'Recommendations', value: patterns.recommendations.join('\n') }
      )
      .setColor(0x9b59b6)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleRiskCommand(interaction: any, options: any) {
    const project = options.getString('project');
    
    await interaction.deferReply();
    
    const risks = await this.riskAssessment.assessRisks(project);
    
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Risk Assessment')
      .setDescription(risks.summary)
      .addFields(
        { name: 'High Risk', value: risks.highRisks.join('\n') || 'None identified' },
        { name: 'Medium Risk', value: risks.mediumRisks.join('\n') || 'None identified' },
        { name: 'Mitigation', value: risks.mitigation.join('\n') }
      )
      .setColor(0xe74c3c)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleOptimizeCommand(interaction: any, options: any) {
    const area = options.getString('area');
    
    await interaction.deferReply();
    
    const optimizations = await this.strategicPlanner.getOptimizations(area);
    
    const embed = new EmbedBuilder()
      .setTitle('⚡ Optimization Suggestions')
      .setDescription(optimizations.summary)
      .addFields(
        { name: 'Quick Wins', value: optimizations.quickWins.join('\n') },
        { name: 'Long-term', value: optimizations.longTerm.join('\n') }
      )
      .setColor(0xf39c12)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handlePredictCommand(interaction: any, options: any) {
    const scenario = options.getString('scenario', true);
    
    await interaction.deferReply();
    
    const prediction = await this.learningEngine.predictOutcome(scenario);
    
    const embed = new EmbedBuilder()
      .setTitle('🔮 Outcome Prediction')
      .setDescription(prediction.summary)
      .addFields(
        { name: 'Probability', value: `${prediction.probability}%`, inline: true },
        { name: 'Confidence', value: `${prediction.confidence}%`, inline: true },
        { name: 'Factors', value: prediction.factors.join('\n') }
      )
      .setColor(0x8e44ad)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  private async handleHelpCommand(interaction: any) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 gunnchAI3k Commands')
      .setDescription('Here are all available commands:')
      .addFields(
        { name: '🧠 Learning', value: '/learn - Teach from decisions\n/analyze - Strategic analysis\n/suggest - AI recommendations', inline: false },
        { name: '📊 Tracking', value: '/track - Monitor metrics\n/update - Report progress\n/assign - Create tasks', inline: false },
        { name: '🎯 Intelligence', value: '/pattern - Analyze patterns\n/risk - Assess risks\n/optimize - Get suggestions\n/predict - Forecast outcomes', inline: false },
        { name: '🔧 Management', value: '/meeting - Schedule meetings\n/announce - Share information\n/focus - Control notifications', inline: false }
      )
      .setColor(0x3498db)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}

// Start the bot
const bot = new GunnchAI3k();
bot.start().catch(console.error);
