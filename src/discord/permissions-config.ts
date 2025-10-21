/**
 * gunnchAI3k Discord Permissions Configuration
 * Enhanced permissions for optimal user experience
 */

import { PermissionsBitField, PermissionFlagsBits } from 'discord.js';

export interface BotPermissions {
  // Text Permissions
  sendMessages: boolean;
  sendMessagesInThreads: boolean;
  embedLinks: boolean;
  attachFiles: boolean;
  useExternalEmojis: boolean;
  useExternalStickers: boolean;
  addReactions: boolean;
  useSlashCommands: boolean;
  mentionEveryone: boolean;
  readMessageHistory: boolean;
  useApplicationCommands: boolean;
  
  // Voice Permissions
  connect: boolean;
  speak: boolean;
  useVAD: boolean;
  prioritySpeaker: boolean;
  stream: boolean;
  useEmbeddedActivities: boolean;
  
  // Channel Management
  manageChannels: boolean;
  manageRoles: boolean;
  manageWebhooks: boolean;
  manageThreads: boolean;
  
  // Server Management
  manageGuild: boolean;
  manageEmojisAndStickers: boolean;
  manageEvents: boolean;
  moderateMembers: boolean;
  
  // Advanced Features
  administrator: boolean;
  viewAuditLog: boolean;
  viewGuildInsights: boolean;
  changeNickname: boolean;
  manageNicknames: boolean;
  kickMembers: boolean;
  banMembers: boolean;
  timeoutMembers: boolean;
}

export class PermissionsConfig {
  private static readonly REQUIRED_PERMISSIONS: BotPermissions = {
    // Essential text permissions
    sendMessages: true,
    sendMessagesInThreads: true,
    embedLinks: true,
    attachFiles: true,
    useExternalEmojis: true,
    useExternalStickers: true,
    addReactions: true,
    useSlashCommands: true,
    mentionEveryone: false, // Only when necessary
    readMessageHistory: true,
    useApplicationCommands: true,
    
    // Essential voice permissions
    connect: true,
    speak: true,
    useVAD: true,
    prioritySpeaker: false, // Only when needed
    stream: true,
    useEmbeddedActivities: true,
    
    // Channel management (for DJ features)
    manageChannels: false, // Only for DJ sessions
    manageRoles: false, // Only for special features
    manageWebhooks: false, // Only for integrations
    manageThreads: true, // For study sessions
    
    // Server management (minimal)
    manageGuild: false, // Only for essential features
    manageEmojisAndStickers: false, // Only for custom reactions
    manageEvents: false, // Only for scheduled events
    moderateMembers: false, // Only for safety features
    
    // Advanced features (admin only)
    administrator: false, // Never required
    viewAuditLog: false, // Only for security features
    viewGuildInsights: false, // Only for analytics
    changeNickname: false, // Only for user preferences
    manageNicknames: false, // Only for moderation
    kickMembers: false, // Only for safety
    banMembers: false, // Only for safety
    timeoutMembers: false // Only for moderation
  };

  private static readonly OPTIONAL_PERMISSIONS: BotPermissions = {
    // Enhanced text permissions
    sendMessages: true,
    sendMessagesInThreads: true,
    embedLinks: true,
    attachFiles: true,
    useExternalEmojis: true,
    useExternalStickers: true,
    addReactions: true,
    useSlashCommands: true,
    mentionEveryone: true, // For important announcements
    readMessageHistory: true,
    useApplicationCommands: true,
    
    // Enhanced voice permissions
    connect: true,
    speak: true,
    useVAD: true,
    prioritySpeaker: true, // For DJ sessions
    stream: true,
    useEmbeddedActivities: true,
    
    // Channel management
    manageChannels: true, // For DJ session channels
    manageRoles: true, // For study groups
    manageWebhooks: true, // For integrations
    manageThreads: true, // For study sessions
    
    // Server management
    manageGuild: true, // For server customization
    manageEmojisAndStickers: true, // For custom reactions
    manageEvents: true, // For scheduled study sessions
    moderateMembers: true, // For safety features
    
    // Advanced features
    administrator: false, // Still not recommended
    viewAuditLog: true, // For security monitoring
    viewGuildInsights: true, // For analytics
    changeNickname: true, // For user preferences
    manageNicknames: true, // For moderation
    kickMembers: true, // For safety
    banMembers: true, // For safety
    timeoutMembers: true // For moderation
  };

