/**
 * gunnchAI3k Performance Engine - Rust Core
 * High-performance backend for gunnchAI3k Discord bot
 */

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, RwLock};
use serde::{Deserialize, Serialize};
use anyhow::Result;
use tracing::{info, warn, error, debug};

/// High-performance message processing engine
pub struct MessageProcessor {
    cache: Arc<RwLock<HashMap<String, CachedMessage>>>,
    rate_limiter: Arc<Mutex<RateLimiter>>,
    analytics: Arc<Mutex<AnalyticsEngine>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedMessage {
    pub id: String,
    pub content: String,
    pub author_id: String,
    pub channel_id: String,
    pub timestamp: u64,
    pub processed: bool,
    pub metadata: MessageMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageMetadata {
    pub sentiment: f64,
    pub intent: String,
    pub entities: Vec<String>,
    pub priority: u8,
    pub processing_time: Duration,
}

#[derive(Debug, Clone)]
pub struct RateLimiter {
    limits: HashMap<String, RateLimit>,
    global_limit: u32,
    window_size: Duration,
}

#[derive(Debug, Clone)]
pub struct RateLimit {
    pub count: u32,
    pub reset_time: Instant,
    pub max_requests: u32,
}

#[derive(Debug, Clone)]
pub struct AnalyticsEngine {
    pub message_count: u64,
    pub processing_times: Vec<Duration>,
    pub error_count: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
}

impl MessageProcessor {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            rate_limiter: Arc::new(Mutex::new(RateLimiter::new())),
            analytics: Arc::new(Mutex::new(AnalyticsEngine::new())),
        }
    }

    /// Process message with high-performance optimizations
    pub async fn process_message(&self, message: &str, author_id: &str, channel_id: &str) -> Result<ProcessedMessage> {
        let start_time = Instant::now();
        
        // Check rate limiting
        if !self.check_rate_limit(author_id).await {
            return Err(anyhow::anyhow!("Rate limit exceeded"));
        }

        // Check cache first
        let cache_key = format!("{}:{}", author_id, message);
        if let Some(cached) = self.get_from_cache(&cache_key).await {
            self.update_analytics(true, start_time.elapsed()).await;
            return Ok(cached);
        }

        // Process message
        let processed = self.process_message_internal(message, author_id, channel_id).await?;
        
        // Cache result
        self.cache_result(&cache_key, &processed).await;
        
        // Update analytics
        self.update_analytics(false, start_time.elapsed()).await;
        
        Ok(processed)
    }

    async fn process_message_internal(&self, message: &str, author_id: &str, channel_id: &str) -> Result<ProcessedMessage> {
        // High-performance message analysis
        let sentiment = self.analyze_sentiment(message).await?;
        let intent = self.extract_intent(message).await?;
        let entities = self.extract_entities(message).await?;
        let priority = self.calculate_priority(message, &intent).await?;

        Ok(ProcessedMessage {
            id: uuid::Uuid::new_v4().to_string(),
            content: message.to_string(),
            author_id: author_id.to_string(),
            channel_id: channel_id.to_string(),
            sentiment,
            intent,
            entities,
            priority,
            processing_time: Duration::from_millis(0), // Will be set by caller
            response: self.generate_response(message, &intent, &entities).await?,
        })
    }

    async fn analyze_sentiment(&self, message: &str) -> Result<f64> {
        // High-performance sentiment analysis using parallel processing
        let words: Vec<&str> = message.split_whitespace().collect();
        let sentiment_scores: Vec<f64> = words.par_iter()
            .map(|word| self.get_word_sentiment(word))
            .collect();
        
        let avg_sentiment = sentiment_scores.iter().sum::<f64>() / sentiment_scores.len() as f64;
        Ok(avg_sentiment)
    }

    fn get_word_sentiment(&self, word: &str) -> f64 {
        // Simplified sentiment analysis - in production, use a proper NLP library
        let positive_words = ["good", "great", "awesome", "amazing", "love", "like", "happy", "excited"];
        let negative_words = ["bad", "terrible", "awful", "hate", "angry", "sad", "disappointed"];
        
        let word_lower = word.to_lowercase();
        
        if positive_words.contains(&word_lower.as_str()) {
            1.0
        } else if negative_words.contains(&word_lower.as_str()) {
            -1.0
        } else {
            0.0
        }
    }

    async fn extract_intent(&self, message: &str) -> Result<String> {
        // High-performance intent extraction
        let message_lower = message.to_lowercase();
        
        if message_lower.contains("help") || message_lower.contains("?") {
            Ok("help".to_string())
        } else if message_lower.contains("play") || message_lower.contains("music") {
            Ok("music".to_string())
        } else if message_lower.contains("study") || message_lower.contains("learn") {
            Ok("study".to_string())
        } else if message_lower.contains("joke") || message_lower.contains("funny") {
            Ok("entertainment".to_string())
        } else {
            Ok("general".to_string())
        }
    }

