import { Client } from 'discord.js';

export interface AnniversaryEvent {
  id: string;
  name: string;
  description: string;
  date: Date;
  yearsSince: number;
  specialFeatures: string[];
  greetings: string[];
  achievements: string[];
  futureGoals: string[];
}

export class AnniversaryCelebrationManager {
  private client: Client;
  private companyFoundedDate: Date;
  private currentAnniversary: AnniversaryEvent | null = null;

  constructor(client: Client) {
    this.client = client;
    // gunnchos LLC-S founded on 10/23/2022
    this.companyFoundedDate = new Date('2022-10-23');
    this.initializeAnniversaryEvents();
    this.updateCurrentAnniversary();
  }

  private initializeAnniversaryEvents() {
    // 2nd Anniversary (2024)
    this.createAnniversaryEvent(2, '🎉 2nd Anniversary Celebration', [
      '🚀 **Rocket Launch Study Mode** - Blast off to academic success!',
      '🌟 **Star Student Recognition** - Celebrating academic achievements!',
      '🎯 **Precision Study Sessions** - Laser-focused learning!',
      '💫 **Stellar Performance Tracking** - Monitoring your academic journey!'
    ], [
      '🎉 **Happy 2nd Anniversary gunnchos LLC-S!** 🎉',
      '🚀 **Two years of innovation!** Let\'s celebrate with stellar study sessions!',
      '🌟 **From startup to star!** Your academic journey is our success story!',
      '🎯 **Two years strong!** Let\'s make this year your best academic year yet!'
    ], [
      'Founded gunnchos LLC-S on October 23, 2022',
      'Developed gunnchAI3k - The ultimate study companion',
      'Created innovative study tools and AI assistance',
      'Built a community of academic achievers',
      'Launched multiple successful projects and collaborations'
    ], [
      'Continue revolutionizing education technology',
      'Expand AI-powered study assistance globally',
      'Develop next-generation learning tools',
      'Build stronger academic communities',
      'Create more innovative solutions for students'
    ]);

    // 3rd Anniversary (2025)
    this.createAnniversaryEvent(3, '🎊 3rd Anniversary Spectacular', [
      '🎆 **Fireworks Study Sessions** - Explosive learning experiences!',
      '🏆 **Triple Crown Achievement** - Mastering three key subjects!',
      '🎪 **Circus of Knowledge** - The greatest show in academic history!',
      '🎭 **Drama-Free Study Zone** - Focused, fun, and effective!'
    ], [
      '🎊 **Happy 3rd Anniversary gunnchos LLC-S!** 🎊',
      '🎆 **Three years of excellence!** Let\'s celebrate with fireworks of knowledge!',
      '🏆 **Triple the success!** Your academic achievements are our pride!',
      '🎪 **The greatest show on earth!** Your study sessions are legendary!'
    ], [
      'Three years of continuous innovation',
      'Expanded to multiple academic disciplines',
      'Developed advanced AI study algorithms',
      'Created comprehensive learning ecosystems',
      'Built partnerships with educational institutions'
    ], [
      'Launch next-generation AI study platform',
      'Expand to international markets',
      'Develop specialized academic tools',
      'Create global study communities',
      'Revolutionize online education'
    ]);

    // 5th Anniversary (2027)
    this.createAnniversaryEvent(5, '🎂 5th Anniversary Milestone', [
      '🎂 **Birthday Study Cake** - Sweet success in every subject!',
      '🎁 **Gift of Knowledge** - Unwrapping academic achievements!',
      '🎈 **Balloon of Success** - Rising to new academic heights!',
      '🎊 **Party Study Mode** - Celebrating every learning milestone!'
    ], [
      '🎂 **Happy 5th Anniversary gunnchos LLC-S!** 🎂',
      '🎁 **Five years of gifts!** The gift of knowledge keeps giving!',
      '🎈 **Rising higher!** Your academic journey reaches new heights!',
      '🎊 **Half a decade of excellence!** Let\'s party with productivity!'
    ], [
      'Five years of educational innovation',
      'Pioneered AI-powered study assistance',
      'Created comprehensive learning platforms',
      'Built global academic communities',
      'Developed cutting-edge educational technology'
    ], [
      'Become the leading AI study platform',
      'Expand to all major universities',
      'Develop specialized industry tools',
      'Create global academic partnerships',
      'Revolutionize education worldwide'
    ]);
  }

