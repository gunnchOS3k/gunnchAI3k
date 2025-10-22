// Test if gunnchAI3k can start properly
require('dotenv/config');
console.log('🚀 Testing gunnchAI3k startup...');

// Check if environment variables are set
const requiredEnvVars = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.log('Please set these in your .env file:');
  missingVars.forEach(varName => {
    console.log(`  ${varName}=your_value_here`);
  });
  process.exit(1);
}

console.log('✅ All required environment variables are set');
console.log('🔑 DISCORD_BOT_TOKEN:', process.env.DISCORD_BOT_TOKEN ? 'SET' : 'NOT SET');
console.log('🔑 DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('🔑 DISCORD_GUILD_ID:', process.env.DISCORD_GUILD_ID ? 'SET' : 'NOT SET');

// Test Discord.js import
try {
  const { Client, GatewayIntentBits } = require('discord.js');
  console.log('✅ Discord.js imported successfully');
  
  // Test creating a client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates
    ]
  });
  console.log('✅ Discord client created successfully');
  
} catch (error) {
  console.error('❌ Discord.js import failed:', error.message);
  process.exit(1);
}

console.log('🎉 gunnchAI3k is ready to start!');
console.log('💡 Run: npm run dev');
