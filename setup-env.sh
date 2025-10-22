#!/bin/bash

echo "🚀 Setting up gunnchAI3k environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# gunnchAI3k Environment Variables
# Fill in your actual Discord bot values

# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_discord_guild_id_here

# Optional: Additional Configuration
NODE_ENV=development
LOG_LEVEL=info
EOF
    echo "✅ .env file created!"
    echo ""
    echo "🔧 Please edit .env and add your Discord bot credentials:"
    echo "   1. DISCORD_BOT_TOKEN - Your bot token from Discord Developer Portal"
    echo "   2. DISCORD_CLIENT_ID - Your bot's client ID"
    echo "   3. DISCORD_GUILD_ID - Your server ID (optional)"
    echo ""
    echo "📖 How to get these values:"
    echo "   1. Go to https://discord.com/developers/applications"
    echo "   2. Create a new application or select existing one"
    echo "   3. Go to 'Bot' section for DISCORD_BOT_TOKEN"
    echo "   4. Go to 'General Information' for DISCORD_CLIENT_ID"
    echo "   5. Right-click your server name for DISCORD_GUILD_ID"
    echo ""
else
    echo "✅ .env file already exists!"
fi

echo "🎉 Setup complete! Run 'npm run dev' to start gunnchAI3k"