  /**
   * Get required permissions for basic bot functionality
   */
  public static getRequiredPermissions(): PermissionsBitField {
    const permissions = new PermissionsBitField();
    
    // Essential text permissions
    if (this.REQUIRED_PERMISSIONS.sendMessages) permissions.add(PermissionFlagsBits.SendMessages);
    if (this.REQUIRED_PERMISSIONS.sendMessagesInThreads) permissions.add(PermissionFlagsBits.SendMessagesInThreads);
    if (this.REQUIRED_PERMISSIONS.embedLinks) permissions.add(PermissionFlagsBits.EmbedLinks);
    if (this.REQUIRED_PERMISSIONS.attachFiles) permissions.add(PermissionFlagsBits.AttachFiles);
    if (this.REQUIRED_PERMISSIONS.useExternalEmojis) permissions.add(PermissionFlagsBits.UseExternalEmojis);
    if (this.REQUIRED_PERMISSIONS.useExternalStickers) permissions.add(PermissionFlagsBits.UseExternalStickers);
    if (this.REQUIRED_PERMISSIONS.addReactions) permissions.add(PermissionFlagsBits.AddReactions);
    if (this.REQUIRED_PERMISSIONS.useSlashCommands) permissions.add(PermissionFlagsBits.UseSlashCommands);
    if (this.REQUIRED_PERMISSIONS.mentionEveryone) permissions.add(PermissionFlagsBits.MentionEveryone);
    if (this.REQUIRED_PERMISSIONS.readMessageHistory) permissions.add(PermissionFlagsBits.ReadMessageHistory);
    if (this.REQUIRED_PERMISSIONS.useApplicationCommands) permissions.add(PermissionFlagsBits.UseApplicationCommands);
    
    // Essential voice permissions
    if (this.REQUIRED_PERMISSIONS.connect) permissions.add(PermissionFlagsBits.Connect);
    if (this.REQUIRED_PERMISSIONS.speak) permissions.add(PermissionFlagsBits.Speak);
    if (this.REQUIRED_PERMISSIONS.useVAD) permissions.add(PermissionFlagsBits.UseVAD);
    if (this.REQUIRED_PERMISSIONS.prioritySpeaker) permissions.add(PermissionFlagsBits.PrioritySpeaker);
    if (this.REQUIRED_PERMISSIONS.stream) permissions.add(PermissionFlagsBits.Stream);
    if (this.REQUIRED_PERMISSIONS.useEmbeddedActivities) permissions.add(PermissionFlagsBits.UseEmbeddedActivities);
    
    // Channel management
    if (this.REQUIRED_PERMISSIONS.manageChannels) permissions.add(PermissionFlagsBits.ManageChannels);
    if (this.REQUIRED_PERMISSIONS.manageRoles) permissions.add(PermissionFlagsBits.ManageRoles);
    if (this.REQUIRED_PERMISSIONS.manageWebhooks) permissions.add(PermissionFlagsBits.ManageWebhooks);
    if (this.REQUIRED_PERMISSIONS.manageThreads) permissions.add(PermissionFlagsBits.ManageThreads);
    
    // Server management
    if (this.REQUIRED_PERMISSIONS.manageGuild) permissions.add(PermissionFlagsBits.ManageGuild);
    if (this.REQUIRED_PERMISSIONS.manageEmojisAndStickers) permissions.add(PermissionFlagsBits.ManageEmojisAndStickers);
    if (this.REQUIRED_PERMISSIONS.manageEvents) permissions.add(PermissionFlagsBits.ManageEvents);
    if (this.REQUIRED_PERMISSIONS.moderateMembers) permissions.add(PermissionFlagsBits.ModerateMembers);
    
    // Advanced features
    if (this.REQUIRED_PERMISSIONS.administrator) permissions.add(PermissionFlagsBits.Administrator);
    if (this.REQUIRED_PERMISSIONS.viewAuditLog) permissions.add(PermissionFlagsBits.ViewAuditLog);
    if (this.REQUIRED_PERMISSIONS.viewGuildInsights) permissions.add(PermissionFlagsBits.ViewGuildInsights);
    if (this.REQUIRED_PERMISSIONS.changeNickname) permissions.add(PermissionFlagsBits.ChangeNickname);
    if (this.REQUIRED_PERMISSIONS.manageNicknames) permissions.add(PermissionFlagsBits.ManageNicknames);
    if (this.REQUIRED_PERMISSIONS.kickMembers) permissions.add(PermissionFlagsBits.KickMembers);
    if (this.REQUIRED_PERMISSIONS.banMembers) permissions.add(PermissionFlagsBits.BanMembers);
    if (this.REQUIRED_PERMISSIONS.timeoutMembers) permissions.add(PermissionFlagsBits.ModerateMembers);
    
    return permissions;
  }

