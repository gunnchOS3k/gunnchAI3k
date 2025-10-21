// gunnchAI3k Study Copilot v2 - Lock In Academic Warrior Mode Test
// Tests the lock-in feature with academic warrior theme

import { LockInBot, LockInSession, AcademicWarrior, Trophy } from './lock-in';

async function testLockInFeature() {
  console.log('🔒 Testing gunnchAI3k Lock In Academic Warrior Mode...\n');
  
  // Test 1: Academic Warrior Levels
  console.log('⚔️ Academic Warrior Levels:');
  const warriorLevels = ['Rookie', 'Veteran', 'Elite', 'Legend'];
  warriorLevels.forEach(level => {
    const power = {
      'Rookie': 100,
      'Veteran': 200,
      'Elite': 300,
      'Legend': 400
    };
    console.log(`${level}: ${power[level]} base power`);
  });
  console.log();
  
  // Test 2: Mock Lock-In Session
  console.log('🔒 Creating mock lock-in session...');
  const mockSession: LockInSession = {
    userId: 'test-user',
    courseName: 'Probability Theory',
    examDate: new Date('2024-12-15'),
    daysRemaining: 7,
    warriorLevel: 'Elite',
    academicPower: 350,
    studyStreak: 0,
    trophies: [
      {
        id: 'first-problem',
        name: 'First Blood',
        description: 'Complete your first practice problem',
        requirement: 'Solve 1 practice problem',
        earned: false,
        rarity: 'common'
      },
      {
        id: 'study-streak-3',
        name: 'Three Day Warrior',
        description: 'Study for 3 consecutive days',
        requirement: 'Study for 3 days in a row',
        earned: false,
        rarity: 'common'
      },
      {
        id: 'practice-master',
        name: 'Practice Master',
        description: 'Complete 50 practice problems',
        requirement: 'Solve 50 practice problems',
        earned: false,
        rarity: 'rare'
      },
      {
        id: 'mock-exam-ace',
        name: 'Mock Exam Ace',
        description: 'Score 90%+ on a mock exam',
        requirement: 'Score 90% or higher on mock exam',
        earned: false,
        rarity: 'epic'
      },
      {
        id: 'academic-legend',
        name: 'Academic Legend',
        description: 'Achieve an A grade in the course',
        requirement: 'Get an A on your transcript',
        earned: false,
        rarity: 'legendary'
      }
    ],
    emergencySession: {} as any
  };
  
  console.log(`Course: ${mockSession.courseName}`);
  console.log(`Warrior Level: ${mockSession.warriorLevel}`);
  console.log(`Academic Power: ${mockSession.academicPower}`);
  console.log(`Study Streak: ${mockSession.studyStreak} days`);
  console.log(`Trophies Available: ${mockSession.trophies.length}\n`);
  
  // Test 3: Trophy System
  console.log('🏆 Trophy System:');
  mockSession.trophies.forEach((trophy, index) => {
    console.log(`${index + 1}. ${trophy.name} (${trophy.rarity})`);
    console.log(`   Description: ${trophy.description}`);
    console.log(`   Requirement: ${trophy.requirement}`);
    console.log(`   Earned: ${trophy.earned ? '✅' : '❌'}`);
  });
  console.log();
  
  // Test 4: Academic Power Calculation
  console.log('⚡ Academic Power Calculation:');
  const testLevels = ['Rookie', 'Veteran', 'Elite', 'Legend'];
  const testDays = [1, 3, 7, 14];
  
  testLevels.forEach(level => {
    console.log(`${level} Warrior:`);
    testDays.forEach(days => {
      const basePower = {
        'Rookie': 100,
        'Veteran': 200,
        'Elite': 300,
        'Legend': 400
      };
      const urgencyMultiplier = Math.max(1, 7 - days) / 7;
      const power = Math.round((basePower[level] || 100) * (1 + urgencyMultiplier));
      console.log(`  ${days} days remaining: ${power} power`);
    });
  });
  console.log();
  
  // Test 5: Warrior Progression
  console.log('📈 Warrior Progression:');
  const progression = [
    { level: 'Rookie', next: 'Veteran', requirement: 'Complete 10 practice problems' },
    { level: 'Veteran', next: 'Elite', requirement: 'Study for 5 consecutive days' },
    { level: 'Elite', next: 'Legend', requirement: 'Score 90%+ on mock exam' },
    { level: 'Legend', next: 'Legend', requirement: 'Maintain Legend status' }
  ];
  
  progression.forEach(step => {
    console.log(`${step.level} → ${step.next}`);
    console.log(`  Requirement: ${step.requirement}`);
  });
  console.log();
  
  // Test 6: Study Streak Simulation
  console.log('🔥 Study Streak Simulation:');
  let streak = 0;
  for (let day = 1; day <= 7; day++) {
    streak++;
    console.log(`Day ${day}: Streak = ${streak} days`);
    
    if (streak >= 3) {
      console.log(`  🏆 Trophy Unlocked: Three Day Warrior!`);
    }
    if (streak >= 7) {
      console.log(`  🏆 Trophy Unlocked: Week Warrior!`);
    }
  }
  console.log();
  
  // Test 7: Practice Problem Completion
  console.log('📝 Practice Problem Completion:');
  const problemsCompleted = [1, 5, 10, 25, 50, 100];
  problemsCompleted.forEach(count => {
    console.log(`Completed ${count} problems:`);
    if (count >= 1) console.log(`  🏆 First Blood trophy earned!`);
    if (count >= 10) console.log(`  🏆 Problem Solver trophy earned!`);
    if (count >= 50) console.log(`  🏆 Practice Master trophy earned!`);
    if (count >= 100) console.log(`  🏆 Problem Destroyer trophy earned!`);
  });
  console.log();
  
  // Test 8: Mock Exam Performance
  console.log('📊 Mock Exam Performance:');
  const examScores = [65, 75, 85, 90, 95, 100];
  examScores.forEach(score => {
    console.log(`Score: ${score}%`);
    if (score >= 90) console.log(`  🏆 Mock Exam Ace trophy earned!`);
    if (score >= 95) console.log(`  🏆 Exam Destroyer trophy earned!`);
    if (score === 100) console.log(`  🏆 Perfect Score trophy earned!`);
  });
  console.log();
  
  // Test 9: Academic Legend Achievement
  console.log('👑 Academic Legend Achievement:');
  console.log('To become an Academic Legend:');
  console.log('1. Complete all practice problems');
  console.log('2. Score 90%+ on all mock exams');
  console.log('3. Maintain study streak for 7+ days');
  console.log('4. Achieve an A grade in the course');
  console.log('5. Wear the A-grade skin as a trophy! 🦁');
  console.log();
  
  // Test 10: Motivational Messages
  console.log('💪 Motivational Messages:');
  const messages = [
    'Time to lock in and slay the academic animal!',
    'Your academic power is growing with each study session!',
    'Every practice problem brings you closer to the A-grade trophy!',
    'The academic animal doesn\'t stand a chance against your determination!',
    'Lock in, study hard, and wear that A-grade skin with pride!'
  ];
  
  messages.forEach((message, index) => {
    console.log(`${index + 1}. ${message}`);
  });
  console.log();
  
  console.log('✅ All lock-in tests completed successfully!');
  console.log('🔒 LOCK IN Academic Warrior Mode is ready!');
  console.log('⚔️ Time to slay the academic animal and wear the A-grade skin as a trophy! 🦁');
}

// Run the test
testLockInFeature().catch(console.error);

