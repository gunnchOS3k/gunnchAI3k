# 🍎 Your Personal Apple Music Setup Guide

## 🎵 **Setting Up Apple Music for YOUR Discord Server**

This is your personal guide to get Apple Music working on your Discord server.

---

## 🚀 **Quick Start (5 Minutes)**

### **Step 1: Get Your Apple Developer Account**
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Sign in with your Apple ID
3. **Enroll in Apple Developer Program** ($99/year)
4. Wait for approval (usually instant)

### **Step 2: Create Your MusicKit App**
1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources)
2. Click **"Identifiers"** → **"+"** → **"App IDs"**
3. Choose **"App"** → Continue
4. **Description:** `gunnchAI3k Discord Bot`
5. **Bundle ID:** `com.gunnchos.gunnchai3k`
6. **IMPORTANT:** Check **"MusicKit"** capability
7. Click **"Continue"** → **"Register"**

### **Step 3: Create Your MusicKit Key**
1. Go to **"Keys"** → **"+"** → **"MusicKit"**
2. **Key Name:** `gunnchAI3k MusicKit Key`
3. Click **"Continue"** → **"Register"**
4. **DOWNLOAD THE .p8 FILE** (you can only download it once!)

### **Step 4: Get Your Credentials**
After creating the MusicKit key, you'll have:
- **Team ID:** Found in your Apple Developer account (10-character string like `ABC123DEF4`)
- **Key ID:** From the MusicKit key you created (10-character string like `XYZ789GHI0`)
- **Private Key:** The .p8 file you downloaded

### **Step 5: Update Your .env File**
Add these lines to your `.env` file:

```env
# Apple Music Configuration
APPLE_MUSIC_TEAM_ID=your_team_id_here
APPLE_MUSIC_KEY_ID=your_key_id_here
APPLE_MUSIC_PRIVATE_KEY=your_private_key_content_here

# Discord Server Configuration (make sure this is YOUR server)
OWNER_SERVER_ID=1119858761323003975
DISCORD_GUILD_ID=1119858761323003975
```

### **Step 6: Format Your Private Key**
The .p8 file needs to be converted to a single-line string:

```bash
# Convert the .p8 file to a single-line string
cat AuthKey_XXXXXXXXXX.p8 | tr '\n' '\\n'
```

Then add it to your `.env` file like this:
```env
APPLE_MUSIC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----"
```

---

## 🎵 **Test Your Setup**

### **Test Commands:**

1. **Check Music Service Status:**
   ```
   @gunnchAI3k music status
   ```
   **Expected:** "🍎 Apple Music configured and ready!"

2. **Play a Song:**
   ```
   @gunnchAI3k play meet me there by lucki
   ```
   **Expected:** "🍎 Apple Music Playing: Meet Me There by Lucki"

3. **Search Apple Music:**
   ```
   @gunnchAI3k play juice wrld bandit
   ```
   **Expected:** High-quality Apple Music response

---

## 🔧 **Troubleshooting**

### **If you see "Apple Music not configured":**
1. Check your `.env` file has all the variables
2. Make sure the private key is formatted correctly
3. Verify Team ID and Key ID are correct
4. Restart the bot: `pkill -f "tsx src/simple-bot.ts" && npx tsx src/simple-bot.ts`

### **If you see "No results found":**
1. Apple Music API might be rate-limited
2. Check your Apple Developer account status
3. Verify MusicKit capability is enabled
4. Try a different song

### **If you see "Service not available":**
1. Check your internet connection
2. Verify Apple Music API is accessible
3. Check Discord bot permissions

---

## 🎯 **What You'll Get**

### **With Apple Music Configured:**
- ✅ **High-quality audio** - Better than YouTube
- ✅ **Official tracks** - Access to Apple Music catalog
- ✅ **Premium experience** - Professional music integration
- ✅ **Smart service selection** - Automatically uses Apple Music
- ✅ **Playlist creation** - Create and manage playlists

### **For Public GitHub Users:**
- ✅ **YouTube fallback** - Free music streaming
- ✅ **Wide selection** - Access to YouTube's music library
- ✅ **No setup required** - Works out of the box
- ✅ **Always available** - Reliable music service

---

## 🎉 **Success Indicators**

You'll know it's working when you see:
- "🍎 Apple Music integration configured successfully!"
- "High-quality audio from Apple Music! 🍎✨"
- Apple Music as the preferred service in status
- Professional music integration responses

---

## 📞 **Need Help?**

If you run into issues:
1. **Check the logs** for error messages
2. **Verify environment variables** are set correctly
3. **Test with YouTube first** to ensure basic functionality
4. **Check Apple Developer account** status

---

## 🎵 **Ready to Rock!**

Once configured, your gunnchAI3k will:
- **Prioritize Apple Music** for your Discord server
- **Provide high-quality audio** streaming
- **Access official tracks** from Apple Music
- **Create professional playlists**
- **Fall back to YouTube** if needed

**Your gunnchAI3k is now ready for premium music!** 🍎✨

---

## 🚀 **Next Steps**

1. **Set up Apple Developer account** ($99/year)
2. **Create MusicKit app** (5 minutes)
3. **Get your credentials** (Team ID, Key ID, .p8 file)
4. **Update your .env file** with the credentials
5. **Test with @gunnchAI3k play meet me there by lucki**
6. **Enjoy high-quality music!** 🎵

**Let's get your Apple Music integration working!** 🍎🎶