  /**
   * Get optional permissions for enhanced functionality
   */
  public static getOptionalPermissions(): PermissionsBitField {
    const permissions = new PermissionsBitField();
    
    // Enhanced text permissions
    if (this.OPTIONAL_PERMISSIONS.sendMessages) permissions.add(PermissionFlagsBits.SendMessages);
    if (this.OPTIONAL_PERMISSIONS.sendMessagesInThreads) permissions.add(PermissionFlagsBits.SendMessagesInThreads);
    if (this.OPTIONAL_PERMISSIONS.embedLinks) permissions.add(PermissionFlagsBits.EmbedLinks);
    if (this.OPTIONAL_PERMISSIONS.attachFiles) permissions.add(PermissionFlagsBits.AttachFiles);
    if (this.OPTIONAL_PERMISSIONS.useExternalEmojis) permissions.add(PermissionFlagsBits.UseExternalEmojis);
    if (this.OPTIONAL_PERMISSIONS.useExternalStickers) permissions.add(PermissionFlagsBits.UseExternalStickers);
    if (this.OPTIONAL_PERMISSIONS.addReactions) permissions.add(PermissionFlagsBits.AddReactions);
    if (this.OPTIONAL_PERMISSIONS.useSlashCommands) permissions.add(PermissionFlagsBits.UseSlashCommands);
    if (this.OPTIONAL_PERMISSIONS.mentionEveryone) permissions.add(PermissionFlagsBits.MentionEveryone);
    if (this.OPTIONAL_PERMISSIONS.readMessageHistory) permissions.add(PermissionFlagsBits.ReadMessageHistory);
    if (this.OPTIONAL_PERMISSIONS.useApplicationCommands) permissions.add(PermissionFlagsBits.UseApplicationCommands);
    
    // Enhanced voice permissions
    if (this.OPTIONAL_PERMISSIONS.connect) permissions.add(PermissionFlagsBits.Connect);
    if (this.OPTIONAL_PERMISSIONS.speak) permissions.add(PermissionFlagsBits.Speak);
    if (this.OPTIONAL_PERMISSIONS.useVAD) permissions.add(PermissionFlagsBits.UseVAD);
    if (this.OPTIONAL_PERMISSIONS.prioritySpeaker) permissions.add(PermissionFlagsBits.PrioritySpeaker);
    if (this.OPTIONAL_PERMISSIONS.stream) permissions.add(PermissionFlagsBits.Stream);
    if (this.OPTIONAL_PERMISSIONS.useEmbeddedActivities) permissions.add(PermissionFlagsBits.UseEmbeddedActivities);
    
    // Channel management
    if (this.OPTIONAL_PERMISSIONS.manageChannels) permissions.add(PermissionFlagsBits.ManageChannels);
    if (this.OPTIONAL_PERMISSIONS.manageRoles) permissions.add(PermissionFlagsBits.ManageRoles);
    if (this.OPTIONAL_PERMISSIONS.manageWebhooks) permissions.add(PermissionFlagsBits.ManageWebhooks);
    if (this.OPTIONAL_PERMISSIONS.manageThreads) permissions.add(PermissionFlagsBits.ManageThreads);
    
    // Server management
    if (this.OPTIONAL_PERMISSIONS.manageGuild) permissions.add(PermissionFlagsBits.ManageGuild);
    if (this.OPTIONAL_PERMISSIONS.manageEmojisAndStickers) permissions.add(PermissionFlagsBits.ManageEmojisAndStickers);
    if (this.OPTIONAL_PERMISSIONS.manageEvents) permissions.add(PermissionFlagsBits.ManageEvents);
    if (this.OPTIONAL_PERMISSIONS.moderateMembers) permissions.add(PermissionFlagsBits.ModerateMembers);
    
    // Advanced features
    if (this.OPTIONAL_PERMISSIONS.administrator) permissions.add(PermissionFlagsBits.Administrator);
    if (this.OPTIONAL_PERMISSIONS.viewAuditLog) permissions.add(PermissionFlagsBits.ViewAuditLog);
    if (this.OPTIONAL_PERMISSIONS.viewGuildInsights) permissions.add(PermissionFlagsBits.ViewGuildInsights);
    if (this.OPTIONAL_PERMISSIONS.changeNickname) permissions.add(PermissionFlagsBits.ChangeNickname);
    if (this.OPTIONAL_PERMISSIONS.manageNicknames) permissions.add(PermissionFlagsBits.ManageNicknames);
    if (this.OPTIONAL_PERMISSIONS.kickMembers) permissions.add(PermissionFlagsBits.KickMembers);
    if (this.OPTIONAL_PERMISSIONS.banMembers) permissions.add(PermissionFlagsBits.BanMembers);
    if (this.OPTIONAL_PERMISSIONS.timeoutMembers) permissions.add(PermissionFlagsBits.ModerateMembers);
    
    return permissions;
  }

