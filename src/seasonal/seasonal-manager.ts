import { Client } from 'discord.js';
import { SeasonalEventManager, SeasonalEvent } from './seasonal-events';
import { AnniversaryCelebrationManager, AnniversaryEvent } from './anniversary-celebration';
import { AcademicCalendarManager, AcademicSeason } from './academic-calendar';

export class SeasonalManager {
  private client: Client;
  private seasonalEvents: SeasonalEventManager;
  private anniversaryCelebration: AnniversaryCelebrationManager;
  private academicCalendar: AcademicCalendarManager;

  constructor(client: Client) {
    this.client = client;
    this.seasonalEvents = new SeasonalEventManager(client);
    this.anniversaryCelebration = new AnniversaryCelebrationManager(client);
    this.academicCalendar = new AcademicCalendarManager(client);
  }

  public getMasterGreeting(): string {
    // Priority: Anniversary > Seasonal Event > Academic Season > Default
    if (this.anniversaryCelebration.isAnniversaryActive()) {
      return this.anniversaryCelebration.getAnniversaryGreeting();
    }

    const seasonalEvent = this.seasonalEvents.getCurrentEvent();
    if (seasonalEvent) {
      return this.seasonalEvents.getSeasonalGreeting();
    }

    const academicSeason = this.academicCalendar.getCurrentSeason();
    if (academicSeason) {
      return this.academicCalendar.getSeasonalGreeting();
    }

    return '🌟 **gunnchAI3k is here!** Ready to help you study! 🌟';
  }

  public getMasterStudyMotivation(): string {
    // Combine all motivational sources
    const motivations = [];

    if (this.anniversaryCelebration.isAnniversaryActive()) {
      motivations.push('🎉 **Anniversary Celebration!** Let\'s make this year legendary!');
    }

    const seasonalEvent = this.seasonalEvents.getCurrentEvent();
    if (seasonalEvent) {
      motivations.push(this.seasonalEvents.getSeasonalStudyMotivation());
    }

    const academicSeason = this.academicCalendar.getCurrentSeason();
    if (academicSeason) {
      motivations.push(this.academicCalendar.getSeasonalStudyMotivation());
    }

    if (motivations.length === 0) {
      return 'Keep studying hard! Your success is inevitable!';
    }

    return motivations.join('\n\n');
  }

  public getMasterStudyPlan(): string {
    const academicSeason = this.academicCalendar.getCurrentSeason();
    if (academicSeason) {
      return this.academicCalendar.getSeasonalStudyPlan();
    }

    return '📚 **General Study Plan:**\n\n• Set clear goals\n• Create a study schedule\n• Stay consistent\n• Practice regularly';
  }

  public getMasterExamCountdown(): string {
    const academicSeason = this.academicCalendar.getCurrentSeason();
    if (academicSeason) {
      return this.academicCalendar.getExamCountdown();
    }

    return '📅 **No active semester detected.**\n\nStay ready for the next academic season!';
  }

  public getMasterExamTips(): string[] {
    const academicSeason = this.academicCalendar.getCurrentSeason();
    if (academicSeason) {
      return this.academicCalendar.getExamPreparationTips();
    }

    return [
      '📚 Build strong study habits',
      '📝 Create a consistent schedule',
      '🎯 Set achievable goals',
      '💪 Stay motivated and focused'
    ];
  }

  public getMasterMusicThemes(): string[] {
    const themes = ['study', 'focus', 'motivation'];

    // Add seasonal themes
    const seasonalEvent = this.seasonalEvents.getCurrentEvent();
    if (seasonalEvent) {
      themes.push(...seasonalEvent.musicThemes);
    }

    // Add academic season themes
    const academicSeason = this.academicCalendar.getCurrentSeason();
    if (academicSeason) {
      switch (academicSeason.season) {
        case 'fall':
          themes.push('autumn', 'harvest', 'thanksgiving');
          break;
        case 'spring':
          themes.push('spring', 'bloom', 'renewal');
          break;
        case 'summer':
          themes.push('summer', 'beach', 'sunshine');
          break;
      }
    }

    // Add anniversary themes
    if (this.anniversaryCelebration.isAnniversaryActive()) {
      themes.push('celebration', 'achievement', 'success');
    }

    return [...new Set(themes)]; // Remove duplicates
  }

