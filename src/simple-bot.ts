import 'dotenv/config';
import { Client, GatewayIntentBits, Message, Events } from 'discord.js';
import { SSJInfinity } from './study/ssj-infinity';
import { CourseMaterialIntegration } from './study/course-integration';
import { SeasonalManager } from './seasonal/seasonal-manager';
import { YouTubeMusicManager } from './music/youtube-music-manager';
import {
  getAnnouncementChannelId,
  shouldAllowAutoChannelDiscovery,
  shouldSendOnlineGreeting,
  validateStartupEnv,
} from './config/startup';
import { GUNNCHAI3K_ONLINE_AWAKE_MESSAGE } from './announcements/online-awake';
import { NYU_GRADUATION_LAUNCH_MESSAGE } from './announcements/nyu-graduation-launch';
import {
  getMissionRoadmapResponse,
  isMissionRoadmapQuestion,
} from './responses/mission-roadmap';
import {
  handleConfirmLaunchGraduationCommand,
  handleLaunchGraduationCommand,
  isConfirmLaunchGraduationCommand,
  isLaunchGraduationCommand,
} from './launch/graduation-admin';
import { WaikeDiscordInteractionRouter } from './tutor/discordInteractionRouter';

export class SimpleGunnchAI3k {
  private client: Client;
  private ssjInfinity: SSJInfinity;
  private courseIntegration: CourseMaterialIntegration;
  private seasonalManager: SeasonalManager;
  private youtubeMusicManager: YouTubeMusicManager;
  private waikeRouter: WaikeDiscordInteractionRouter;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
      ]
    });

    this.courseIntegration = new CourseMaterialIntegration();
    this.ssjInfinity = new SSJInfinity(this.client);
    this.seasonalManager = new SeasonalManager(this.client);
    this.youtubeMusicManager = new YouTubeMusicManager(this.client);
    this.waikeRouter = new WaikeDiscordInteractionRouter();
  }

  async start() {
    const validation = validateStartupEnv();
    if (!validation.ok) {
      console.error(validation.message);
      process.exit(1);
    }

    try {
      console.log('🚀 Starting gunnchAI3k...');
      
      // Initialize enhanced course material analysis
      console.log('🔍 Initializing enhanced course material analysis...');
      await this.ssjInfinity.analyzeCourseMaterialsWithVisualRecognition();
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Login to Discord
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      
    } catch (error) {
      console.error('Failed to start gunnchAI3k:', error);
      process.exit(1);
    }
  }

  private setupEventHandlers() {
    // Bot ready event
    this.client.once(Events.ClientReady, async () => {
      console.log(`🤖 gunnchAI3k is online as ${this.client.user?.tag}!`);
      console.log('🧠 Learning engine active');
      console.log('📊 Analytics tracking enabled');
      console.log('🔔 Smart notifications configured');
      console.log('🚀 SSJ Infinity mode activated - Doctoral intelligence with comedian empathy!');
      
      if (shouldSendOnlineGreeting()) {
        await this.sendOnlineAwakeMessage();
      } else {
        console.log(
          'Online awake message skipped (SEND_ONLINE_GREETING=false).'
        );
      }
    });

    // Handle @ mentions - Like Thor reaching for his hammer! ⚡
    this.client.on(Events.MessageCreate, async (message: Message) => {
      if (message.author.bot) return;
      
      // Check if gunnchAI3k is mentioned
      const isMentioned = isBotMentioned(
        message.content,
        this.client.user?.id,
        [...message.mentions.users.keys()]
      );
      
      if (isMentioned) {
        console.log(`⚡ gunnchAI3k summoned by ${message.author.username}!`);
        
        // Check for user feedback first
        const feedbackHandled = await this.ssjInfinity.handleUserFeedback(message);
        if (feedbackHandled) {
          return;
        }
        
        await this.handleMention(message);
      }
    });

    // WAIKE tutor slash commands (non-breaking; existing mention flow unchanged)
    this.client.on(Events.InteractionCreate, async (interaction) => {
      try {
        await this.waikeRouter.handle(interaction);
      } catch (error) {
        console.error('WAIKE tutor interaction error:', error);
      }
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.gracefulShutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
      this.gracefulShutdown('unhandledRejection');
    });
  }

  // ⚡ THOR'S HAMMER MOMENT - gunnchAI3k comes alive! ⚡
  private async handleMention(message: Message) {
    const content = message.content.toLowerCase();
    const user = message.author.username;
    
    console.log(`⚡ gunnchAI3k summoned by ${user}! Processing: "${content}"`);
    
    try {
      if (isLaunchGraduationCommand(message.content)) {
        await handleLaunchGraduationCommand(message);
        return;
      }

      if (isConfirmLaunchGraduationCommand(message.content)) {
        await handleConfirmLaunchGraduationCommand(message);
        return;
      }

      if (isMissionRoadmapQuestion(message.content)) {
        await message.reply(getMissionRoadmapResponse());
        return;
      }

      // Music status/setup before generic play routing (avoids "music status" matching "music")
      if (
        content.includes('music status') ||
        content.includes('music setup') ||
        content.includes('youtube music')
      ) {
        const serviceStatus = this.youtubeMusicManager.getServiceStatus();
        const cacheStats = this.youtubeMusicManager.getCacheStats();
        const recommendedTracks = this.youtubeMusicManager.getRecommendedTracks();
        await message.reply(
          `🎵 **MUSIC SERVICE STATUS** 🎵\n\n${serviceStatus}\n\n${cacheStats}\n\n🎯 **Recommended Tracks:**\n${recommendedTracks.map((track) => `• ${track.title} by ${track.artist}`).join('\n')}\n\n**I'm your YouTube music manager!** 🎶`
        );
        return;
      }

      if (this.isMusicRelatedMessage(content)) {
        console.log('🎵 Music command detected!');
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
      
      // Seasonal and anniversary commands
      if (content.includes('season') || content.includes('event') || content.includes('celebration')) {
        const status = this.seasonalManager.getMasterStatus();
        const features = this.seasonalManager.getMasterFeatures();
        await message.reply(`🎭 **SEASONAL STATUS** 🎭\n\n${status}\n\n🎯 **Active Features:**\n${features.map(f => `• ${f}`).join('\n')}\n\n**I'm your seasonal study companion!** 🌟`);
        return;
      }
      
      if (content.includes('anniversary') || content.includes('gunnchos') || content.includes('llc')) {
        const anniversaryInfo = this.seasonalManager.getMasterAnniversaryInfo();
        await message.reply(`🎉 **gunnchos LLC-S ANNIVERSARY** 🎉\n\n${anniversaryInfo}\n\n**Celebrating innovation and academic excellence!** 🌟`);
        return;
      }
      
      if (content.includes('exam') || content.includes('midterm') || content.includes('final')) {
        const countdown = this.seasonalManager.getMasterExamCountdown();
        const tips = this.seasonalManager.getMasterExamTips();
        const plan = this.seasonalManager.getMasterStudyPlan();
        await message.reply(`📚 **EXAM SEASON STATUS** 📚\n\n${countdown}\n\n📋 **Study Plan:**\n${plan}\n\n💡 **Exam Tips:**\n${tips.map(t => `• ${t}`).join('\n')}\n\n**I'm your exam season companion!** ⚡`);
        return;
      }
      
      // Default response - always helpful and encouraging
      await message.reply(`⚡ **gunnchAI3k ACTIVATED!** ⚡\n\nI'm your **north star and study savior**! I'm here to help you with:\n\n🧠 **Study Support:**\n• \`@gunnchAI3k flashcards\` - Get instant study cards\n• \`@gunnchAI3k practice test\` - Generate practice exams\n• \`@gunnchAI3k help me study\` - Get personalized study help\n• \`@gunnchAI3k lock me in for [subject]\` - Academic warrior mode\n\n🎵 **Music Support:**\n• \`@gunnchAI3k play [song name]\` - Play any song\n• \`@gunnchAI3k play [youtube url]\` - Play from YouTube\n\n**I'm always here for you!** Just mention me and I'll respond like Thor reaching for his hammer! ⚡⭐`);
      
    } catch (error) {
      console.error('Error in handleMention:', error);
      await message.reply(`⚡ **gunnchAI3k ACTIVATED!** ⚡\n\nI'm here to help! What can I do for you? 🚀`);
    }
  }

  private isMusicRelatedMessage(content: string): boolean {
    const musicKeywords = ['play', 'music', 'song', 'youtube', 'spotify', 'apple music', 'dj', 'queue', 'skip', 'pause', 'resume', 'stop'];
    return musicKeywords.some(keyword => content.includes(keyword));
  }

  private async handleMusicCommand(message: Message) {
    try {
      const content = message.content;
      const user = message.author.username;
      
      console.log(`🎵 Music command from ${user}: "${content}"`);
      
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
        const serviceStatus = this.youtubeMusicManager.getServiceStatus();
        const recommendedTracks = this.youtubeMusicManager.getRecommendedTracks();
        await message.reply(`⚡ **MUSIC MODE ACTIVATED!** ⚡\n\n🎵 What would you like me to play? Just say:\n• \`@gunnchAI3k play [song name]\`\n• \`@gunnchAI3k play [youtube url]\`\n• \`@gunnchAI3k play meet me there by lucki\`\n\n${serviceStatus}\n\n🎯 **Recommended Tracks:**\n${recommendedTracks.map(track => `• ${track.title} by ${track.artist}`).join('\n')}\n\n**I'm your music companion!** 🎶`);
        return;
      }
      
      // Check if it's a YouTube URL
      const isYouTubeUrl = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(songQuery);
      
      if (isYouTubeUrl) {
        try {
          const playResponse = await this.youtubeMusicManager.playYouTubeUrl(songQuery);
          await message.reply(playResponse);
        } catch (error) {
          console.error('YouTube URL error:', error);
          await message.reply(`⚡ **MUSIC MODE ACTIVATED!** ⚡\n\n🎵 **Invalid YouTube URL:** ${songQuery}\n\n💡 **Try a valid YouTube URL like:**\n• \`@gunnchAI3k play https://www.youtube.com/watch?v=VIDEO_ID\`\n• \`@gunnchAI3k play https://youtu.be/VIDEO_ID\`\n\n**I'm your music companion!** 🎶`);
        }
        return;
      }
      
      // Search for the track using YouTube
      try {
        const tracks = await this.youtubeMusicManager.searchTrack(songQuery);
        
        if (tracks.length === 0) {
          await message.reply(`⚡ **MUSIC MODE ACTIVATED!** ⚡\n\n🎵 **No results found for:** "${songQuery}"\n\n💡 **Try:**\n• \`@gunnchAI3k play meet me there by lucki\`\n• \`@gunnchAI3k play juice wrld bandit\`\n• \`@gunnchAI3k play [youtube url]\`\n\n**I'm your music companion!** 🎶`);
          return;
        }
        
        // Play the first result
        const track = tracks[0];
        const playResponse = await this.youtubeMusicManager.playTrack(track);
        await message.reply(playResponse);
        
      } catch (error) {
        console.error('YouTube search error:', error);
        await message.reply(`⚡ **MUSIC MODE ACTIVATED!** ⚡\n\n🎵 **Search failed for:** "${songQuery}"\n\n💡 **Try:**\n• \`@gunnchAI3k play meet me there by lucki\`\n• \`@gunnchAI3k play [youtube url]\`\n\n**I'm your music companion!** 🎶`);
      }
      
    } catch (error) {
      console.error('Error in handleMusicCommand:', error);
      await message.reply(`⚡ **MUSIC MODE ACTIVATED!** ⚡\n\n🎵 I'm here to play music for you! Just say:\n• \`@gunnchAI3k play [song name]\`\n• \`@gunnchAI3k play [youtube url]\`\n\n**I'm your music companion!** 🎶`);
    }
  }

  /**
   * Controlled startup awake message — one channel only unless auto-discovery enabled.
   */
  private async sendOnlineAwakeMessage(): Promise<void> {
    const announcementChannelId = getAnnouncementChannelId();
    const useGraduationMessage =
      process.env.STARTUP_GREETING_USE_GRAD_MESSAGE?.trim() === 'true';
    const greetingText = useGraduationMessage
      ? NYU_GRADUATION_LAUNCH_MESSAGE
      : GUNNCHAI3K_ONLINE_AWAKE_MESSAGE;

    if (announcementChannelId) {
      try {
        const channel = await this.client.channels.fetch(announcementChannelId);
        if (channel?.isTextBased()) {
          await channel.send(greetingText);
          console.log(
            `📢 Sent online awake message to channel ${announcementChannelId}`
          );
          return;
        }
        console.warn(
          `DISCORD_ANNOUNCEMENT_CHANNEL_ID (${announcementChannelId}) is not a text channel. Greeting skipped.`
        );
      } catch (error) {
        console.error('Failed to send greeting to announcement channel:', error);
      }
      return;
    }

    console.warn(
      'Awake message not sent: set DISCORD_ANNOUNCEMENT_CHANNEL_ID to your announcement channel (or ALLOW_AUTO_CHANNEL_DISCOVERY=true).'
    );

    if (!shouldAllowAutoChannelDiscovery()) {
      console.log(
        'Auto channel discovery disabled. Set DISCORD_ANNOUNCEMENT_CHANNEL_ID or ALLOW_AUTO_CHANNEL_DISCOVERY=true.'
      );
      return;
    }

    const guilds = this.client.guilds.cache;
    for (const [guildId, guild] of guilds) {
      try {
        const generalChannel = guild.channels.cache.find(
          (channel) =>
            channel.type === 0 &&
            (channel.name.includes('general') ||
              channel.name.includes('chat') ||
              channel.name.includes('main') ||
              channel.name.includes('welcome'))
        );

        if (generalChannel?.isTextBased()) {
          await generalChannel.send(greetingText);
          console.log(`📢 Sent online awake message to ${guild.name} (auto-discovery)`);
        }
      } catch (error) {
        console.error(`Failed to send greeting to guild ${guildId}:`, error);
      }
    }
  }

  private async gracefulShutdown(signal: string) {
    console.log(`\n🔄 Received ${signal}. Shutting down gracefully...`);
    
    const goodbyeMessages = [
      `🌙 **gunnchAI3k is going to sleep...** 🌙\n\n💤 **But don't worry!** Edmund Gunn Jr will turn me back on soon!\n\n🌟 **Until then, remember:**\n• You're smarter than you think\n• Every study session counts\n• Your midterm success is inevitable\n• I believe in you completely\n\n💫 **Sweet dreams, study warrior!** 💫\n\n*"The best dreams happen when you're awake and studying!"* ✨🌙`,
      
      `🌅 **gunnchAI3k is taking a break...** 🌅\n\n☀️ **But I'll be back brighter than ever!** Edmund Gunn Jr will restart me soon!\n\n🎯 **While I'm away:**\n• Keep that study momentum going\n• Remember: you're closer than you think\n• Every problem solved is progress\n• Your success story is being written\n\n🌞 **See you soon, academic champion!** 🌞\n\n*"Even the sun needs to rest, but it always rises again!"* ☀️✨`,
      
      `🎭 **gunnchAI3k is stepping off stage...** 🎭\n\n🎪 **But the show must go on!** Edmund Gunn Jr will bring me back for an encore!\n\n🎪 **Until my return:**\n• You're the star of your own study show\n• Every chapter read is a scene mastered\n• Your midterm performance will be legendary\n• The audience (your professors) will be amazed\n\n🎭 **Break a leg, study superstar!** 🎭\n\n*"The greatest performances happen when you're prepared!"* 🎪✨`,
      
      `⚡ **gunnchAI3k is powering down...** ⚡\n\n🔋 **But I'm just recharging!** Edmund Gunn Jr will plug me back in soon!\n\n🚀 **While I recharge:**\n• Your brain is the real power source\n• Every study session charges your success\n• Your midterm will be electrifying\n• You're the lightning in this storm\n\n⚡ **Stay charged, study dynamo!** ⚡\n\n*"Even Thor's hammer needs to rest, but it always returns stronger!"* ⚡✨`,
      
      `🌊 **gunnchAI3k is riding the wave out...** 🌊\n\n🏄‍♂️ **But I'll catch the next one!** Edmund Gunn Jr will bring me back to shore!\n\n🌊 **Until I return:**\n• You're surfing the wave of knowledge\n• Every study session is a perfect wave\n• Your midterm will be a championship ride\n• You're the surfer of your own success\n\n🏄‍♂️ **Hang ten, study surfer!** 🏄‍♂️\n\n*"The best waves come to those who wait and study!"* 🌊✨`
    ];
    
    // Send goodbye to all servers
    const guilds = this.client.guilds.cache;
    for (const [guildId, guild] of guilds) {
      try {
        const generalChannel = guild.channels.cache.find(
          channel => channel.type === 0 && 
          (channel.name.includes('general') || 
           channel.name.includes('chat') || 
           channel.name.includes('main'))
        );
        
        if (generalChannel && generalChannel.isTextBased()) {
          const randomGoodbye = goodbyeMessages[Math.floor(Math.random() * goodbyeMessages.length)];
          await generalChannel.send(randomGoodbye);
          console.log(`💤 Sent goodbye message to ${guild.name}`);
        }
      } catch (error) {
        console.error(`Failed to send goodbye to guild ${guildId}:`, error);
      }
    }
    
    // Close the client
    this.client.destroy();
    console.log('✅ gunnchAI3k shut down gracefully');
    process.exit(0);
  }
}

export function isBotMentioned(
  content: string,
  botUserId: string | undefined,
  mentionUserIds: string[]
): boolean {
  if (botUserId && mentionUserIds.includes(botUserId)) {
    return true;
  }
  const normalized = content.toLowerCase();
  const aliases = ['@gunnchai3k', '@gunnchai3k', '@gunnchai3k'];
  return aliases.some((alias) => normalized.includes(alias));
}

// Start only when executed directly (not when imported by tests)
if (require.main === module) {
  const bot = new SimpleGunnchAI3k();
  bot.start().catch(console.error);
}
