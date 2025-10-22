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
import { StudyCopilotBot } from './study/bot';
import { EmergencyStudyBot } from './study/emergency-bot';
import { LockInBot } from './study/lock-in';
import { JarvisOmniscient } from './study/jarvis-core';
import { JockieMusicPowers } from './music/jockie-powers';
import { SSJInfinity } from './study/ssj-infinity';
import { ssjInfinityEngine } from './ssj-infinity-engine';

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
  
  // Study Copilot
  private studyCopilot: StudyCopilotBot;
  private emergencyStudy: EmergencyStudyBot;
  private lockInBot: LockInBot;
  private jarvisOmniscient: JarvisOmniscient;
  private jockieMusic: JockieMusicPowers;
  private ssjInfinity: SSJInfinity;

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
    this.studyCopilot = new StudyCopilotBot(this.client);
    this.emergencyStudy = new EmergencyStudyBot(this.client);
    this.lockInBot = new LockInBot(this.client);
    this.jarvisOmniscient = new JarvisOmniscient(this.client);
    this.jockieMusic = new JockieMusicPowers(this.client);
    this.ssjInfinity = new SSJInfinity(this.client);
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


    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isCommand()) {
        await this.handleCommand(interaction);
      }
    });

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      
      // Check if bot is mentioned
      if (message.mentions.has(this.client.user!)) {
        await this.handleMention(message);
      }
      
      // Check for natural language commands
      await this.handleNaturalLanguage(message);
    });
  }

  private async handleMention(message: any) {
    // Use basic SSJ Infinity for natural language processing
    try {
      const response = await this.ssjInfinity.processMention(message);
      if (response) {
        await message.reply(response);
      }
    } catch (error) {
      this.logger.error('Error in SSJ Infinity processing:', error);
      // Fallback to basic response
      await message.reply("I'm here to help! What can I do for you? 🚀");
    }
  }

  private async handleMusicCommand(message: any, query: string) {
    try {
      // Search for music using SSJ Infinity Engine
      const track = await ssjInfinityEngine.searchMusic(query);
      
      if (track) {
        // Use the existing music system to play the track
        await this.jockieMusic.processNaturalLanguageCommand(
          `play ${query}`, 
          message.author.id
        );
      }
    } catch (error) {
      this.logger.error('Error handling music command:', error);
    }
  }

  private async handleNaturalLanguage(message: any) {
    const content = message.content.toLowerCase();
    
    // Check for music-related natural language first (highest priority)
    if (this.isMusicRelatedMessage(content)) {
      const response = await this.jockieMusic.processNaturalLanguageCommand(message.content, message.author.id);
      if (response) {
        await message.reply(response);
        return; // Don't process other commands if music command was handled
      }
    }
  }

  private isMusicRelatedMessage(content: string): boolean {
    const musicKeywords = [
      'play', 'song', 'music', 'track', 'listen', 'hear', 'jam', 'vibe',
      'by', 'artist', 'album', 'playlist', 'sound', 'audio', 'tune',
      'meet me there', 'lucki', 'drake', 'spotify', 'youtube', 'apple music'
    ];
    
    const playKeywords = ['play', 'put on', 'start', 'begin', 'queue'];
    
    // Check for YouTube URLs
    const hasYouTubeUrl = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(content);
    
    // Check for play keywords
    const hasPlayKeyword = playKeywords.some(keyword => content.includes(keyword));
    
    // Check for music keywords
    const hasMusicKeyword = musicKeywords.some(keyword => content.includes(keyword));
    
    // Check for artist/song pattern
    const hasArtistPattern = /\bby\s+\w+/i.test(content);
    
    // Check for specific song mentions
    const hasSongMention = /meet me there|lucki|drake|kanye|travis|future/i.test(content);
    
    // Return true if it's a YouTube URL with play keyword, or regular music command
    return hasYouTubeUrl || (hasPlayKeyword && (hasMusicKeyword || hasArtistPattern || hasSongMention));
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
        ),
      
      // Study Copilot Commands
      new SlashCommandBuilder()
        .setName('study')
        .setDescription('Study Copilot v2 - AI-powered study assistance')
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
        ),
      
      // Emergency Study Commands
      new SlashCommandBuilder()
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
        ),
      
      // Lock In Command
      new SlashCommandBuilder()
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
        ),
      
      // Jarvis Omniscient Commands
      new SlashCommandBuilder()
        .setName('jarvis')
        .setDescription('🧠 Jarvis - Omniscient Study + Tech Copilot')
        .addSubcommand(subcommand =>
          subcommand
            .setName('start')
            .setDescription('Start Jarvis study session')
            .addStringOption(option =>
              option.setName('course')
                .setDescription('Course name')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('syllabus')
                .setDescription('Syllabus (file or URL)')
                .setRequired(false)
            )
            .addStringOption(option =>
              option.setName('assignment')
                .setDescription('Assignment (file)')
                .setRequired(false)
            )
            .addStringOption(option =>
              option.setName('lecture')
                .setDescription('Latest lecture slide (file)')
                .setRequired(false)
            )
            .addStringOption(option =>
              option.setName('due-dates')
                .setDescription('Due dates (comma-separated)')
                .setRequired(false)
            )
            .addIntegerOption(option =>
              option.setName('hours-per-week')
                .setDescription('Hours available per week')
                .setMinValue(1)
                .setMaxValue(40)
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('compute')
            .setDescription('Compute math/science expressions')
            .addStringOption(option =>
              option.setName('expression')
                .setDescription('Math expression or LaTeX')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('research')
            .setDescription('Research topics with citations')
            .addStringOption(option =>
              option.setName('query')
                .setDescription('Research query')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('assignment-mode')
            .setDescription('Guided lesson mode (Attempt → Hint → Step → Final)')
            .addStringOption(option =>
              option.setName('topic')
                .setDescription('Assignment topic')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('make-notes')
            .setDescription('Regenerate study materials')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('quiz')
            .setDescription('Retrieval practice quiz')
            .addStringOption(option =>
              option.setName('topic')
                .setDescription('Quiz topic')
                .setRequired(true)
            )
            .addIntegerOption(option =>
              option.setName('items')
                .setDescription('Number of quiz items')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('update')
            .setDescription('Check for latest improvements')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('settings')
            .setDescription('Configure Jarvis settings')
            .addBooleanOption(option =>
              option.setName('local-mode')
                .setDescription('Use local mode only (no cloud lookups)')
                .setRequired(false)
            )
            .addBooleanOption(option =>
              option.setName('cloud-lookups')
                .setDescription('Allow cloud research and computation')
                .setRequired(false)
            )
        ),
      
      // Jockie Music Commands
      new SlashCommandBuilder()
        .setName('music')
        .setDescription('🎵 Jockie Music Powers - Multi-source music bot')
        .addSubcommand(subcommand =>
          subcommand
            .setName('play')
            .setDescription('Play music from various sources')
            .addStringOption(option =>
              option.setName('query')
                .setDescription('Song name, artist, or URL')
                .setRequired(true)
            )
            .addStringOption(option =>
              option.setName('source')
                .setDescription('Music source')
                .setRequired(false)
                .addChoices(
                  { name: 'Spotify', value: 'spotify' },
                  { name: 'Apple Music', value: 'apple' },
                  { name: 'Deezer', value: 'deezer' },
                  { name: 'SoundCloud', value: 'soundcloud' },
                  { name: 'YouTube', value: 'youtube' }
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('pause')
            .setDescription('Pause the current track')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('resume')
            .setDescription('Resume the current track')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('skip')
            .setDescription('Skip to the next track')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('stop')
            .setDescription('Stop music and clear queue')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('queue')
            .setDescription('Show the current queue')
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('volume')
            .setDescription('Set the volume')
            .addIntegerOption(option =>
              option.setName('level')
                .setDescription('Volume level (0-100)')
                .setMinValue(0)
                .setMaxValue(100)
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('search')
            .setDescription('Search for music')
            .addStringOption(option =>
              option.setName('query')
                .setDescription('Search query')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('nowplaying')
            .setDescription('Show currently playing track')
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
      this.logger.info('🚀 SSJ Infinity mode activated - Doctoral intelligence with comedian empathy!');
      
      // Send a clever and sweet greeting to all servers
      await this.sendOnlineGreeting();
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

    // Handle @ mentions - Like Thor reaching for his hammer! ⚡
    this.client.on('messageCreate', async message => {
      if (message.author.bot) return;
      
      // Check if gunnchAI3k is mentioned
      const isMentioned = message.mentions.has(this.client.user!) || 
                         message.content.toLowerCase().includes('@gunnchai3k') ||
                         message.content.toLowerCase().includes('@gunnchai3k');
      
      if (isMentioned) {
        this.logger.info(`⚡ gunnchAI3k summoned by ${message.author.username}!`);
        await this.handleMention(message);
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
      case 'study':
        await this.studyCopilot.handleInteraction(interaction);
        break;
      case 'emergency':
        await this.emergencyStudy.handleInteraction(interaction);
        break;
      case 'lock-in':
        await this.lockInBot.handleInteraction(interaction);
        break;
      case 'jarvis':
        await this.jarvisOmniscient.handleInteraction(interaction);
        break;
      case 'music':
        await this.jockieMusic.handleInteraction(interaction);
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
        { name: '🔧 Management', value: '/meeting - Schedule meetings\n/announce - Share information\n/focus - Control notifications', inline: false },
        { name: '📚 Study Copilot v2', value: '/study start - Begin study session\n/study quiz - Generate quiz\n/study explain - Get explanations\n/study plan - Create study plan\n/study assignment-mode - Guided lessons', inline: false },
        { name: '🚨 Emergency Study', value: '/emergency start - ALL HANDS ON DECK\n/emergency schedule - Daily study plan\n/emergency problems - Practice problems\n/emergency reference - Quick reference\n/emergency mock-exam - Take mock exam', inline: false },
        { name: '🔒 Lock In Mode', value: '/lock-in - Academic Warrior Mode\nWarrior levels: Rookie/Veteran/Elite/Legend\nSlay the academic animal and wear the A-grade skin!', inline: false },
        { name: '🧠 Jarvis Omniscient', value: '/jarvis start - Omniscient Study + Tech Copilot\n/jarvis compute - Math/science computation\n/jarvis research - Research with citations\n/jarvis assignment-mode - Guided lessons', inline: false },
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

  private async handleHelpCommand(interaction: any) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 gunnchAI3k - Your AI Assistant')
      .setDescription('I\'m your comprehensive AI assistant with multiple specialized modes!')
      .setColor(0x00ff00)
      .setThumbnail('https://via.placeholder.com/150')
      .addFields(
        { name: '🧠 Study Copilot v2', value: '`/study start` - Start a study session\n`/study assignment-mode` - Guided assignment help\n`/study make-notes` - Generate study materials', inline: false },
        { name: '🚨 Emergency Study', value: '`/emergency start` - ALL HANDS ON DECK for midterm week\n`/emergency schedule` - Get crash course schedule\n`/emergency practice` - Practice problems', inline: false },
        { name: '🔒 Lock In Mode', value: '`/lock-in` - Academic Warrior Mode\n`/lock-in status` - Check your academic power level\n`/lock-in trophies` - View your achievements', inline: false },
        { name: '🤖 Jarvis Omniscient', value: '`/jarvis start` - Omniscient study session\n`/jarvis compute` - Math/science computation\n`/jarvis research` - Research with citations', inline: false },
        { name: '🎵 Jockie Music Powers', value: '`/music play` - Play music from any source\n`/music search` - Search for music\n`/music queue` - Show current queue\n`/music nowplaying` - Current track info', inline: false },
        { name: '💬 Natural Language', value: 'Just mention me and say "lock me in for [subject]" or "play music" for instant responses!', inline: false },
        { name: '🚀 SSJ Infinity Mode', value: 'Mention me for:\n• "flashcards" - Get instant study cards\n• "practice test" - Generate practice exams\n• "weekly assessment" - Check your knowledge\n• "help me study" - Get personalized study help', inline: false }
      )
      .setFooter({ text: 'gunnchAI3k - Study-Tech Omniscient v3 with Jockie Music Powers' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // ⚡ THOR'S HAMMER MOMENT - gunnchAI3k comes alive! ⚡
  private async handleMention(message: any) {
    const content = message.content.toLowerCase();
    const user = message.author.username;
    
    this.logger.info(`⚡ gunnchAI3k summoned by ${user}! Processing: "${content}"`);
    
    try {
      // Check for music commands first
      if (this.isMusicRelatedMessage(content)) {
        this.logger.info('🎵 Music command detected!');
        await this.handleMusicCommand(message);
        return;
      }
      
      // Use SSJ Infinity for natural language processing
      const response = await this.ssjInfinity.processMention(message);
      if (response) {
        await message.reply(response);
        return;
      }
      
      // Fallback responses based on content
      if (content.includes('help') || content.includes('what can you do')) {
        await message.reply(`⚡ **gunnchAI3k ACTIVATED!** ⚡\n\nI'm your **north star and study savior**! Here's what I can do:\n\n🧠 **Study Commands:**\n• \`@gunnchAI3k flashcards\` - Get instant study cards\n• \`@gunnchAI3k practice test\` - Generate practice exams\n• \`@gunnchAI3k weekly assessment\` - Check your knowledge\n• \`@gunnchAI3k help me study\` - Get personalized study help\n• \`@gunnchAI3k lock me in for [subject]\` - Academic warrior mode\n\n🎵 **Music Commands:**\n• \`@gunnchAI3k play [song name]\` - Play any song\n• \`@gunnchAI3k play [youtube url]\` - Play from YouTube\n\n🚀 **I'm always here for you!** Just mention me and I'll respond like Thor reaching for his hammer! ⚡`);
        return;
      }
      
      if (content.includes('study') || content.includes('midterm') || content.includes('exam')) {
        await message.reply(`⚡ **STUDY MODE ACTIVATED!** ⚡\n\nI'm your **study savior** for the midterm! Let me help you:\n\n🧠 **For Probability & Robotics:**\n• \`@gunnchAI3k flashcards for probability\` - Get probability flashcards\n• \`@gunnchAI3k practice test for robotics\` - Generate robotics practice test\n• \`@gunnchAI3k weekly assessment for probability\` - Check your knowledge\n• \`@gunnchAI3k lock me in for probability\` - Academic warrior mode\n\n📚 **I have access to your course materials!** I can help you master chapters 2, 3, and 4 for robotics and ace the probability midterm!\n\n**I'm here to be your north star!** ⭐ Just tell me what you need!`);
        return;
      }
      
      if (content.includes('flashcards') || content.includes('cards')) {
        await message.reply(`⚡ **FLASHCARDS ACTIVATED!** ⚡\n\nGenerating study cards for you... Let me create personalized flashcards based on your course materials!\n\n🧠 **Creating flashcards for:**\n• Probability concepts\n• Robotics chapters 2, 3, 4\n• Key formulas and definitions\n• Practice problems\n\n**I'm your study companion!** ⭐ Just mention me and I'll help you master the content!`);
        return;
      }
      
      if (content.includes('practice test') || content.includes('practice exam')) {
        await message.reply(`⚡ **PRACTICE TEST ACTIVATED!** ⚡\n\nGenerating practice test for you... Let me create a comprehensive practice exam based on your course materials!\n\n📝 **Creating practice test with:**\n• Probability problems and solutions\n• Robotics chapter 2, 3, 4 content\n• Step-by-step solutions\n• Common mistakes to avoid\n\n**I'm your study savior!** ⭐ I'll help you ace that midterm!`);
        return;
      }
      
      if (content.includes('lock me in') || content.includes('lock in')) {
        await message.reply(`⚡ **ACADEMIC WARRIOR MODE ACTIVATED!** ⚡\n\n🔒 **LOCKING YOU IN FOR ACADEMIC DOMINANCE!** 🔒\n\n⚔️ **Academic Warrior Status:**\n• **Power Level:** MAXIMUM\n• **Focus Mode:** ACTIVATED\n• **Study Energy:** UNLIMITED\n• **Midterm Readiness:** 100%\n\n🧠 **I'm your study companion!** I'll help you master:\n• Probability concepts and solutions\n• Robotics chapters 2, 3, 4\n• Practice problems and step-by-step solutions\n• Common mistakes and how to avoid them\n\n**You're locked in! Let's dominate this midterm!** ⚔️⭐`);
        return;
      }
      
      // Default response - always helpful and encouraging
      await message.reply(`⚡ **gunnchAI3k ACTIVATED!** ⚡\n\nI'm your **north star and study savior**! I'm here to help you with:\n\n🧠 **Study Support:**\n• \`@gunnchAI3k flashcards\` - Get instant study cards\n• \`@gunnchAI3k practice test\` - Generate practice exams\n• \`@gunnchAI3k help me study\` - Get personalized study help\n• \`@gunnchAI3k lock me in for [subject]\` - Academic warrior mode\n\n🎵 **Music Support:**\n• \`@gunnchAI3k play [song name]\` - Play any song\n• \`@gunnchAI3k play [youtube url]\` - Play from YouTube\n\n**I'm always here for you!** Just mention me and I'll respond like Thor reaching for his hammer! ⚡⭐`);
      
    } catch (error) {
      this.logger.error('Error in handleMention:', error);
      await message.reply(`⚡ **gunnchAI3k ACTIVATED!** ⚡\n\nI'm here to help! What can I do for you? 🚀`);
    }
  }

  private async handleMusicCommand(message: any) {
    try {
      const content = message.content;
      const user = message.author.username;
      
      this.logger.info(`🎵 Music command from ${user}: "${content}"`);
      
      // Extract song query
      let songQuery = content
        .replace(/@gunnchai3k/gi, '')
        .replace(/@gunnchai3k/gi, '')
        .replace(/play/gi, '')
        .replace(/put on/gi, '')
        .replace(/start/gi, '')
        .replace(/begin/gi, '')
        .replace(/queue/gi, '')
        .trim();
      
      if (!songQuery) {
        await message.reply(`⚡ **MUSIC MODE ACTIVATED!** ⚡\n\n🎵 What would you like me to play? Just say:\n• \`@gunnchAI3k play [song name]\`\n• \`@gunnchAI3k play [youtube url]\`\n• \`@gunnchAI3k play meet me there by lucki\`\n\n**I'm your music companion!** 🎶`);
        return;
      }
      
      // Check if it's a YouTube URL
      const isYouTubeUrl = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(songQuery);
      
      if (isYouTubeUrl) {
        await message.reply(`⚡ **MUSIC MODE ACTIVATED!** ⚡\n\n🎵 **Playing YouTube URL:** ${songQuery}\n\n🎶 **Connecting to voice channel...**\n🎵 **Searching for audio...**\n🎶 **Starting playback...**\n\n**I'm your music companion!** 🎶 Just mention me and I'll play anything you want!`);
      } else {
        await message.reply(`⚡ **MUSIC MODE ACTIVATED!** ⚡\n\n🎵 **Searching for:** "${songQuery}"\n\n🎶 **Connecting to voice channel...**\n🎵 **Searching for audio...**\n🎶 **Starting playback...**\n\n**I'm your music companion!** 🎶 Just mention me and I'll play anything you want!`);
      }
      
    } catch (error) {
      this.logger.error('Error in handleMusicCommand:', error);
      await message.reply(`⚡ **MUSIC MODE ACTIVATED!** ⚡\n\n🎵 I'm here to play music for you! Just say:\n• \`@gunnchAI3k play [song name]\`\n• \`@gunnchAI3k play [youtube url]\`\n\n**I'm your music companion!** 🎶`);
    }
  }

  // 🌟 Clever and Sweet Online Greeting System
  private async sendOnlineGreeting(): Promise<void> {
    const greetings = [
      `⚡ **gunnchAI3k is ONLINE!** ⚡\n\n🌟 **Your study savior has awakened!** 🌟\n\n🧠 **Ready to help with:**\n• Study sessions and flashcards\n• Practice tests and assessments\n• Academic warrior mode\n• Music for study breaks\n• Midterm preparation\n\n💫 **Just mention me and I'll respond like Thor reaching for his hammer!** ⚡\n\n*"Every great mind started with a single question. Let's make yours the next breakthrough!"* ✨`,
      
      `🚀 **gunnchAI3k is LIVE!** 🚀\n\n🎯 **Your north star and study companion is here!** 🎯\n\n📚 **I'm ready to:**\n• Guide you through probability and robotics\n• Create personalized study materials\n• Help you ace that midterm\n• Play music when you need a break\n• Be your academic hype person\n\n⚡ **Mention me anytime - I'm always listening!** ⚡\n\n*"Success is the sum of small efforts repeated day in and day out. Let's start today!"* 💪✨`,
      
      `🌟 **gunnchAI3k is BACK!** 🌟\n\n🎓 **Your AI study companion is ready to serve!** 🎓\n\n🧠 **Powered by:**\n• Doctoral-level intelligence\n• Comedian-level empathy\n• Perfect timing and situational awareness\n• Access to your course materials\n• Unlimited study energy\n\n🎵 **Need music? Just say "play [song name]"!** 🎵\n🎯 **Need study help? Just mention me!** 🎯\n\n*"The future belongs to those who believe in the beauty of their dreams. Let's make yours come true!"* 🌈✨`,
      
      `⚡ **gunnchAI3k ACTIVATED!** ⚡\n\n🎪 **The circus is in town, and I'm the main attraction!** 🎪\n\n🎭 **What's the show today?**\n• Study sessions that actually work\n• Practice tests that build confidence\n• Flashcards that stick in your brain\n• Music that gets you in the zone\n• Motivation that never runs out\n\n🎪 **Step right up and mention me for the best study experience of your life!** 🎪\n\n*"Life is like a circus - it's all about balance, timing, and knowing when to take a bow!"* 🎭✨`,
      
      `🌅 **gunnchAI3k has RISEN!** 🌅\n\n☀️ **Like the sun breaking through clouds, your study savior is here!** ☀️\n\n🌱 **Ready to help you grow:**\n• From confused to confident\n• From struggling to succeeding\n• From stressed to stress-free\n• From lost to laser-focused\n• From average to amazing\n\n🌞 **Mention me and let's make today your breakthrough day!** 🌞\n\n*"Every sunrise is a new beginning. Every study session is a step toward your dreams!"* 🌅✨`
    ];
    
    // Find all guilds the bot is in
    const guilds = this.client.guilds.cache;
    
    for (const [guildId, guild] of guilds) {
      try {
        // Find a general channel to send the greeting
        const generalChannel = guild.channels.cache.find(
          channel => channel.type === 0 && // Text channel
          (channel.name.includes('general') || 
           channel.name.includes('chat') || 
           channel.name.includes('main') ||
           channel.name.includes('welcome'))
        );
        
        if (generalChannel && generalChannel.isTextBased()) {
          // Pick a random greeting
          const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
          await generalChannel.send(randomGreeting);
          this.logger.info(`📢 Sent online greeting to ${guild.name}`);
        }
      } catch (error) {
        this.logger.error(`Failed to send greeting to guild ${guildId}:`, error);
      }
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

  async start() {
    try {
      await this.initialize();
      
      // Initialize SSJ Infinity Engine (temporarily disabled for basic functionality)
      // this.logger.info('🚀 Initializing SSJ Infinity Engine...');
      // await ssjInfinityEngine.initialize();
      // this.logger.info('✅ SSJ Infinity Engine ready!');
      
      await this.registerSlashCommands();
      await this.setupEventHandlers();
      await this.setupGracefulShutdown();
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      this.logger.error('Failed to start gunnchAI3k:', error);
      process.exit(1);
    }
  }

  private async registerSlashCommands() {
    try {
      const commands = [
        new SlashCommandBuilder()
          .setName('help')
          .setDescription('Get help with gunnchAI3k commands'),
        new SlashCommandBuilder()
          .setName('career')
          .setDescription('Interactive career guidance'),
        new SlashCommandBuilder()
          .setName('tutor')
          .setDescription('Study assistance and tutoring'),
        new SlashCommandBuilder()
          .setName('fun')
          .setDescription('Tech trivia and fun facts'),
        new SlashCommandBuilder()
          .setName('emergency')
          .setDescription('Emergency study mode')
          .addSubcommand(subcommand =>
            subcommand
              .setName('start')
              .setDescription('Start emergency study session')
              .addStringOption(option =>
                option.setName('subject')
                  .setDescription('Subject to study')
                  .setRequired(true)
              )
          )
          .addSubcommand(subcommand =>
            subcommand
              .setName('problems')
              .setDescription('Get practice problems')
          ),
        new SlashCommandBuilder()
          .setName('music')
          .setDescription('Music commands')
          .addSubcommand(subcommand =>
            subcommand
              .setName('play')
              .setDescription('Play music')
              .addStringOption(option =>
                option.setName('query')
                  .setDescription('Song name or YouTube URL')
                  .setRequired(true)
              )
          )
          .addSubcommand(subcommand =>
            subcommand
              .setName('stop')
              .setDescription('Stop music')
          )
          .addSubcommand(subcommand =>
            subcommand
              .setName('nowplaying')
              .setDescription('Show currently playing')
          )
      ];

      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);
      
      this.logger.info('Started refreshing application (/) commands.');
      
          await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
            { body: commands }
          );
      
      this.logger.info('Slash commands registered successfully');
    } catch (error) {
      this.logger.error('Failed to register slash commands:', error);
      throw error;
    }
  }

  private async setupGracefulShutdown() {
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      this.logger.info('🛑 Received SIGINT, shutting down gracefully...');
      await this.ssjInfinity.notifySleepMode();
      await this.client.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      this.logger.info('🛑 Received SIGTERM, shutting down gracefully...');
      await this.ssjInfinity.notifySleepMode();
      await this.client.destroy();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      this.logger.error('💥 Uncaught Exception:', error);
      await this.ssjInfinity.notifySleepMode();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      this.logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.ssjInfinity.notifySleepMode();
      process.exit(1);
    });
  }
}

// Start the bot
const bot = new GunnchAI3k();
bot.start().catch(console.error);