  private createAnniversaryEvent(
    years: number,
    name: string,
    specialFeatures: string[],
    greetings: string[],
    achievements: string[],
    futureGoals: string[]
  ) {
    const anniversaryDate = new Date(this.companyFoundedDate);
    anniversaryDate.setFullYear(this.companyFoundedDate.getFullYear() + years);
    
    const event: AnniversaryEvent = {
      id: `anniversary-${years}`,
      name,
      description: `Celebrating ${years} years of gunnchos LLC-S innovation and academic excellence!`,
      date: anniversaryDate,
      yearsSince: years,
      specialFeatures,
      greetings,
      achievements,
      futureGoals
    };

    return event;
  }

  private updateCurrentAnniversary() {
    const now = new Date();
    const yearsSince = now.getFullYear() - this.companyFoundedDate.getFullYear();
    
    // Check if we're in the anniversary month (October)
    if (now.getMonth() === 9) { // October is month 9 (0-indexed)
      this.currentAnniversary = {
        id: `anniversary-${yearsSince}`,
        name: `🎉 ${yearsSince}${this.getOrdinalSuffix(yearsSince)} Anniversary Celebration`,
        description: `Celebrating ${yearsSince} years of gunnchos LLC-S innovation and academic excellence!`,
        date: new Date(this.companyFoundedDate.getFullYear() + yearsSince, 9, 23),
        yearsSince,
        specialFeatures: [
          `🎉 **${yearsSince} Years Strong!** - Celebrating decades of innovation!`,
          '🚀 **Rocket Launch Study Mode** - Blast off to academic success!',
          '🌟 **Star Student Recognition** - Celebrating academic achievements!',
          '🎯 **Precision Study Sessions** - Laser-focused learning!'
        ],
        greetings: [
          `🎉 **Happy ${yearsSince}${this.getOrdinalSuffix(yearsSince)} Anniversary gunnchos LLC-S!** 🎉`,
          `🚀 **${yearsSince} years of innovation!** Let's celebrate with stellar study sessions!`,
          '🌟 **From startup to star!** Your academic journey is our success story!',
          '🎯 **Years of excellence!** Let\'s make this year your best academic year yet!'
        ],
        achievements: [
          `Founded gunnchos LLC-S on October 23, 2022`,
          `Developed gunnchAI3k - The ultimate study companion`,
          `Created innovative study tools and AI assistance`,
          `Built a community of academic achievers`,
          `Launched multiple successful projects and collaborations`
        ],
        futureGoals: [
          'Continue revolutionizing education technology',
          'Expand AI-powered study assistance globally',
          'Develop next-generation learning tools',
          'Build stronger academic communities',
          'Create more innovative solutions for students'
        ]
      };
    } else {
      this.currentAnniversary = null;
    }
  }

  private getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  public getCurrentAnniversary(): AnniversaryEvent | null {
    this.updateCurrentAnniversary();
    return this.currentAnniversary;
  }

  public getAnniversaryGreeting(): string {
    const anniversary = this.getCurrentAnniversary();
    if (!anniversary) {
      return '🌟 **gunnchAI3k is here!** Ready to help you study! 🌟';
    }

    const randomGreeting = anniversary.greetings[Math.floor(Math.random() * anniversary.greetings.length)];
    return `${randomGreeting}\n\n${anniversary.description}\n\n🎯 **Special Anniversary Features:**\n${anniversary.specialFeatures.map(feature => `• ${feature}`).join('\n')}`;
  }

  public getAnniversaryAchievements(): string[] {
    const anniversary = this.getCurrentAnniversary();
    return anniversary ? anniversary.achievements : [];
  }

  public getAnniversaryFutureGoals(): string[] {
    const anniversary = this.getCurrentAnniversary();
    return anniversary ? anniversary.futureGoals : [];
  }

  public isAnniversaryActive(): boolean {
    return this.getCurrentAnniversary() !== null;
  }

  public getDaysUntilNextAnniversary(): number {
    const now = new Date();
    const nextAnniversary = new Date(now.getFullYear(), 9, 23); // October 23
    
    if (nextAnniversary < now) {
      nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
    }
    
    const diffTime = nextAnniversary.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public getAnniversaryCountdown(): string {
    const days = this.getDaysUntilNextAnniversary();
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    
    if (days === 0) {
      return '🎉 **TODAY IS THE ANNIVERSARY!** 🎉\n\nLet\'s celebrate gunnchos LLC-S!';
    } else if (days <= 30) {
      return `🎉 **${days} days until the next anniversary!** 🎉\n\nGet ready to celebrate!`;
    } else {
      return `📅 **${years} years and ${remainingDays} days until the next anniversary!** 📅\n\nMark your calendar!`;
    }
  }
}