  /**
   * Get permissions for specific features
   */
  public static getFeaturePermissions(feature: string): PermissionsBitField {
    const permissions = new PermissionsBitField();
    
    switch (feature) {
      case 'study':
        permissions.add(PermissionFlagsBits.SendMessages);
        permissions.add(PermissionFlagsBits.EmbedLinks);
        permissions.add(PermissionFlagsBits.AttachFiles);
        permissions.add(PermissionFlagsBits.AddReactions);
        permissions.add(PermissionFlagsBits.UseSlashCommands);
        permissions.add(PermissionFlagsBits.ReadMessageHistory);
        permissions.add(PermissionFlagsBits.UseApplicationCommands);
        break;
        
      case 'music':
        permissions.add(PermissionFlagsBits.SendMessages);
        permissions.add(PermissionFlagsBits.EmbedLinks);
        permissions.add(PermissionFlagsBits.Connect);
        permissions.add(PermissionFlagsBits.Speak);
        permissions.add(PermissionFlagsBits.UseVAD);
        permissions.add(PermissionFlagsBits.Stream);
        permissions.add(PermissionFlagsBits.UseSlashCommands);
        permissions.add(PermissionFlagsBits.UseApplicationCommands);
        break;
        
      case 'dj':
        permissions.add(PermissionFlagsBits.SendMessages);
        permissions.add(PermissionFlagsBits.EmbedLinks);
        permissions.add(PermissionFlagsBits.Connect);
        permissions.add(PermissionFlagsBits.Speak);
        permissions.add(PermissionFlagsBits.UseVAD);
        permissions.add(PermissionFlagsBits.Stream);
        permissions.add(PermissionFlagsBits.PrioritySpeaker);
        permissions.add(PermissionFlagsBits.ManageChannels);
        permissions.add(PermissionFlagsBits.UseSlashCommands);
        permissions.add(PermissionFlagsBits.UseApplicationCommands);
        break;
        
      case 'moderation':
        permissions.add(PermissionFlagsBits.SendMessages);
        permissions.add(PermissionFlagsBits.EmbedLinks);
        permissions.add(PermissionFlagsBits.ModerateMembers);
        permissions.add(PermissionFlagsBits.KickMembers);
        permissions.add(PermissionFlagsBits.BanMembers);
        permissions.add(PermissionFlagsBits.ViewAuditLog);
        permissions.add(PermissionFlagsBits.UseSlashCommands);
        permissions.add(PermissionFlagsBits.UseApplicationCommands);
        break;
        
      case 'analytics':
        permissions.add(PermissionFlagsBits.SendMessages);
        permissions.add(PermissionFlagsBits.EmbedLinks);
        permissions.add(PermissionFlagsBits.ViewGuildInsights);
        permissions.add(PermissionFlagsBits.ViewAuditLog);
        permissions.add(PermissionFlagsBits.UseSlashCommands);
        permissions.add(PermissionFlagsBits.UseApplicationCommands);
        break;
        
      default:
        return this.getRequiredPermissions();
    }
    
    return permissions;
  }

  /**
   * Check if bot has required permissions
   */
  public static checkPermissions(
    botPermissions: PermissionsBitField,
    requiredPermissions: PermissionsBitField
  ): { hasPermissions: boolean; missingPermissions: string[] } {
    const missingPermissions: string[] = [];
    
    for (const [permission, value] of requiredPermissions) {
      if (value && !botPermissions.has(permission)) {
        missingPermissions.push(permission);
      }
    }
    
    return {
      hasPermissions: missingPermissions.length === 0,
      missingPermissions
    };
  }