  public getMasterStatus(): string {
    const status = [];

    // Anniversary status
    if (this.anniversaryCelebration.isAnniversaryActive()) {
      const anniversary = this.anniversaryCelebration.getCurrentAnniversary();
      status.push(`🎉 **${anniversary?.name}** - Celebrating ${anniversary?.yearsSince} years of gunnchos LLC-S!`);
    } else {
      const daysUntil = this.anniversaryCelebration.getDaysUntilNextAnniversary();
      status.push(`📅 **${daysUntil} days until next anniversary!**`);
    }

    // Seasonal event status
    const seasonalEvent = this.seasonalEvents.getCurrentEvent();
    if (seasonalEvent) {
      status.push(`🎭 **${seasonalEvent.name}** - ${seasonalEvent.description}`);
    }

    // Academic season status
    const academicSeason = this.academicCalendar.getCurrentSeason();
    if (academicSeason) {
      const intensity = this.academicCalendar.getExamIntensity();
      status.push(`📚 **${academicSeason.name}** - Intensity: ${intensity.toUpperCase()}`);
    }

    if (status.length === 0) {
      return '🌟 **gunnchAI3k is ready!** No special events active.';
    }

    return status.join('\n\n');
  }

  public getMasterFeatures(): string[] {
    const features = [];

    // Anniversary features
    if (this.anniversaryCelebration.isAnniversaryActive()) {
      const anniversary = this.anniversaryCelebration.getCurrentAnniversary();
      features.push(...(anniversary?.specialFeatures || []));
    }

    // Seasonal event features
    const seasonalEvent = this.seasonalEvents.getCurrentEvent();
    if (seasonalEvent) {
      features.push(...seasonalEvent.specialFeatures);
    }

    // Academic season features
    const academicSeason = this.academicCalendar.getCurrentSeason();
    if (academicSeason) {
      features.push(...academicSeason.specialFeatures);
    }

    // Default features if no special events
    if (features.length === 0) {
      features.push(
        '🧠 Smart study assistance',
        '📚 Personalized learning plans',
        '🎯 Goal tracking and motivation',
        '💫 AI-powered study companion'
      );
    }

    return features;
  }

  public isSpecialEventActive(): boolean {
    return (
      this.anniversaryCelebration.isAnniversaryActive() ||
      this.seasonalEvents.getCurrentEvent() !== null ||
      this.academicCalendar.getCurrentSeason() !== null
    );
  }

  public getUpcomingEvents(): string[] {
    const events = [];

    // Upcoming seasonal events
    const upcomingSeasonal = this.seasonalEvents.getUpcomingEvents();
    upcomingSeasonal.forEach(event => {
      events.push(`🎭 **${event.name}** - ${event.startDate.toLocaleDateString()}`);
    });

    // Upcoming academic seasons
    const upcomingAcademic = this.academicCalendar.getUpcomingExamPeriods();
    upcomingAcademic.forEach(season => {
      events.push(`📚 **${season.name}** - ${season.startDate.toLocaleDateString()}`);
    });

    // Next anniversary
    const daysUntilAnniversary = this.anniversaryCelebration.getDaysUntilNextAnniversary();
    if (daysUntilAnniversary <= 365) {
      events.push(`🎉 **Next Anniversary** - ${daysUntilAnniversary} days`);
    }

    return events;
  }

  public getMasterAnniversaryInfo(): string {
    if (this.anniversaryCelebration.isAnniversaryActive()) {
      const anniversary = this.anniversaryCelebration.getCurrentAnniversary();
      return `🎉 **${anniversary?.name}** 🎉\n\n${anniversary?.description}\n\n**Achievements:**\n${anniversary?.achievements.map(a => `• ${a}`).join('\n')}\n\n**Future Goals:**\n${anniversary?.futureGoals.map(g => `• ${g}`).join('\n')}`;
    }

    return this.anniversaryCelebration.getAnniversaryCountdown();
  }
}
