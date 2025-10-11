import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';

// Learning data storage
const learningFile = path.join(process.cwd(), 'data', 'learning.json');
const githubDataFile = path.join(process.cwd(), 'data', 'github-scraping.json');

interface LearningEntry {
  id: string;
  source: 'github' | 'feedback' | 'manual';
  title: string;
  description: string;
  url: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  approved: boolean;
  implemented: boolean;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  language: string;
  stargazers_count: number;
  updated_at: string;
  topics: string[];
}

// Load learning data
async function loadLearning(): Promise<LearningEntry[]> {
  try {
    const data = await fs.readFile(learningFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save learning data
async function saveLearning(learning: LearningEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(learningFile), { recursive: true });
  await fs.writeFile(learningFile, JSON.stringify(learning, null, 2));
}

// Scrape GitHub for learning opportunities
async function scrapeGitHub(): Promise<LearningEntry[]> {
  const learningEntries: LearningEntry[] = [];
  
  try {
    // Search for trending repositories
    const trendingResponse = await axios.get('https://api.github.com/search/repositories', {
      params: {
        q: 'stars:>1000 created:>2024-01-01',
        sort: 'stars',
        order: 'desc',
        per_page: 20
      },
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    for (const repo of trendingResponse.data.items) {
      // Analyze repository for learning opportunities
      const learningEntry = await analyzeRepository(repo);
      if (learningEntry) {
        learningEntries.push(learningEntry);
      }
    }

    // Search for specific technologies
    const techSearches = [
      'discord bot typescript',
      'ai chatbot',
      'monitoring system',
      'learning system',
      'feedback system'
    ];

    for (const query of techSearches) {
      const response = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: query,
          sort: 'updated',
          order: 'desc',
          per_page: 10
        },
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      for (const repo of response.data.items) {
        const learningEntry = await analyzeRepository(repo);
        if (learningEntry) {
          learningEntries.push(learningEntry);
        }
      }
    }

  } catch (error) {
    console.error('GitHub scraping error:', error);
  }

  return learningEntries;
}

// Analyze repository for learning opportunities
async function analyzeRepository(repo: GitHubRepo): Promise<LearningEntry | null> {
  const description = repo.description?.toLowerCase() || '';
  const topics = repo.topics || [];
  
  // Check for relevant technologies and concepts
  const relevantKeywords = [
    'discord', 'bot', 'ai', 'learning', 'feedback', 'monitoring',
    'typescript', 'node', 'react', 'vue', 'angular', 'express',
    'database', 'api', 'webhook', 'automation', 'scheduler'
  ];

  const isRelevant = relevantKeywords.some(keyword => 
    description.includes(keyword) || topics.includes(keyword)
  );

  if (!isRelevant) return null;

  // Determine category and priority
  let category = 'general';
  let priority: 'high' | 'medium' | 'low' = 'low';

  if (description.includes('discord') || topics.includes('discord')) {
    category = 'discord-bot';
    priority = 'high';
  } else if (description.includes('ai') || description.includes('learning')) {
    category = 'ai-learning';
    priority = 'high';
  } else if (description.includes('monitoring') || description.includes('feedback')) {
    category = 'monitoring';
    priority = 'medium';
  }

  // Check if it's a significant project
  if (repo.stargazers_count > 1000) {
    priority = 'high';
  } else if (repo.stargazers_count > 100) {
    priority = 'medium';
  }

  return {
    id: `github_${repo.name}_${Date.now()}`,
    source: 'github',
    title: `Learn from ${repo.name}`,
    description: `**Repository:** ${repo.full_name}\n**Description:** ${repo.description || 'No description'}\n**Stars:** ${repo.stargazers_count}\n**Language:** ${repo.language}\n**Topics:** ${topics.join(', ')}`,
    url: repo.html_url,
    category,
    priority,
    timestamp: new Date().toISOString(),
    approved: false,
    implemented: false
  };
}

// Generate morning report
async function generateMorningReport(): Promise<string> {
  const learning = await loadLearning();
  const recent = learning.filter(l => 
    new Date(l.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
  );

  const highPriority = recent.filter(l => l.priority === 'high');
  const mediumPriority = recent.filter(l => l.priority === 'medium');
  const approved = recent.filter(l => l.approved);

  let report = `🌅 **Morning Learning Report** - ${new Date().toLocaleDateString()}\n\n`;
  
  report += `📊 **Summary:**\n`;
  report += `• ${recent.length} new learning opportunities found\n`;
  report += `• ${highPriority.length} high priority items\n`;
  report += `• ${mediumPriority.length} medium priority items\n`;
  report += `• ${approved.length} approved for implementation\n\n`;

  if (highPriority.length > 0) {
    report += `🚨 **High Priority Learning:**\n`;
    highPriority.slice(0, 3).forEach(item => {
      report += `• **${item.title}** (${item.category})\n`;
      report += `  ${item.description.substring(0, 100)}...\n`;
      report += `  🔗 ${item.url}\n\n`;
    });
  }

  if (mediumPriority.length > 0) {
    report += `⚠️ **Medium Priority Learning:**\n`;
    mediumPriority.slice(0, 2).forEach(item => {
      report += `• **${item.title}** (${item.category})\n`;
      report += `  ${item.description.substring(0, 80)}...\n\n`;
    });
  }

  if (approved.length > 0) {
    report += `✅ **Approved for Implementation:**\n`;
    approved.forEach(item => {
      report += `• **${item.title}** - Ready to implement\n`;
    });
  }

  return report;
}

// Run nightly learning
async function runNightlyLearning(): Promise<void> {
  console.log('🌙 Starting nightly learning process...');
  
  try {
    // Scrape GitHub for new learning opportunities
    const newEntries = await scrapeGitHub();
    
    // Load existing learning data
    const existingLearning = await loadLearning();
    
    // Filter out duplicates
    const existingUrls = new Set(existingLearning.map(l => l.url));
    const uniqueEntries = newEntries.filter(entry => !existingUrls.has(entry.url));
    
    // Add new entries
    const updatedLearning = [...existingLearning, ...uniqueEntries];
    await saveLearning(updatedLearning);
    
    console.log(`📚 Found ${uniqueEntries.length} new learning opportunities`);
    
    // Generate morning report
    const report = await generateMorningReport();
    
    // Save report for morning delivery
    await fs.writeFile(
      path.join(process.cwd(), 'data', 'morning-report.txt'),
      report
    );
    
    console.log('✅ Nightly learning completed');
    
  } catch (error) {
    console.error('❌ Nightly learning failed:', error);
  }
}

// Schedule nightly learning
export function scheduleNightlyLearning(): void {
  // Run every night at 2 AM
  cron.schedule('0 2 * * *', runNightlyLearning);
  console.log('⏰ Nightly learning scheduled for 2 AM daily');
}

export const command = {
  data: new SlashCommandBuilder()
    .setName('learning')
    .setDescription('Manage gunnchAI3k\'s learning system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('report')
        .setDescription('Get the latest learning report (Admin only)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('scrape')
        .setDescription('Manually trigger GitHub scraping (Admin only)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('approve')
        .setDescription('Approve learning recommendations (Admin only)')
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('Learning entry ID to approve')
            .setRequired(true)
        )
    ),

  async execute(interaction: any) {
    // Check if user is admin
    const isAdmin = interaction.user.id === process.env.EXECUTIVE_USER_ID;
    
    if (!isAdmin) {
      return interaction.reply({
        content: '❌ This command is restricted to administrators only.',
        ephemeral: true
      });
    }

    if (interaction.options.getSubcommand() === 'report') {
      const report = await generateMorningReport();
      
      const embed = new EmbedBuilder()
        .setTitle('📚 Learning Report')
        .setDescription(report)
        .setColor(0x4ecdc4)
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    if (interaction.options.getSubcommand() === 'scrape') {
      await interaction.deferReply({ ephemeral: true });
      
      try {
        await runNightlyLearning();
        await interaction.editReply({
          content: '✅ GitHub scraping completed! Check the learning data for new opportunities.',
          ephemeral: true
        });
      } catch (error) {
        await interaction.editReply({
          content: '❌ GitHub scraping failed. Please try again later.',
          ephemeral: true
        });
      }
    }

    if (interaction.options.getSubcommand() === 'approve') {
      const id = interaction.options.getString('id');
      
      try {
        const learning = await loadLearning();
        const entry = learning.find(l => l.id === id);
        
        if (!entry) {
          return interaction.reply({
            content: '❌ Learning entry not found.',
            ephemeral: true
          });
        }

        entry.approved = true;
        await saveLearning(learning);

        await interaction.reply({
          content: `✅ Learning entry "${entry.title}" has been approved for implementation!`,
          ephemeral: true
        });
      } catch (error) {
        await interaction.reply({
          content: '❌ Failed to approve learning entry.',
          ephemeral: true
        });
      }
    }
  }
};
