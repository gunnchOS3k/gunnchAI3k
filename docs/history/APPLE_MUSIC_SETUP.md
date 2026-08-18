# 🍎 Apple Music Integration Setup Guide

## 🎵 **Setting Up Apple Music for gunnchAI3k**

This guide will walk you through setting up Apple Music integration for your Discord server.

---

## 📋 **Prerequisites**

### 1. **Apple Developer Account**
- Go to [Apple Developer Portal](https://developer.apple.com)
- Sign in with your Apple ID
- Enroll in the Apple Developer Program ($99/year)
- This is required for MusicKit API access

### 2. **Discord Server Setup**
- You need to be the owner of the Discord server
- Server ID must be set in environment variables

---

## 🔧 **Step-by-Step Setup**

### **Step 1: Create MusicKit App**

1. **Go to Apple Developer Portal**
   - Navigate to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources)
   - Sign in with your Apple ID

2. **Create App ID**
   - Click "Identifiers" → "+" → "App IDs"
   - Choose "App" → Continue
   - Description: "gunnchAI3k Discord Bot"
   - Bundle ID: `com.gunnchos.gunnchai3k` (or your own)
   - **IMPORTANT:** Check "MusicKit" capability
   - Click "Continue" → "Register"

3. **Create MusicKit Key**
   - Go to "Keys" → "+" → "MusicKit"
   - Key Name: "gunnchAI3k MusicKit Key"
   - Click "Continue" → "Register"
   - **DOWNLOAD THE .p8 FILE** (you can only download it once!)

### **Step 2: Get Your Credentials**

After creating the MusicKit key, you'll have:

- **Team ID:** Found in your Apple Developer account (10-character string)
- **Key ID:** From the MusicKit key you created (10-character string)
- **Private Key:** The .p8 file you downloaded

### **Step 3: Set Environment Variables**

Add these to your `.env` file:

```env
# Apple Music Configuration
APPLE_MUSIC_TEAM_ID=your_team_id_here
APPLE_MUSIC_KEY_ID=your_key_id_here
APPLE_MUSIC_PRIVATE_KEY=your_private_key_content_here
APPLE_MUSIC_USER_TOKEN=optional_user_token

# Discord Server Configuration
OWNER_SERVER_ID=your_discord_server_id_here
DISCORD_GUILD_ID=your_discord_server_id_here
```

### **Step 4: Private Key Setup**

The private key from the .p8 file needs to be formatted correctly:

```bash
# Convert the .p8 file to a single-line string
cat AuthKey_XXXXXXXXXX.p8 | tr '\n' '\\n'
```

Then add it to your `.env` file:
```env
APPLE_MUSIC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----"
```

---

## 🎵 **Testing the Integration**

### **Test Commands:**

1. **Check Music Service Status:**
   ```
   @gunnchAI3k music status
   ```

2. **Play a Song:**
   ```
   @gunnchAI3k play meet me there by lucki
   ```

3. **Search Apple Music:**
   ```
   @gunnchAI3k play juice wrld bandit
   ```

### **Expected Responses:**

- **Apple Music Available:** "🍎 Apple Music configured and ready!"
- **High-Quality Audio:** "High-quality audio from Apple Music! 🍎✨"
- **Service Status:** Shows Apple Music as preferred service

---

## 🔄 **How It Works**

### **For Your Discord Server:**
- **Apple Music Priority:** When Apple Music is configured, it becomes the primary service
- **High-Quality Audio:** Better sound quality than YouTube
- **Official Tracks:** Access to official Apple Music catalog
- **Premium Experience:** Professional music integration

### **For Public GitHub Version:**
- **YouTube Default:** Uses YouTube as the primary music source
- **Free Service:** No Apple Music setup required
- **Wide Selection:** Access to YouTube's vast music library
- **Easy Setup:** Works out of the box

---

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"Apple Music not configured"**
   - Check your environment variables
   - Verify the .p8 file is correctly formatted
   - Ensure Team ID and Key ID are correct

2. **"No results found"**
   - Apple Music API might be rate-limited
   - Check your Apple Developer account status
   - Verify MusicKit capability is enabled

3. **"Service not available"**
   - Check your internet connection
   - Verify Apple Music API is accessible
   - Check Discord bot permissions

### **Debug Commands:**

```bash
# Check environment variables
echo $APPLE_MUSIC_TEAM_ID
echo $APPLE_MUSIC_KEY_ID

# Test bot startup
npm run dev
```

---

## 🎯 **Features Available**

### **With Apple Music:**
- ✅ High-quality audio streaming
- ✅ Official track access
- ✅ Playlist creation
- ✅ Search functionality
- ✅ Premium music experience

### **With YouTube (Fallback):**
- ✅ Free music streaming
- ✅ Wide selection
- ✅ No setup required
- ✅ Always available

---

## 📞 **Support**

If you encounter issues:

1. **Check the logs** for error messages
2. **Verify environment variables** are set correctly
3. **Test with YouTube** first to ensure basic functionality
4. **Check Apple Developer account** status

---

## 🎉 **Success!**

Once configured, you'll see:
- "🍎 Apple Music integration configured successfully!"
- High-quality audio responses
- Apple Music as the preferred service
- Professional music integration

**Your gunnchAI3k is now ready for premium music!** 🍎✨