  /**
   * Get permission explanation for users
   */
  public static getPermissionExplanation(permission: string): string {
    const explanations: Record<string, string> = {
      'SendMessages': 'Send messages in text channels for responses and notifications',
      'SendMessagesInThreads': 'Send messages in threads for study sessions',
      'EmbedLinks': 'Send rich embeds for study materials and music information',
      'AttachFiles': 'Attach files for study materials and documents',
      'UseExternalEmojis': 'Use custom emojis for reactions and expressions',
      'UseExternalStickers': 'Use custom stickers for fun interactions',
      'AddReactions': 'Add reactions to messages for interactive features',
      'UseSlashCommands': 'Use slash commands for easy interaction',
      'MentionEveryone': 'Mention @everyone for important announcements',
      'ReadMessageHistory': 'Read message history for context and learning',
      'UseApplicationCommands': 'Use application commands for advanced features',
      'Connect': 'Connect to voice channels for music playback',
      'Speak': 'Speak in voice channels for audio responses',
      'UseVAD': 'Use voice activity detection for voice commands',
      'PrioritySpeaker': 'Get priority in voice channels for clear audio',
      'Stream': 'Stream audio for music playback',
      'UseEmbeddedActivities': 'Use embedded activities for interactive features',
      'ManageChannels': 'Manage channels for DJ sessions and study rooms',
      'ManageRoles': 'Manage roles for study groups and permissions',
      'ManageWebhooks': 'Manage webhooks for integrations',
      'ManageThreads': 'Manage threads for study sessions',
      'ManageGuild': 'Manage server settings for customization',
      'ManageEmojisAndStickers': 'Manage custom emojis and stickers',
      'ManageEvents': 'Manage scheduled events for study sessions',
      'ModerateMembers': 'Moderate members for safety and security',
      'Administrator': 'Full administrative access (not recommended)',
      'ViewAuditLog': 'View audit logs for security monitoring',
      'ViewGuildInsights': 'View server insights for analytics',
      'ChangeNickname': 'Change nicknames for user preferences',
      'ManageNicknames': 'Manage nicknames for moderation',
      'KickMembers': 'Kick members for safety',
      'BanMembers': 'Ban members for safety',
      'TimeoutMembers': 'Timeout members for moderation'
    };
    
    return explanations[permission] || 'Unknown permission';
  }

  /**
   * Generate permission setup guide
   */
  public static generateSetupGuide(): string {
    return `
# gunnchAI3k Permission Setup Guide

## Required Permissions (Essential)
These permissions are required for basic bot functionality:

### Text Permissions
- **Send Messages**: Send responses and notifications
- **Embed Links**: Send rich embeds for study materials
- **Attach Files**: Attach study materials and documents
- **Add Reactions**: Add reactions for interactive features
- **Use Slash Commands**: Use slash commands for easy interaction
- **Read Message History**: Read message history for context

### Voice Permissions (for Music Features)
- **Connect**: Connect to voice channels
- **Speak**: Speak in voice channels
- **Use VAD**: Use voice activity detection
- **Stream**: Stream audio for music playback

## Optional Permissions (Enhanced Features)
These permissions enable additional features:

### Enhanced Text Permissions
- **Use External Emojis**: Use custom emojis
- **Use External Stickers**: Use custom stickers
- **Mention Everyone**: Mention @everyone for announcements

### Enhanced Voice Permissions
- **Priority Speaker**: Get priority in voice channels
- **Use Embedded Activities**: Use embedded activities

### Channel Management
- **Manage Channels**: Manage channels for DJ sessions
- **Manage Roles**: Manage roles for study groups
- **Manage Threads**: Manage threads for study sessions

### Server Management
- **Manage Guild**: Manage server settings
- **Manage Events**: Manage scheduled events
- **Moderate Members**: Moderate members for safety

## Feature-Specific Permissions

### Study Features
- Send Messages, Embed Links, Attach Files, Add Reactions, Use Slash Commands, Read Message History

### Music Features
- Send Messages, Embed Links, Connect, Speak, Use VAD, Stream, Use Slash Commands

### DJ Features
- All Music permissions plus Priority Speaker and Manage Channels

### Moderation Features
- Send Messages, Embed Links, Moderate Members, Kick Members, Ban Members, View Audit Log

## Setup Instructions

1. **Invite the bot** with the required permissions
2. **Grant additional permissions** for enhanced features
3. **Configure role permissions** for different user levels
4. **Test permissions** with basic commands
5. **Monitor usage** and adjust permissions as needed

## Security Notes

- **Never grant Administrator permission** unless absolutely necessary
- **Use role-based permissions** for different user levels
- **Regularly review permissions** and remove unused ones
- **Monitor bot activity** for security purposes

## Troubleshooting

If the bot doesn't work properly:
1. Check if all required permissions are granted
2. Verify the bot's role hierarchy
3. Check channel-specific permissions
4. Review server settings
5. Contact support if issues persist
    `;
  }
}

