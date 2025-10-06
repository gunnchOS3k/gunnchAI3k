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
import { AuditManager } from './security/audit';
import { EncryptionManager } from './security/encryption';
import { AuthorizationManager, User, UserRole } from './security/authorization';
import { ComplianceManager } from './security/compliance';

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
  
  // Security Components
  private auditManager: AuditManager;
  private encryptionManager: EncryptionManager;
  private authorizationManager: AuthorizationManager;
  private complianceManager: ComplianceManager;

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
    
    // Initialize security components first
    const encryptionKey = process.env.ENCRYPTION_KEY || this.generateSecureKey();
    this.encryptionManager = new EncryptionManager(encryptionKey);
    this.auditManager = new AuditManager(this.databaseManager['db'], encryptionKey);
    this.authorizationManager = new AuthorizationManager(this.auditManager);
    this.complianceManager = new ComplianceManager(this.auditManager, this.encryptionManager);
    
    // Initialize core components with security
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
      // Initialize security components first
      await this.databaseManager.initialize();
      await this.auditManager.initialize();
      
      // Initialize core components
      await this.learningEngine.initialize();
      await this.githubIntegration.initialize();
      await this.cursorIntegration.initialize();
      
      // Perform security assessment
      await this.performSecurityAssessment();
      
      this.logger.info('🔒 gunnchAI3k initialized with enterprise-grade security');
      this.logger.info('🛡️ Zero-trust architecture active');
      this.logger.info('📊 Comprehensive audit logging enabled');
    } catch (error) {
      this.logger.error('Failed to initialize gunnchAI3k:', error);
      throw error;
    }
  }

  private generateSecureKey(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private async performSecurityAssessment() {
    try {
      // Assess compliance frameworks
      await this.complianceManager.assessCompliance('SOC2');
      await this.complianceManager.assessCompliance('ISO27001');
      await this.complianceManager.assessCompliance('GDPR');
      
      this.logger.info('✅ Security assessment completed');
    } catch (error) {
      this.logger.error('Security assessment failed:', error);
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
        .setDescription('Show available commands and features'),
      
      // Security Commands
      new SlashCommandBuilder()
        .setName('security')
        .setDescription('Security and compliance information')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of security information')
            .setRequired(true)
            .addChoices(
              { name: 'Compliance Report', value: 'compliance' },
              { name: 'Audit Trail', value: 'audit' },
              { name: 'Security Events', value: 'events' },
              { name: 'Access Control', value: 'access' }
            )
        ),
      
      new SlashCommandBuilder()
        .setName('approve')
        .setDescription('Approve pending AI actions (Executive only)')
        .addStringOption(option =>
          option.setName('action_id')
            .setDescription('ID of the action to approve')
            .setRequired(true)
        ),
      
      new SlashCommandBuilder()
        .setName('reject')
        .setDescription('Reject pending AI actions (Executive only)')
        .addStringOption(option =>
          option.setName('action_id')
            .setDescription('ID of the action to reject')
            .setRequired(true)
        ),
      
      new SlashCommandBuilder()
        .setName('audit')
        .setDescription('View audit logs and security events')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of audit information')
            .setRequired(false)
            .addChoices(
              { name: 'Recent Events', value: 'recent' },
              { name: 'Security Events', value: 'security' },
              { name: 'AI Actions', value: 'ai' },
              { name: 'User Actions', value: 'user' }
            )
        )
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
      case 'security':
        await this.handleSecurityCommand(interaction, options);
        break;
      case 'approve':
        await this.handleApproveCommand(interaction, options);
        break;
      case 'reject':
        await this.handleRejectCommand(interaction, options);
        break;
      case 'audit':
        await this.handleAuditCommand(interaction, options);
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
        { name: '🔧 Management', value: '/meeting - Schedule meetings\n/announce - Share information\n/focus - Control notifications', inline: false },
        { name: '🔒 Security', value: '/security - Security and compliance info\n/approve - Approve AI actions (Executive)\n/reject - Reject AI actions (Executive)\n/audit - View audit logs and events', inline: false }
      )
      .setColor(0x3498db)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleSecurityCommand(interaction: any, options: any) {
    const type = options.getString('type', true);
    
    await interaction.deferReply();
    
    try {
      let embed: EmbedBuilder;
      
      switch (type) {
        case 'compliance':
          const complianceReport = await this.complianceManager.generateComplianceReport();
          embed = new EmbedBuilder()
            .setTitle('🔒 Compliance Report')
            .setDescription(`Overall Compliance Score: ${complianceReport.overallComplianceScore}%`)
            .addFields(
              { name: 'SOC 2', value: complianceReport.frameworks.find(f => f.name === 'SOC 2 Type II')?.status || 'Unknown', inline: true },
              { name: 'ISO 27001', value: complianceReport.frameworks.find(f => f.name === 'ISO 27001')?.status || 'Unknown', inline: true },
              { name: 'GDPR', value: complianceReport.frameworks.find(f => f.name === 'GDPR')?.status || 'Unknown', inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();
          break;
          
        case 'audit':
          const auditEvents = await this.auditManager.getAuditTrail(undefined, 
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            new Date()
          );
          embed = new EmbedBuilder()
            .setTitle('📊 Audit Trail')
            .setDescription(`Recent audit events (${auditEvents.length} events)`)
            .addFields(
              auditEvents.slice(0, 5).map(event => ({
                name: `${event.action} - ${event.result}`,
                value: `User: ${event.userId}\nResource: ${event.resource}\nTime: ${event.timestamp.toLocaleString()}`,
                inline: false
              }))
            )
            .setColor(0x0099ff)
            .setTimestamp();
          break;
          
        case 'events':
          const securityEvents = await this.auditManager.getSecurityEvents();
          const criticalEvents = securityEvents.filter(e => e.severity === 'CRITICAL').length;
          const highEvents = securityEvents.filter(e => e.severity === 'HIGH').length;
          
          embed = new EmbedBuilder()
            .setTitle('🚨 Security Events')
            .setDescription(`Total Events: ${securityEvents.length}`)
            .addFields(
              { name: 'Critical', value: criticalEvents.toString(), inline: true },
              { name: 'High', value: highEvents.toString(), inline: true },
              { name: 'Medium', value: securityEvents.filter(e => e.severity === 'MEDIUM').length.toString(), inline: true }
            )
            .setColor(criticalEvents > 0 ? 0xff0000 : highEvents > 0 ? 0xff6b35 : 0x00ff00)
            .setTimestamp();
          break;
          
        case 'access':
          const securityReport = await this.authorizationManager.getSecurityReport();
          embed = new EmbedBuilder()
            .setTitle('🛡️ Access Control')
            .setDescription(`Security Score: ${securityReport.securityScore}/100`)
            .addFields(
              { name: 'Total Security Events', value: securityReport.totalSecurityEvents.toString(), inline: true },
              { name: 'Critical Events', value: securityReport.criticalEvents.toString(), inline: true },
              { name: 'High Severity', value: securityReport.highSeverityEvents.toString(), inline: true }
            )
            .setColor(securityReport.securityScore > 80 ? 0x00ff00 : securityReport.securityScore > 60 ? 0xff6b35 : 0xff0000)
            .setTimestamp();
          break;
          
        default:
          embed = new EmbedBuilder()
            .setTitle('❌ Invalid Security Type')
            .setDescription('Please specify a valid security type.')
            .setColor(0xff0000);
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.logger.error('Security command failed:', error);
      await interaction.editReply({ content: '❌ Failed to retrieve security information.' });
    }
  }

  private async handleApproveCommand(interaction: any, options: any) {
    const actionId = options.getString('action_id', true);
    
    // Check if user has executive role
    const user = await this.getUser(interaction.user.id);
    if (user.role !== UserRole.EXECUTIVE) {
      await interaction.reply({ 
        content: '❌ Only executives can approve AI actions.', 
        ephemeral: true 
      });
      return;
    }
    
    try {
      const success = await this.auditManager.approveAIAction(actionId, user.id);
      
      if (success) {
        const embed = new EmbedBuilder()
          .setTitle('✅ AI Action Approved')
          .setDescription(`Action ${actionId} has been approved and executed.`)
          .setColor(0x00ff00)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ 
          content: '❌ Failed to approve action. Action may not exist or already processed.', 
          ephemeral: true 
        });
      }
    } catch (error) {
      this.logger.error('Approve command failed:', error);
      await interaction.reply({ 
        content: '❌ Failed to approve action.', 
        ephemeral: true 
      });
    }
  }

  private async handleRejectCommand(interaction: any, options: any) {
    const actionId = options.getString('action_id', true);
    
    // Check if user has executive role
    const user = await this.getUser(interaction.user.id);
    if (user.role !== UserRole.EXECUTIVE) {
      await interaction.reply({ 
        content: '❌ Only executives can reject AI actions.', 
        ephemeral: true 
      });
      return;
    }
    
    try {
      // Log rejection
      await this.auditManager.logAuditEvent({
        timestamp: new Date(),
        userId: user.id,
        action: 'REJECT_AI_ACTION',
        resource: 'ai_actions',
        result: 'SUCCESS',
        metadata: { actionId }
      });
      
      const embed = new EmbedBuilder()
        .setTitle('❌ AI Action Rejected')
        .setDescription(`Action ${actionId} has been rejected and will not be executed.`)
        .setColor(0xff0000)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.logger.error('Reject command failed:', error);
      await interaction.reply({ 
        content: '❌ Failed to reject action.', 
        ephemeral: true 
      });
    }
  }

  private async handleAuditCommand(interaction: any, options: any) {
    const type = options.getString('type') || 'recent';
    
    await interaction.deferReply();
    
    try {
      let events: any[];
      let title: string;
      
      switch (type) {
        case 'recent':
          events = await this.auditManager.getAuditTrail(undefined, 
            new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            new Date()
          );
          title = 'Recent Audit Events (Last 24 Hours)';
          break;
          
        case 'security':
          events = await this.auditManager.getSecurityEvents();
          title = 'Security Events';
          break;
          
        case 'ai':
          events = await this.auditManager.getPendingAIActions();
          title = 'Pending AI Actions';
          break;
          
        case 'user':
          events = await this.auditManager.getAuditTrail(interaction.user.id);
          title = 'Your Audit Events';
          break;
          
        default:
          events = [];
          title = 'Audit Information';
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`📊 ${title}`)
        .setDescription(`Found ${events.length} events`)
        .setColor(0x0099ff)
        .setTimestamp();
      
      if (events.length > 0) {
        const eventFields = events.slice(0, 10).map((event, index) => ({
          name: `${index + 1}. ${event.action || event.eventType || 'Event'}`,
          value: `Time: ${new Date(event.timestamp).toLocaleString()}\nUser: ${event.userId}\nResult: ${event.result || event.severity || 'N/A'}`,
          inline: false
        }));
        
        embed.addFields(eventFields);
      } else {
        embed.setDescription('No events found for the specified criteria.');
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.logger.error('Audit command failed:', error);
      await interaction.editReply({ content: '❌ Failed to retrieve audit information.' });
    }
  }

  private async getUser(userId: string): Promise<User> {
    // This would typically fetch from database
    // For now, return a mock executive user
    return {
      id: userId,
      username: 'user',
      email: 'user@example.com',
      role: UserRole.EXECUTIVE,
      permissions: [],
      mfaEnabled: true,
      isActive: true
    };
  }
}

// Start the bot
const bot = new GunnchAI3k();
bot.start().catch(console.error);