    async fn extract_entities(&self, message: &str) -> Result<Vec<String>> {
        // High-performance entity extraction
        let mut entities = Vec::new();
        let words: Vec<&str> = message.split_whitespace().collect();
        
        for word in words {
            if word.len() > 3 && word.chars().all(|c| c.is_alphabetic()) {
                entities.push(word.to_string());
            }
        }
        
        Ok(entities)
    }

    async fn calculate_priority(&self, message: &str, intent: &str) -> Result<u8> {
        // Priority calculation based on content and intent
        let mut priority = 5; // Default priority
        
        if intent == "help" {
            priority = 8;
        } else if intent == "music" {
            priority = 6;
        } else if intent == "study" {
            priority = 9;
        }
        
        if message.contains("@") {
            priority += 2;
        }
        
        if message.contains("urgent") || message.contains("emergency") {
            priority = 10;
        }
        
        Ok(priority.min(10))
    }

    async fn generate_response(&self, message: &str, intent: &str, entities: &[String]) -> Result<String> {
        // High-performance response generation
        match intent {
            "help" => Ok("I'm here to help! What do you need assistance with?".to_string()),
            "music" => Ok("Let me help you with music! What would you like to play?".to_string()),
            "study" => Ok("Time to study! I can help you with flashcards, practice tests, and more!".to_string()),
            "entertainment" => Ok("Let's have some fun! I can tell jokes, play games, or help with music!".to_string()),
            _ => Ok("I'm here and ready to help! What can I do for you?".to_string()),
        }
    }

    async fn check_rate_limit(&self, author_id: &str) -> bool {
        let mut limiter = self.rate_limiter.lock().await;
        limiter.check_limit(author_id)
    }

    async fn get_from_cache(&self, key: &str) -> Option<ProcessedMessage> {
        let cache = self.cache.read().await;
        cache.get(key).map(|cached| ProcessedMessage {
            id: cached.id.clone(),
            content: cached.content.clone(),
            author_id: cached.author_id.clone(),
            channel_id: cached.channel_id.clone(),
            sentiment: cached.metadata.sentiment,
            intent: cached.metadata.intent.clone(),
            entities: cached.metadata.entities.clone(),
            priority: cached.metadata.priority,
            processing_time: cached.metadata.processing_time,
            response: "Cached response".to_string(), // Simplified for demo
        })
    }

    async fn cache_result(&self, key: &str, processed: &ProcessedMessage) {
        let mut cache = self.cache.write().await;
        cache.insert(key.to_string(), CachedMessage {
            id: processed.id.clone(),
            content: processed.content.clone(),
            author_id: processed.author_id.clone(),
            channel_id: processed.channel_id.clone(),
            timestamp: chrono::Utc::now().timestamp() as u64,
            processed: true,
            metadata: MessageMetadata {
                sentiment: processed.sentiment,
                intent: processed.intent.clone(),
                entities: processed.entities.clone(),
                priority: processed.priority,
                processing_time: processed.processing_time,
            },
        });
    }

    async fn update_analytics(&self, cache_hit: bool, processing_time: Duration) {
        let mut analytics = self.analytics.lock().await;
        analytics.message_count += 1;
        analytics.processing_times.push(processing_time);
        
        if cache_hit {
            analytics.cache_hits += 1;
        } else {
            analytics.cache_misses += 1;
        }
    }

    pub async fn get_analytics(&self) -> AnalyticsEngine {
        self.analytics.lock().await.clone()
    }

    pub async fn clear_cache(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedMessage {
    pub id: String,
    pub content: String,
    pub author_id: String,
    pub channel_id: String,
    pub sentiment: f64,
    pub intent: String,
    pub entities: Vec<String>,
    pub priority: u8,
    pub processing_time: Duration,
    pub response: String,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            limits: HashMap::new(),
            global_limit: 100,
            window_size: Duration::from_secs(60),
        }
    }

    pub fn check_limit(&mut self, user_id: &str) -> bool {
        let now = Instant::now();
        let limit = self.limits.entry(user_id.to_string()).or_insert(RateLimit {
            count: 0,
            reset_time: now + self.window_size,
            max_requests: 10,
        });

        if now > limit.reset_time {
            limit.count = 0;
            limit.reset_time = now + self.window_size;
        }

        if limit.count < limit.max_requests {
            limit.count += 1;
            true
        } else {
            false
        }
    }
}

