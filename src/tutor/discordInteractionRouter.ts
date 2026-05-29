import {
  ChatInputCommandInteraction,
  Interaction,
  SlashCommandBuilder,
} from 'discord.js';
import { routeSkillQuery } from './skillRouter';
import { checkAcademicIntegrityRequest } from './academicIntegrityPolicy';
import { parseResponseMode, modeSystemHint } from './responseModes';
import { listTutorCards, WAIKE_LEVELS } from './waikeTutorCards';

let cachedCommands: SlashCommandBuilder[] | null = null;

export function getWaikeSlashCommands(): SlashCommandBuilder[] {
  if (cachedCommands) return cachedCommands;
  cachedCommands = [
  new SlashCommandBuilder()
    .setName('waike')
    .setDescription('WAIKE learning paths')
    .addSubcommand((s) => s.setName('path').setDescription('Show WAIKE levels 0–7'))
    .addSubcommand((s) =>
      s
        .setName('lesson')
        .setDescription('Start a WAIKE lesson')
        .addStringOption((o) => o.setName('topic').setDescription('Topic or course id').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('lab')
        .setDescription('Start a lab checklist')
        .addStringOption((o) => o.setName('lab_id').setDescription('Lab id').setRequired(true))
    ),
  new SlashCommandBuilder()
    .setName('explain')
    .setDescription('Explain a concept')
    .addStringOption((o) => o.setName('topic').setDescription('Topic').setRequired(true))
    .addStringOption((o) =>
      o
        .setName('mode')
        .setDescription('beginner | apprentice | industry | research')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('quizme')
    .setDescription('Practice questions (not active exams)')
    .addStringOption((o) => o.setName('topic').setDescription('Topic').setRequired(true)),
  new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('Portfolio bullets from a project'),
  new SlashCommandBuilder().setName('mentor').setDescription('Research/project mentor mode'),
  new SlashCommandBuilder().setName('instructor').setDescription('Instructor assistant mode'),
  new SlashCommandBuilder()
    .setName('standards')
    .setDescription('Standards alignment for a topic')
    .addStringOption((o) => o.setName('topic').setDescription('Topic').setRequired(true)),
  new SlashCommandBuilder().setName('integrity').setDescription('Academic integrity help'),
  new SlashCommandBuilder().setName('privacy').setDescription('What gunnchAI3k stores'),
  ];
  return cachedCommands;
}

export class WaikeDiscordInteractionRouter {
  async handle(interaction: Interaction): Promise<boolean> {
    if (!interaction.isChatInputCommand()) return false;

    const name = interaction.commandName;
    const waikeCommands = ['waike', 'explain', 'quizme', 'portfolio', 'mentor', 'instructor', 'standards', 'integrity', 'privacy'];
    if (!waikeCommands.includes(name)) return false;

    await this.dispatch(interaction);
    return true;
  }

  private async dispatch(interaction: ChatInputCommandInteraction): Promise<void> {
    const integrity = checkAcademicIntegrityRequest(JSON.stringify(interaction.options.data));
    if (!integrity.allowed) {
      await interaction.reply({
        content: `${integrity.reason}\n${integrity.alternative ?? ''}`,
        ephemeral: true,
      });
      return;
    }

    switch (interaction.commandName) {
      case 'waike':
        await this.handleWaike(interaction);
        break;
      case 'explain':
        await this.handleExplain(interaction);
        break;
      case 'quizme':
        await interaction.reply({
          content: 'Practice mode: I will ask diagnostic questions first. No active exam solutions.',
          ephemeral: true,
        });
        break;
      case 'portfolio':
        await interaction.reply({
          content: 'Portfolio stub: Problem → Action → Result → Proof artifact checklist.',
          ephemeral: true,
        });
        break;
      case 'mentor':
        await interaction.reply({
          content: 'Research mentor mode: 7GC + gunnchOS apprenticeship guidance. Use public repos only.',
          ephemeral: true,
        });
        break;
      case 'instructor':
        await interaction.reply({
          content: 'Instructor assistant: lesson plan + rubric templates from waike-research-ops/templates/.',
          ephemeral: true,
        });
        break;
      case 'standards': {
        const topic = interaction.options.getString('topic', true);
        const route = routeSkillQuery(topic);
        await interaction.reply({
          content: `Standards mapping for **${route.domainTitle}**: partially covered — see waike-research-ops/standards_alignment/ (needs source review).`,
          ephemeral: true,
        });
        break;
      }
      case 'integrity':
        await interaction.reply({
          content:
            'Allowed: explanations, hints, practice, labs, portfolio coaching.\nNot allowed: active exam/hidden assessment solutions.',
          ephemeral: true,
        });
        break;
      case 'privacy':
        await interaction.reply({
          content:
            'gunnchAI3k minimizes storage. No grades/resumes in public repos. Slash-first tutoring works without broad message logging.',
          ephemeral: true,
        });
        break;
      default:
        await interaction.reply({ content: 'WAIKE tutor command received.', ephemeral: true });
    }
  }

  private async handleWaike(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    if (sub === 'path') {
      const lines = WAIKE_LEVELS.map((l) => `**L${l.level}** — ${l.name}`).join('\n');
      const cards = listTutorCards().map((c) => `• ${c.title} (\`${c.command}\`)`).join('\n');
      await interaction.reply({
        content: `**WAIKE Path (0–7)**\n${lines}\n\n**Featured cards**\n${cards}`,
        ephemeral: true,
      });
      return;
    }
    if (sub === 'lesson') {
      const topic = interaction.options.getString('topic', true);
      const route = routeSkillQuery(topic);
      await interaction.reply({
        content: `Lesson stub: **${topic}** → ${route.domainTitle}. Mode: ${route.suggestedMode}. Repos: ${route.repoLinks.join(', ')}`,
        ephemeral: true,
      });
      return;
    }
    if (sub === 'lab') {
      const labId = interaction.options.getString('lab_id', true);
      await interaction.reply({
        content: `Lab checklist for \`${labId}\`: [ ] setup [ ] safety [ ] attempt [ ] reflect [ ] portfolio`,
        ephemeral: true,
      });
    }
  }

  private async handleExplain(interaction: ChatInputCommandInteraction): Promise<void> {
    const topic = interaction.options.getString('topic', true);
    const modeRaw = interaction.options.getString('mode') ?? 'beginner';
    const mode = parseResponseMode(modeRaw);
    const route = routeSkillQuery(topic);
    await interaction.reply({
      content: `**${topic}** (${modeSystemHint(mode)})\nDomain: ${route.domainTitle}\nI will use Socratic hints before full answers. I am gunnchAI3k — not Edmund.`,
      ephemeral: true,
    });
  }
}
