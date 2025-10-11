import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

// Feedback storage
const feedbackFile = path.join(process.cwd(), 'data', 'feedback.json');

interface FeedbackEntry {
  id: string;
  userId: string;
  username: string;
  message: string;
  rating: 'thumbs_up' | 'thumbs_down';
  timestamp: string;
  context: string;
  improvements: string[];
}

// Load feedback data
async function loadFeedback(): Promise<FeedbackEntry[]> {
  try {
    const data = await fs.readFile(feedbackFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save feedback data
async function saveFeedback(feedback: FeedbackEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(feedbackFile), { recursive: true });
  await fs.writeFile(feedbackFile, JSON.stringify(feedback, null, 2));
}

// Add feedback entry
async function addFeedback(entry: Omit<FeedbackEntry, 'id' | 'timestamp'>): Promise<void> {
  const feedback = await loadFeedback();
  const newEntry: FeedbackEntry = {
    ...entry,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  };
  feedback.push(newEntry);
  await saveFeedback(feedback);
}

// Get feedback stats
async function getFeedbackStats(): Promise<{ total: number; thumbsUp: number; thumbsDown: number; recentImprovements: string[] }> {
  const feedback = await loadFeedback();
  const recent = feedback.filter(f => 
    new Date(f.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
  );
  
  return {
    total: feedback.length,
    thumbsUp: feedback.filter(f => f.rating === 'thumbs_up').length,
    thumbsDown: feedback.filter(f => f.rating === 'thumbs_down').length,
    recentImprovements: recent.flatMap(f => f.improvements)
  };
}

export const command = {
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Help gunnchAI3k learn and improve')
    .addSubcommand(subcommand =>
      subcommand
        .setName('rate')
        .setDescription('Rate gunnchAI3k\'s response')
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('The message you\'re rating')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('context')
            .setDescription('What was gunnchAI3k helping with?')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('suggest')
        .setDescription('Suggest improvements for gunnchAI3k')
        .addStringOption(option =>
          option
            .setName('improvement')
            .setDescription('What should gunnchAI3k learn or improve?')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View feedback statistics (Admin only)')
    ),

  async execute(interaction: any) {
    if (interaction.options.getSubcommand() === 'rate') {
      const message = interaction.options.getString('message');
      const context = interaction.options.getString('context');
      
      const embed = new EmbedBuilder()
        .setTitle('👍👎 Rate gunnchAI3k\'s Response')
        .setDescription(`**Context:** ${context}\n**Message:** ${message}`)
        .setColor(0x4ecdc4)
        .setFooter({ text: 'Your feedback helps gunnchAI3k learn and improve!' });

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`feedback_thumbs_up_${message}_${context}`)
            .setLabel('👍 Thumbs Up')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`feedback_thumbs_down_${message}_${context}`)
            .setLabel('👎 Thumbs Down')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    }

    if (interaction.options.getSubcommand() === 'suggest') {
      const improvement = interaction.options.getString('improvement');
      
      await addFeedback({
        userId: interaction.user.id,
        username: interaction.user.username,
        message: 'Improvement suggestion',
        rating: 'thumbs_up',
        context: 'User suggestion',
        improvements: [improvement]
      });

      const embed = new EmbedBuilder()
        .setTitle('💡 Suggestion Received!')
        .setDescription(`**Your suggestion:** ${improvement}\n\nThank you for helping gunnchAI3k improve! This will be reviewed and potentially implemented.`)
        .setColor(0x4ecdc4)
        .setFooter({ text: 'gunnchAI3k is always learning!' });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    if (interaction.options.getSubcommand() === 'stats') {
      // Check if user is admin
      const isAdmin = interaction.user.id === process.env.EXECUTIVE_USER_ID;
      
      if (!isAdmin) {
        return interaction.reply({
          content: '❌ This command is restricted to administrators only.',
          ephemeral: true
        });
      }

      const stats = await getFeedbackStats();
      
      const embed = new EmbedBuilder()
        .setTitle('📊 Feedback Statistics')
        .setDescription('Learning progress and user feedback')
        .setColor(0x4ecdc4)
        .addFields(
          {
            name: '📈 Overall Stats',
            value: `**Total Feedback:** ${stats.total}\n**👍 Thumbs Up:** ${stats.thumbsUp}\n**👎 Thumbs Down:** ${stats.thumbsDown}`,
            inline: true
          },
          {
            name: '📊 Approval Rate',
            value: `${Math.round((stats.thumbsUp / (stats.thumbsUp + stats.thumbsDown)) * 100)}%`,
            inline: true
          },
          {
            name: '💡 Recent Improvements',
            value: stats.recentImprovements.length > 0 
              ? stats.recentImprovements.slice(0, 5).join('\n')
              : 'No recent improvements',
            inline: false
          }
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  },

  async onButton(interaction: any) {
    if (interaction.customId.startsWith('feedback_thumbs_up_')) {
      const [, , message, context] = interaction.customId.split('_');
      
      await addFeedback({
        userId: interaction.user.id,
        username: interaction.user.username,
        message: message.replace(/\$/g, ' '),
        rating: 'thumbs_up',
        context: context.replace(/\$/g, ' '),
        improvements: []
      });

      const embed = new EmbedBuilder()
        .setTitle('👍 Thank you!')
        .setDescription('Your positive feedback helps gunnchAI3k learn what works well!')
        .setColor(0x00ff00);

      await interaction.update({
        embeds: [embed],
        components: []
      });
    }

    if (interaction.customId.startsWith('feedback_thumbs_down_')) {
      const [, , , message, context] = interaction.customId.split('_');
      
      await addFeedback({
        userId: interaction.user.id,
        username: interaction.user.username,
        message: message.replace(/\$/g, ' '),
        rating: 'thumbs_down',
        context: context.replace(/\$/g, ' '),
        improvements: []
      });

      const embed = new EmbedBuilder()
        .setTitle('👎 Feedback Received')
        .setDescription('Thank you for the feedback! gunnchAI3k will learn from this to improve future responses.')
        .setColor(0xff6b6b);

      await interaction.update({
        embeds: [embed],
        components: []
      });
    }
  }
};
