import { Client } from 'discord.js';

export interface AcademicSeason {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  season: 'fall' | 'spring' | 'summer';
  intensity: 'low' | 'medium' | 'high' | 'critical';
  specialFeatures: string[];
  greetings: string[];
  studyMotivation: string[];
  examTypes: string[];
}

export class AcademicCalendarManager {
  private client: Client;
  private seasons: AcademicSeason[] = [];

  constructor(client: Client) {
    this.client = client;
    this.initializeAcademicSeasons();
  }

  private initializeAcademicSeasons() {
    // Fall Semester 2024
    this.seasons.push({
      id: 'fall-2024',
      name: '🍂 Fall Semester 2024',
      description: 'Autumn studies with crisp focus and warm motivation!',
      startDate: new Date('2024-08-15'),
      endDate: new Date('2024-12-15'),
      season: 'fall',
      intensity: 'medium',
      specialFeatures: [
        '🍂 Autumn-themed study sessions',
        '📚 Back-to-school motivation',
        '🎃 Halloween study breaks',
        '🦃 Thanksgiving gratitude studies'
      ],
      greetings: [
        '🍂 **Fall into Success!** Let\'s make this semester legendary!',
        '📚 **Back to School!** Time to show what you\'re made of!',
        '🎯 **Autumn Focus!** Your studies will be as crisp as fall leaves!'
      ],
      studyMotivation: [
        'Fall into academic excellence!',
        'Your success is as beautiful as autumn leaves!',
        'Crisp focus, warm results!'
      ],
      examTypes: ['Midterm Exams', 'Final Exams', 'Thanksgiving Break Prep']
    });

    // Spring Semester 2025
    this.seasons.push({
      id: 'spring-2025',
      name: '🌸 Spring Semester 2025',
      description: 'Spring into academic success with blooming knowledge!',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-15'),
      season: 'spring',
      intensity: 'high',
      specialFeatures: [
        '🌸 Spring renewal study sessions',
        '🌱 Growth mindset development',
        '🎓 Graduation preparation',
        '🌺 Blooming academic achievements'
      ],
      greetings: [
        '🌸 **Spring into Action!** Let\'s make this semester bloom!',
        '🌱 **Growth Season!** Watch your knowledge grow!',
        '🎓 **Graduation Prep!** Your future is blooming!'
      ],
      studyMotivation: [
        'Bloom where you study!',
        'Spring into academic success!',
        'Your knowledge is blooming beautifully!'
      ],
      examTypes: ['Midterm Exams', 'Final Exams', 'Graduation Prep']
    });

    // Summer Session 2025
    this.seasons.push({
      id: 'summer-2025',
      name: '☀️ Summer Session 2025',
      description: 'Hot study sessions for cool summer results!',
      startDate: new Date('2025-05-20'),
      endDate: new Date('2025-08-15'),
      season: 'summer',
      intensity: 'medium',
      specialFeatures: [
        '☀️ Summer study sessions',
        '🏖️ Beach-themed learning',
        '🌊 Wave-riding through studies',
        '🏄‍♂️ Surfing through exams'
      ],
      greetings: [
        '☀️ **Summer Study Mode!** Let\'s make it hot with knowledge!',
        '🏖️ **Beach Study Time!** Your grades will be beach-perfect!',
        '🌊 **Ride the Wave!** Let\'s surf through your studies!'
      ],
      studyMotivation: [
        'Make your study sessions sizzle!',
        'Hot study sessions, cool results!',
        'Your success is as bright as the sun!'
      ],
      examTypes: ['Summer Midterms', 'Summer Finals', 'Summer Break Prep']
    });
  }

  public getCurrentSeason(): AcademicSeason | null {
    const now = new Date();
    return this.seasons.find(season => 
      now >= season.startDate && now <= season.endDate
    ) || null;
  }

  public getUpcomingExamPeriods(): AcademicSeason[] {
    const now = new Date();
    return this.seasons
      .filter(season => season.startDate > now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 2); // Next 2 seasons
  }

  public getSeasonalGreeting(): string {
    const season = this.getCurrentSeason();
    if (!season) {
      return '🌟 **gunnchAI3k is here!** Ready to help you study! 🌟';
    }

    const randomGreeting = season.greetings[Math.floor(Math.random() * season.greetings.length)];
    return `${randomGreeting}\n\n${season.description}\n\n🎯 **Seasonal Features:**\n${season.specialFeatures.map(feature => `• ${feature}`).join('\n')}`;
  }

