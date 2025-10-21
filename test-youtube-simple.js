// Simple test for YouTube URL detection
console.log('🧪 Testing YouTube URL detection...');

// Test YouTube URL patterns
const testUrls = [
  'https://www.youtube.com/watch?v=O_hMolhadQ8',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://youtube.com/watch?v=abc123',
  'https://www.youtube.com/embed/xyz789',
  'meet me there by lucki',
  'play some music'
];

const youtubePatterns = [
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/,
  /^https?:\/\/(www\.)?youtube\.com\/embed\//,
  /^https?:\/\/(www\.)?youtube\.com\/v\//
];

function isYouTubeUrl(url) {
  return youtubePatterns.some(pattern => pattern.test(url));
}

function extractYouTubeVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

console.log('\n📝 Testing URLs:');
testUrls.forEach((url, index) => {
  console.log(`\n${index + 1}. "${url}"`);
  const isYouTube = isYouTubeUrl(url);
  console.log(`   ✅ YouTube URL: ${isYouTube}`);
  
  if (isYouTube) {
    const videoId = extractYouTubeVideoId(url);
    console.log(`   🎬 Video ID: ${videoId}`);
  }
});

console.log('\n🎉 YouTube URL detection test completed!');

