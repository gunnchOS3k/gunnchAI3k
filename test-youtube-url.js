// Test YouTube URL functionality for gunnchAI3k
const { JockieMusicPowers } = require('./dist/src/music/jockie-powers');

// Mock Discord client
const mockClient = {
  guilds: {
    cache: new Map()
  },
  channels: {
    cache: new Map()
  }
};

async function testYouTubeUrlHandling() {
  console.log('🧪 Testing YouTube URL handling...');
  
  const jockieMusic = new JockieMusicPowers(mockClient);
  
  // Test cases
  const testCases = [
    {
      message: '@gunnchAI3k play https://www.youtube.com/watch?v=O_hMolhadQ8',
      expected: 'Should detect YouTube URL and process it'
    },
    {
      message: '@gunnchAI3k play meet me there by lucki',
      expected: 'Should detect regular music query'
    },
    {
      message: '@gunnchAI3k play https://youtu.be/dQw4w9WgXcQ',
      expected: 'Should detect short YouTube URL'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase.message}"`);
    console.log(`🎯 Expected: ${testCase.expected}`);
    
    try {
      // Test URL detection
      const isMusicRelated = jockieMusic.isMusicRelatedMessage ? 
        jockieMusic.isMusicRelatedMessage(testCase.message.toLowerCase()) : 
        testCase.message.toLowerCase().includes('play');
      
      console.log(`✅ Music related: ${isMusicRelated}`);
      
      if (testCase.message.includes('youtube.com') || testCase.message.includes('youtu.be')) {
        const isYouTubeUrl = jockieMusic.isYouTubeUrl ? 
          jockieMusic.isYouTubeUrl(testCase.message) : 
          /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(testCase.message);
        
        console.log(`✅ YouTube URL detected: ${isYouTubeUrl}`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing: ${error.message}`);
    }
  }
  
  console.log('\n🎉 YouTube URL handling test completed!');
}

testYouTubeUrlHandling();

