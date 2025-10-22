import { Client } from 'discord.js';

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  theme: string;
  specialFeatures: string[];
  greetings: string[];
  studyMotivation: string[];
  musicThemes: string[];
}

export class SeasonalEventManager {
  private client: Client;
  private currentEvent: SeasonalEvent | null = null;
  private events: SeasonalEvent[] = [];

  constructor(client: Client) {
    this.client = client;
    this.initializeEvents();
    this.updateCurrentEvent();
  }

  private initializeEvents() {
    // 🎃 Halloween Study Spooktacular (October 1-31)
    this.events.push({
      id: 'halloween-2024',
      name: '🎃 Halloween Study Spooktacular',
      description: 'Spooky study sessions with ghostly motivation!',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-31'),
      theme: 'Halloween',
      specialFeatures: [
        '👻 Ghostly study reminders',
        '🎃 Pumpkin-themed flashcards',
        '🧛 Vampire-level focus sessions',
        '🦇 Bat-winged practice tests'
      ],
      greetings: [
        '🎃 **BOO!** gunnchAI3k is here to spook up your study game!',
        '👻 **Spooky Study Time!** Let\'s make your grades scream with success!',
        '🧛 **Vampire Mode Activated!** I\'ll suck the confusion out of your studies!'
      ],
      studyMotivation: [
        'Don\'t let your grades be a horror story!',
        'Turn your study sessions into a thriller!',
        'Make your midterm performance legendary!'
      ],
      musicThemes: ['spooky', 'halloween', 'thriller', 'monster mash']
    });

    // 🦃 Thanksgiving Gratitude Study (November 1-30)
    this.events.push({
      id: 'thanksgiving-2024',
      name: '🦃 Thanksgiving Gratitude Study',
      description: 'Grateful for knowledge, thankful for success!',
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-11-30'),
      theme: 'Thanksgiving',
      specialFeatures: [
        '🦃 Gratitude study journals',
        '🍂 Autumn-themed study sessions',
        '🥧 Pie-chart practice problems',
        '🦃 Turkey-level focus training'
      ],
      greetings: [
        '🦃 **Gobble Gobble!** Time to feast on knowledge!',
        '🍂 **Autumn Study Mode!** Let\'s harvest some A\'s!',
        '🥧 **Pie-chart Practice!** Let\'s make your grades as sweet as pie!'
      ],
      studyMotivation: [
        'Be grateful for every study session!',
        'Thank yourself for putting in the work!',
        'Your future self will thank you!'
      ],
      musicThemes: ['autumn', 'grateful', 'harvest', 'thanksgiving']
    });

    // 🎄 Christmas Study Wonderland (December 1-31)
    this.events.push({
      id: 'christmas-2024',
      name: '🎄 Christmas Study Wonderland',
      description: 'Making your grades merry and bright!',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-31'),
      theme: 'Christmas',
      specialFeatures: [
        '🎄 Christmas tree study plans',
        '🎁 Gift-wrapped practice tests',
        '❄️ Snowflake flashcards',
        '🦌 Reindeer-powered study sessions'
      ],
      greetings: [
        '🎄 **Ho Ho Ho!** gunnchAI3k is here to make your grades merry!',
        '🎁 **Study Gifts Await!** Let\'s unwrap some knowledge!',
        '❄️ **Winter Wonderland Study!** Your grades will be snow-white perfect!'
      ],
      studyMotivation: [
        'Make your grades as bright as Christmas lights!',
        'Give yourself the gift of knowledge!',
        'Your success is the best present!'
      ],
      musicThemes: ['christmas', 'winter', 'holiday', 'snow']
    });

    // 🌸 Spring Study Bloom (March 1 - May 31)
    this.events.push({
      id: 'spring-2025',
      name: '🌸 Spring Study Bloom',
      description: 'Watch your knowledge bloom like spring flowers!',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-05-31'),
      theme: 'Spring',
      specialFeatures: [
        '🌸 Cherry blossom study sessions',
        '🦋 Butterfly transformation study plans',
        '🌱 Growth mindset flashcards',
        '🐰 Bunny-hop practice tests'
      ],
      greetings: [
        '🌸 **Spring into Action!** Let\'s make your knowledge bloom!',
        '🦋 **Transformation Time!** From caterpillar to butterfly scholar!',
        '🌱 **Growth Season!** Watch your grades grow like spring flowers!'
      ],
      studyMotivation: [
        'Bloom where you study!',
        'Spring into academic success!',
        'Your knowledge is blooming beautifully!'
      ],
      musicThemes: ['spring', 'bloom', 'renewal', 'growth']
    });

    // ☀️ Summer Study Adventure (June 1 - August 31)
    this.events.push({
      id: 'summer-2025',
      name: '☀️ Summer Study Adventure',
      description: 'Hot study sessions for cool results!',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-08-31'),
      theme: 'Summer',
      specialFeatures: [
        '🏖️ Beach-themed study sessions',
        '🌊 Wave-riding practice tests',
        '☀️ Sunshine motivation',
        '🏄‍♂️ Surfing through flashcards'
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
      musicThemes: ['summer', 'beach', 'sunshine', 'vacation']
    });

    // 🎓 Graduation Celebration (May 1-31)
    this.events.push({
      id: 'graduation-2025',
      name: '🎓 Graduation Celebration',
      description: 'Celebrating academic achievements!',
      startDate: new Date('2025-05-01'),
      endDate: new Date('2025-05-31'),
      theme: 'Graduation',
      specialFeatures: [
        '🎓 Cap and gown study sessions',
        '🏆 Achievement tracking',
        '🎉 Success celebrations',
        '📜 Diploma practice tests'
      ],
      greetings: [
        '🎓 **Graduation Season!** Let\'s celebrate your achievements!',
        '🏆 **Success Celebration!** Your hard work is paying off!',
        '📜 **Diploma Dreams!** Let\'s make them reality!'
      ],
      studyMotivation: [
        'You\'re almost at the finish line!',
        'Your graduation cap is waiting!',
        'Success is your graduation gift!'
      ],
      musicThemes: ['graduation', 'celebration', 'achievement', 'success']
    });
  }

  private updateCurrentEvent() {
    const now = new Date();
    this.currentEvent = this.events.find(event => 
      now >= event.startDate && now <= event.endDate
    ) || null;
  }

  public getCurrentEvent(): SeasonalEvent | null {
    this.updateCurrentEvent();
    return this.currentEvent;
  }

  public getSeasonalGreeting(): string {
    const event = this.getCurrentEvent();
    if (!event) {
      return '🌟 **gunnchAI3k is here!** Ready to help you study! 🌟';
    }

    const randomGreeting = event.greetings[Math.floor(Math.random() * event.greetings.length)];
    return `${randomGreeting}\n\n${event.description}\n\n🎯 **Special Features:**\n${event.specialFeatures.map(feature => `• ${feature}`).join('\n')}`;
  }

  public getSeasonalStudyMotivation(): string {
    const event = this.getCurrentEvent();
    if (!event) {
      return 'Keep studying hard! Your success is inevitable!';
    }

    const randomMotivation = event.studyMotivation[Math.floor(Math.random() * event.studyMotivation.length)];
    return `🎯 **${event.name} Motivation:** ${randomMotivation}`;
  }

  public getSeasonalMusicThemes(): string[] {
    const event = this.getCurrentEvent();
    return event ? event.musicThemes : ['study', 'focus', 'motivation'];
  }

  public isEventActive(eventId: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;
    
    const now = new Date();
    return now >= event.startDate && now <= event.endDate;
  }

  public getUpcomingEvents(): SeasonalEvent[] {
    const now = new Date();
    return this.events
      .filter(event => event.startDate > now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 3); // Next 3 events
  }
}