  public getSeasonalStudyMotivation(): string {
    const season = this.getCurrentSeason();
    if (!season) {
      return 'Keep studying hard! Your success is inevitable!';
    }

    const randomMotivation = season.studyMotivation[Math.floor(Math.random() * season.studyMotivation.length)];
    return `🎯 **${season.name} Motivation:** ${randomMotivation}`;
  }

  public getExamIntensity(): 'low' | 'medium' | 'high' | 'critical' {
    const season = this.getCurrentSeason();
    if (!season) return 'medium';

    const now = new Date();
    const seasonStart = season.startDate;
    const seasonEnd = season.endDate;
    const seasonLength = seasonEnd.getTime() - seasonStart.getTime();
    const timeElapsed = now.getTime() - seasonStart.getTime();
    const progress = timeElapsed / seasonLength;

    // Increase intensity as semester progresses
    if (progress < 0.3) return 'low';
    if (progress < 0.6) return 'medium';
    if (progress < 0.8) return 'high';
    return 'critical';
  }

  public getExamCountdown(): string {
    const season = this.getCurrentSeason();
    if (!season) return 'No active semester detected.';

    const now = new Date();
    const seasonEnd = season.endDate;
    const daysRemaining = Math.ceil((seasonEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return '🎉 **Semester Complete!** 🎉\n\nCongratulations on finishing the semester!';
    } else if (daysRemaining <= 7) {
      return `🚨 **FINAL WEEK!** 🚨\n\n${daysRemaining} days left in the semester!\n\nTime to give it your all!`;
    } else if (daysRemaining <= 14) {
      return `⚡ **TWO WEEKS LEFT!** ⚡\n\n${daysRemaining} days remaining!\n\nPush through to the finish line!`;
    } else if (daysRemaining <= 30) {
      return `📅 **${daysRemaining} days left in the semester!** 📅\n\nStay focused and finish strong!`;
    } else {
      return `📚 **${daysRemaining} days left in the semester!** 📚\n\nKeep up the great work!`;
    }
  }

  public getExamPreparationTips(): string[] {
    const intensity = this.getExamIntensity();
    const season = this.getCurrentSeason();

    const tips = {
      low: [
        '📚 Start building good study habits early',
        '📝 Create a study schedule and stick to it',
        '🎯 Set small, achievable goals',
        '💪 Build your academic foundation'
      ],
      medium: [
        '⚡ Increase study intensity gradually',
        '📊 Track your progress regularly',
        '🎯 Focus on understanding concepts',
        '💡 Start reviewing past material'
      ],
      high: [
        '🚨 Ramp up study sessions significantly',
        '📚 Focus on problem areas',
        '⏰ Increase study time per day',
        '🎯 Practice with past exams'
      ],
      critical: [
        '🔥 MAXIMUM STUDY MODE ACTIVATED!',
        '⚡ Study sessions every day!',
        '📚 Focus on high-impact topics',
        '🎯 Practice, practice, practice!',
        '💪 Push through to the finish line!'
      ]
    };

    return tips[intensity] || tips.medium;
  }

  public isExamSeason(): boolean {
    const intensity = this.getExamIntensity();
    return intensity === 'high' || intensity === 'critical';
  }

  public getSeasonalStudyPlan(): string {
    const season = this.getCurrentSeason();
    const intensity = this.getExamIntensity();

    if (!season) return 'No active semester detected.';

    const plan = {
      low: `🌱 **Early Semester Plan:**\n• Build strong foundations\n• Develop good study habits\n• Set achievable goals\n• Stay consistent`,
      medium: `⚡ **Mid-Semester Plan:**\n• Increase study intensity\n• Review past material\n• Practice problem-solving\n• Stay organized`,
      high: `🚨 **Exam Season Plan:**\n• Intensive study sessions\n• Focus on problem areas\n• Practice with past exams\n• Maintain work-life balance`,
      critical: `🔥 **CRITICAL EXAM MODE:**\n• MAXIMUM STUDY EFFORT!\n• Focus on high-impact topics\n• Practice, practice, practice!\n• Push through to success!`
    };

    return `📚 **${season.name} Study Plan:**\n\n${plan[intensity]}`;
  }
}
