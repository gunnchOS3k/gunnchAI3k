# 🚀 gunnchAI3k Setup Guide

## 📋 **Prerequisites**

- Node.js 18+ installed
- Discord account and server
- GitHub account
- Git installed

## 🎯 **Quick Setup (5 minutes)**

### **Step 1: Create GitHub Repository**

1. **Go to**: [GitHub](https://github.com/new)
2. **Repository name**: `gunnchAI3k`
3. **Description**: `Smart Gunncho Enabled Bot - AI-Powered Executive Assistant`
4. **Visibility**: Public
5. **Initialize**: Don't initialize with README (we have one)
6. **Click**: "Create repository"

### **Step 2: Push Your Code**

```bash
# In your gunnchAI3k directory
git remote add origin https://github.com/gunnchOS3k/gunnchAI3k.git
git push -u origin main
```

### **Step 3: Discord Bot Setup**

1. **Go to**: [Discord Developer Portal](https://discord.com/developers/applications)
2. **Click**: "New Application"
3. **Name**: "gunnchAI3k"
4. **Go to**: "Bot" section → "Add Bot"
5. **Copy**: Bot Token
6. **Go to**: "General Information" → Copy Application ID
7. **Go to**: "OAuth2" → "URL Generator"
8. **Select scopes**: `bot`, `applications.commands`
9. **Select permissions**:
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Use Slash Commands
10. **Copy URL** → Open in browser → Select your server

### **Step 4: Configure Environment**

```bash
# Copy environment template
cp env.example .env

# Edit .env with your values
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_GUILD_ID=your_server_id_here
```

### **Step 5: Install and Run**

```bash
# Install dependencies
npm install

# Build the bot
npm run build

# Start the bot
npm start
```

## 🧠 **AI Learning Features**

### **Teaching the Bot**
- Use `/learn` to teach from your decisions
- The bot learns patterns and improves over time
- Analyzes your success/failure patterns

### **Smart Suggestions**
- `/suggest` for AI-powered recommendations
- `/analyze` for strategic analysis
- `/pattern` to see learned patterns

### **Risk Management**
- `/risk` to assess potential risks
- `/optimize` for efficiency suggestions
- `/predict` for outcome forecasting

## 📊 **Project Management**

### **Task Management**
- `/assign` to create and assign tasks
- `/update` to report progress
- `/track` to monitor metrics

### **Communication**
- `/meeting` to schedule meetings
- `/announce` to share information
- `/focus` to control notifications

## 🔧 **Advanced Configuration**

### **GitHub Integration**
```bash
# Add to .env
GITHUB_TOKEN=your_github_token_here
```

### **AI Enhancement**
```bash
# Add to .env
OPENAI_API_KEY=your_openai_api_key_here
```

### **Database Configuration**
```bash
# Add to .env
DATABASE_PATH=./data/gunnchai3k.db
```

## 🚀 **Deployment Options**

### **Option 1: Railway (Recommended)**
1. Go to [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add environment variables
4. Deploy automatically

### **Option 2: Heroku**
1. Install Heroku CLI
2. Create Heroku app
3. Set environment variables
4. Deploy with Git

### **Option 3: DigitalOcean**
1. Create Droplet
2. Install Node.js
3. Clone repository
4. Set up PM2 for process management

## 📱 **Usage Examples**

### **Learning from Decisions**
```
/learn decision:"Hired a new developer" outcome:"Great addition to team" context:"Technical skills matched our needs"
```

### **Getting Suggestions**
```
/suggest situation:"Need to choose between two marketing strategies"
```

### **Risk Assessment**
```
/risk project:"New product launch"
```

### **Pattern Analysis**
```
/pattern type:"decisions"
```

## 🔔 **Smart Notifications**

### **Focus Mode**
- `/focus true` - Minimize notifications
- `/focus false` - Enable all notifications
- Urgent notifications always get through

### **Learning Updates**
- Bot learns from your decisions
- Sends insights about patterns
- Alerts about risks and opportunities

## 🛠️ **Development**

### **Local Development**
```bash
npm run dev          # Start with hot reload
npm run test         # Run tests
npm run lint         # Check code quality
npm run build        # Build for production
```

### **Adding New Features**
1. Create feature branch
2. Implement functionality
3. Add tests
4. Submit pull request

## 📈 **Analytics & Insights**

### **Performance Metrics**
- Decision accuracy over time
- Learning curve progression
- Success rate improvements
- Risk mitigation effectiveness

### **Strategic Reports**
- Weekly performance summaries
- Monthly strategic insights
- Quarterly learning reports
- Annual optimization recommendations

## 🆘 **Troubleshooting**

### **Bot Not Responding**
- Check if bot is online
- Verify permissions in Discord
- Check logs for errors

### **Commands Not Working**
- Wait a few minutes for Discord sync
- Restart the bot
- Check slash command registration

### **Learning Not Working**
- Ensure database is accessible
- Check learning configuration
- Verify decision data format

## 🎯 **Next Steps**

1. **Teach the bot** with `/learn` commands
2. **Set up integrations** with GitHub/Cursor
3. **Configure notifications** for your workflow
4. **Deploy to production** for 24/7 operation
5. **Monitor and optimize** based on insights

---

**Ready to empower your decision-making with AI? Let's get started!** 🚀
