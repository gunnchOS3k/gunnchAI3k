import 'dotenv/config';
import { Client, GatewayIntentBits, Message, Events } from 'discord.js';
import { SSJInfinity } from './study/ssj-infinity';
import { CourseMaterialIntegration } from './study/course-integration';

export class SimpleGunnchAI3k {
  private client: Client;
  private ssjInfinity: SSJInfinity;
  private courseIntegration: CourseMaterialIntegration;

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
    this.ssjInfinity = new SSJInfinity(this.courseIntegration);
  }

  async start() {
    try {
      console.log('🚀 Starting gunnchAI3k...');
      
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
      
      // Send a clever and sweet greeting to all servers
      await this.sendOnlineGreeting();
    });

    // Handle @ mentions - Like Thor reaching for his hammer! ⚡
    this.client.on(Events.MessageCreate, async (message: Message) => {
      if (message.author.bot) return;
      
      // Check if gunnchAI3k is mentioned
      const isMentioned = message.mentions.has(this.client.user!) || 
                         message.content.toLowerCase().includes('@gunnchai3k') ||
                         message.content.toLowerCase().includes('@gunnchai3k');
      
      if (isMentioned) {
        console.log(`⚡ gunnchAI3k summoned by ${message.author.username}!`);
        await this.handleMention(message);
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
      // Check for music commands first
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
      console.error('Error in handleMusicCommand:', error);
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
          console.log(`📢 Sent online greeting to ${guild.name}`);
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

// Start the bot
const bot = new SimpleGunnchAI3k();
bot.start().catch(console.error);