impl AnalyticsEngine {
    pub fn new() -> Self {
        Self {
            message_count: 0,
            processing_times: Vec::new(),
            error_count: 0,
            cache_hits: 0,
            cache_misses: 0,
        }
    }

    pub fn get_average_processing_time(&self) -> Duration {
        if self.processing_times.is_empty() {
            Duration::from_millis(0)
        } else {
            let total: Duration = self.processing_times.iter().sum();
            total / self.processing_times.len() as u32
        }
    }

    pub fn get_cache_hit_rate(&self) -> f64 {
        let total = self.cache_hits + self.cache_misses;
        if total == 0 {
            0.0
        } else {
            self.cache_hits as f64 / total as f64
        }
    }
}

/// High-performance study system
pub struct StudyEngine {
    flashcards: Arc<RwLock<HashMap<String, Flashcard>>>,
    practice_tests: Arc<RwLock<HashMap<String, PracticeTest>>>,
    user_progress: Arc<RwLock<HashMap<String, UserProgress>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flashcard {
    pub id: String,
    pub question: String,
    pub answer: String,
    pub subject: String,
    pub difficulty: u8,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PracticeTest {
    pub id: String,
    pub title: String,
    pub questions: Vec<Question>,
    pub subject: String,
    pub difficulty: u8,
    pub time_limit: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Question {
    pub id: String,
    pub question: String,
    pub options: Vec<String>,
    pub correct_answer: u8,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProgress {
    pub user_id: String,
    pub subject: String,
    pub flashcards_studied: u32,
    pub tests_completed: u32,
    pub average_score: f64,
    pub last_studied: u64,
}

impl StudyEngine {
    pub fn new() -> Self {
        Self {
            flashcards: Arc::new(RwLock::new(HashMap::new())),
            practice_tests: Arc::new(RwLock::new(HashMap::new())),
            user_progress: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_flashcard(&self, question: &str, answer: &str, subject: &str, difficulty: u8) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let flashcard = Flashcard {
            id: id.clone(),
            question: question.to_string(),
            answer: answer.to_string(),
            subject: subject.to_string(),
            difficulty,
            created_at: chrono::Utc::now().timestamp() as u64,
        };

        let mut flashcards = self.flashcards.write().await;
        flashcards.insert(id.clone(), flashcard);
        
        Ok(id)
    }

    pub async fn get_flashcards_by_subject(&self, subject: &str) -> Result<Vec<Flashcard>> {
        let flashcards = self.flashcards.read().await;
        Ok(flashcards.values()
            .filter(|card| card.subject == subject)
            .cloned()
            .collect())
    }

    pub async fn create_practice_test(&self, title: &str, questions: Vec<Question>, subject: &str, difficulty: u8) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let test = PracticeTest {
            id: id.clone(),
            title: title.to_string(),
            questions,
            subject: subject.to_string(),
            difficulty,
            time_limit: 1800, // 30 minutes
        };

        let mut tests = self.practice_tests.write().await;
        tests.insert(id.clone(), test);
        
        Ok(id)
    }

    pub async fn get_practice_test(&self, test_id: &str) -> Result<Option<PracticeTest>> {
        let tests = self.practice_tests.read().await;
        Ok(tests.get(test_id).cloned())
    }

    pub async fn update_user_progress(&self, user_id: &str, subject: &str, score: f64) -> Result<()> {
        let mut progress = self.user_progress.write().await;
        let key = format!("{}:{}", user_id, subject);
        
        let user_progress = progress.entry(key).or_insert(UserProgress {
            user_id: user_id.to_string(),
            subject: subject.to_string(),
            flashcards_studied: 0,
            tests_completed: 0,
            average_score: 0.0,
            last_studied: chrono::Utc::now().timestamp() as u64,
        });

        user_progress.tests_completed += 1;
        user_progress.average_score = (user_progress.average_score + score) / 2.0;
        user_progress.last_studied = chrono::Utc::now().timestamp() as u64;
        
        Ok(())
    }
}

/// High-performance music integration system
pub struct MusicEngine {
    spotify_client: Arc<Mutex<Option<SpotifyClient>>>,
    apple_music_client: Arc<Mutex<Option<AppleMusicClient>>>,
    playlists: Arc<RwLock<HashMap<String, Playlist>>>,
    current_queue: Arc<Mutex<Vec<Song>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyClient {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppleMusicClient {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub description: String,
    pub songs: Vec<Song>,
    pub created_by: String,
    pub created_at: u64,
    pub is_public: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: u32,
    pub url: String,
    pub source: MusicSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MusicSource {
    Spotify,
    AppleMusic,
    YouTube,
    Local,
}

impl MusicEngine {
    pub fn new() -> Self {
        Self {
            spotify_client: Arc::new(Mutex::new(None)),
            apple_music_client: Arc::new(Mutex::new(None)),
            playlists: Arc::new(RwLock::new(HashMap::new())),
            current_queue: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn authenticate_spotify(&self, code: &str) -> Result<()> {
        // Spotify OAuth implementation
        let client = reqwest::Client::new();
        let params = [
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", "http://localhost:3000/callback"),
            ("client_id", "your_spotify_client_id"),
            ("client_secret", "your_spotify_client_secret"),
        ];

        let response = client
            .post("https://accounts.spotify.com/api/token")
            .form(&params)
            .send()
            .await?;

        let token_response: serde_json::Value = response.json().await?;
        
        let spotify_client = SpotifyClient {
            access_token: token_response["access_token"].as_str().unwrap().to_string(),
            refresh_token: token_response["refresh_token"].as_str().unwrap().to_string(),
            expires_at: chrono::Utc::now().timestamp() as u64 + token_response["expires_in"].as_u64().unwrap(),
        };

        let mut client_guard = self.spotify_client.lock().await;
        *client_guard = Some(spotify_client);
        
        Ok(())
    }

    pub async fn authenticate_apple_music(&self, code: &str) -> Result<()> {
        // Apple Music OAuth implementation
        let client = reqwest::Client::new();
        let params = [
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", "http://localhost:3000/callback"),
            ("client_id", "your_apple_music_client_id"),
            ("client_secret", "your_apple_music_client_secret"),
        ];

        let response = client
            .post("https://appleid.apple.com/auth/token")
            .form(&params)
            .send()
            .await?;

        let token_response: serde_json::Value = response.json().await?;
        
        let apple_music_client = AppleMusicClient {
            access_token: token_response["access_token"].as_str().unwrap().to_string(),
            refresh_token: token_response["refresh_token"].as_str().unwrap().to_string(),
            expires_at: chrono::Utc::now().timestamp() as u64 + token_response["expires_in"].as_u64().unwrap(),
        };

        let mut client_guard = self.apple_music_client.lock().await;
        *client_guard = Some(apple_music_client);
        
        Ok(())
    }

    pub async fn create_playlist(&self, name: &str, description: &str, created_by: &str) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let playlist = Playlist {
            id: id.clone(),
            name: name.to_string(),
            description: description.to_string(),
            songs: Vec::new(),
            created_by: created_by.to_string(),
            created_at: chrono::Utc::now().timestamp() as u64,
            is_public: false,
        };

        let mut playlists = self.playlists.write().await;
        playlists.insert(id.clone(), playlist);
        
        Ok(id)
    }

    pub async fn add_song_to_playlist(&self, playlist_id: &str, song: Song) -> Result<()> {
        let mut playlists = self.playlists.write().await;
        if let Some(playlist) = playlists.get_mut(playlist_id) {
            playlist.songs.push(song);
        }
        Ok(())
    }

    pub async fn get_playlist(&self, playlist_id: &str) -> Result<Option<Playlist>> {
        let playlists = self.playlists.read().await;
        Ok(playlists.get(playlist_id).cloned())
    }

    pub async fn search_spotify(&self, query: &str) -> Result<Vec<Song>> {
        let client_guard = self.spotify_client.lock().await;
        if let Some(client) = client_guard.as_ref() {
            let spotify_client = reqwest::Client::new();
            let response = spotify_client
                .get("https://api.spotify.com/v1/search")
                .query(&[("q", query), ("type", "track")])
                .header("Authorization", format!("Bearer {}", client.access_token))
                .send()
                .await?;

            let search_response: serde_json::Value = response.json().await?;
            let tracks = search_response["tracks"]["items"].as_array().unwrap();
            
            let songs: Vec<Song> = tracks.iter().map(|track| Song {
                id: track["id"].as_str().unwrap().to_string(),
                title: track["name"].as_str().unwrap().to_string(),
                artist: track["artists"][0]["name"].as_str().unwrap().to_string(),
                album: track["album"]["name"].as_str().unwrap().to_string(),
                duration: track["duration_ms"].as_u64().unwrap() as u32,
                url: track["external_urls"]["spotify"].as_str().unwrap().to_string(),
                source: MusicSource::Spotify,
            }).collect();

            Ok(songs)
        } else {
            Err(anyhow::anyhow!("Spotify not authenticated"))
        }
    }

    pub async fn search_apple_music(&self, query: &str) -> Result<Vec<Song>> {
        let client_guard = self.apple_music_client.lock().await;
        if let Some(client) = client_guard.as_ref() {
            let apple_music_client = reqwest::Client::new();
            let response = apple_music_client
                .get("https://api.music.apple.com/v1/catalog/us/search")
                .query(&[("term", query), ("types", "songs")])
                .header("Authorization", format!("Bearer {}", client.access_token))
                .send()
                .await?;

            let search_response: serde_json::Value = response.json().await?;
            let tracks = search_response["results"]["songs"]["data"].as_array().unwrap();
            
            let songs: Vec<Song> = tracks.iter().map(|track| Song {
                id: track["id"].as_str().unwrap().to_string(),
                title: track["attributes"]["name"].as_str().unwrap().to_string(),
                artist: track["attributes"]["artistName"].as_str().unwrap().to_string(),
                album: track["attributes"]["albumName"].as_str().unwrap().to_string(),
                duration: track["attributes"]["durationInMillis"].as_u64().unwrap() as u32,
                url: track["attributes"]["url"].as_str().unwrap().to_string(),
                source: MusicSource::AppleMusic,
            }).collect();

            Ok(songs)
        } else {
            Err(anyhow::anyhow!("Apple Music not authenticated"))
        }
    }

    pub async fn add_to_queue(&self, song: Song) -> Result<()> {
        let mut queue = self.current_queue.lock().await;
        queue.push(song);
        Ok(())
    }

    pub async fn get_queue(&self) -> Result<Vec<Song>> {
        let queue = self.current_queue.lock().await;
        Ok(queue.clone())
    }

    pub async fn clear_queue(&self) -> Result<()> {
        let mut queue = self.current_queue.lock().await;
        queue.clear();
        Ok(())
    }
}

/// High-performance analytics and monitoring
pub struct PerformanceMonitor {
    metrics: Arc<Mutex<PerformanceMetrics>>,
    alerts: Arc<Mutex<Vec<PerformanceAlert>>>,
}

#[derive(Debug, Clone)]
pub struct PerformanceMetrics {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub message_processing_rate: f64,
    pub average_response_time: Duration,
    pub error_rate: f64,
    pub cache_hit_rate: f64,
}

#[derive(Debug, Clone)]
pub struct PerformanceAlert {
    pub id: String,
    pub severity: AlertSeverity,
    pub message: String,
    pub timestamp: u64,
    pub resolved: bool,
}

#[derive(Debug, Clone)]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl PerformanceMonitor {
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(Mutex::new(PerformanceMetrics {
                cpu_usage: 0.0,
                memory_usage: 0.0,
                message_processing_rate: 0.0,
                average_response_time: Duration::from_millis(0),
                error_rate: 0.0,
                cache_hit_rate: 0.0,
            })),
            alerts: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn update_metrics(&self, metrics: PerformanceMetrics) -> Result<()> {
        let mut current_metrics = self.metrics.lock().await;
        *current_metrics = metrics;
        
        // Check for performance issues
        self.check_performance_alerts(&metrics).await;
        
        Ok(())
    }

    async fn check_performance_alerts(&self, metrics: &PerformanceMetrics) {
        let mut alerts = self.alerts.lock().await;
        
        if metrics.cpu_usage > 80.0 {
            alerts.push(PerformanceAlert {
                id: uuid::Uuid::new_v4().to_string(),
                severity: AlertSeverity::High,
                message: format!("High CPU usage: {}%", metrics.cpu_usage),
                timestamp: chrono::Utc::now().timestamp() as u64,
                resolved: false,
            });
        }
        
        if metrics.memory_usage > 90.0 {
            alerts.push(PerformanceAlert {
                id: uuid::Uuid::new_v4().to_string(),
                severity: AlertSeverity::Critical,
                message: format!("High memory usage: {}%", metrics.memory_usage),
                timestamp: chrono::Utc::now().timestamp() as u64,
                resolved: false,
            });
        }
        
        if metrics.error_rate > 5.0 {
            alerts.push(PerformanceAlert {
                id: uuid::Uuid::new_v4().to_string(),
                severity: AlertSeverity::Medium,
                message: format!("High error rate: {}%", metrics.error_rate),
                timestamp: chrono::Utc::now().timestamp() as u64,
                resolved: false,
            });
        }
    }

    pub async fn get_metrics(&self) -> PerformanceMetrics {
        self.metrics.lock().await.clone()
    }

    pub async fn get_alerts(&self) -> Vec<PerformanceAlert> {
        self.alerts.lock().await.clone()
    }
}

// Export the main structs for use in Node.js
pub use MessageProcessor;
pub use StudyEngine;
pub use MusicEngine;
pub use PerformanceMonitor;

