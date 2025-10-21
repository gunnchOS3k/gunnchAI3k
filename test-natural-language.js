// Test script for natural language music processing
const { JockieMusicPowers } = require('./src/music/jockie-powers.ts');

// Mock client for testing
const mockClient = {
  guilds: {
    cache: {
      values: () => []
    }
  }
};

const jockie = new JockieMusicPowers(mockClient);

// Test cases
const testCases = [
  "@gunnchAI3k play meet me there by lucki",
  "play juice wrld bandit",
  "put on drake god's plan",
  "start playing some music",
  "queue up some songs"
];

console.log("🧪 Testing Natural Language Music Processing...\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase}"`);
  
  // Test if it's a play command
  const isPlay = jockie.isPlayCommand(testCase.toLowerCase());
  console.log(`  Is play command: ${isPlay}`);
  
  if (isPlay) {
    const query = jockie.extractSongQuery(testCase.toLowerCase());
    console.log(`  Extracted query: "${query}"`);
  }
  
  console.log();
});

console.log("✅ Natural language processing test completed!");

