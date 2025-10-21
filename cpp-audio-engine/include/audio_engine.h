#pragma once

#include <memory>
#include <string>
#include <vector>
#include <atomic>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>
#include <functional>

// Forward declarations
struct AVCodecContext;
struct AVFrame;
struct SwrContext;

namespace gunnchai3k {

struct AudioConfig {
    int sample_rate = 48000;
    int channels = 2;
    int bit_depth = 16;
    int buffer_size = 4096;
    int max_latency_ms = 20;
};

struct AudioBuffer {
    std::vector<float> samples;
    size_t channels;
    size_t sample_rate;
    size_t frame_count;
    double timestamp;
};

class VoiceProcessor {
public:
    VoiceProcessor();
    ~VoiceProcessor();
    
    bool initialize(const AudioConfig& config);
    void shutdown();
    
    // Ultra-low latency audio processing
    bool process_audio(const AudioBuffer& input, AudioBuffer& output);
    
    // Voice activity detection
    bool detect_voice_activity(const AudioBuffer& buffer);
    
    // Noise suppression
    void suppress_noise(AudioBuffer& buffer);
    
    // Echo cancellation
    void cancel_echo(AudioBuffer& buffer);
    
    // Automatic gain control
    void apply_agc(AudioBuffer& buffer);

private:
    AudioConfig config_;
    std::atomic<bool> initialized_;
    
    // Voice activity detection
    float voice_threshold_;
    float noise_floor_;
    std::vector<float> energy_history_;
    
    // Noise suppression
    std::vector<float> noise_spectrum_;
    bool noise_profile_learned_;
    
    // Echo cancellation
    std::vector<float> echo_buffer_;
    std::vector<float> reference_buffer_;
};

class OpusEncoder {
public:
    OpusEncoder();
    ~OpusEncoder();
    
    bool initialize(int sample_rate, int channels, int bitrate);
    void shutdown();
    
    // Encode audio to Opus format
    std::vector<uint8_t> encode(const AudioBuffer& buffer);
    
    // Get encoder statistics
    struct Stats {
        double bitrate;
        double compression_ratio;
        size_t packets_encoded;
        double average_latency_ms;
    };
    Stats get_stats() const;

private:
    void* opus_encoder_;
    int sample_rate_;
    int channels_;
    int bitrate_;
    std::vector<int16_t> pcm_buffer_;
    mutable Stats stats_;
};

class FFmpegDecoder {
public:
    FFmpegDecoder();
    ~FFmpegDecoder();
    
    bool initialize();
    void shutdown();
    
    // Decode audio from various formats
    bool decode_audio(const std::string& url, std::vector<AudioBuffer>& buffers);
    bool decode_audio_from_buffer(const std::vector<uint8_t>& data, std::vector<AudioBuffer>& buffers);
    
    // Get audio metadata
    struct AudioInfo {
        int sample_rate;
        int channels;
        int64_t duration_ms;
        std::string format;
    };
    AudioInfo get_audio_info() const;

private:
    AVCodecContext* codec_context_;
    SwrContext* swr_context_;
    AudioInfo audio_info_;
    bool initialized_;
};

class AudioEngine {
public:
    AudioEngine();
    ~AudioEngine();
    
    // Initialize the audio engine
    bool initialize(const AudioConfig& config);
    void shutdown();
    
    // High-performance audio streaming
    bool start_streaming();
    void stop_streaming();
    
    // Audio processing pipeline
    void process_audio_pipeline(const AudioBuffer& input, AudioBuffer& output);
    
    // Voice channel management
    bool join_voice_channel(const std::string& channel_id);
    void leave_voice_channel();
    
    // Audio playback
    bool play_audio(const std::string& url);
    bool play_audio_buffer(const AudioBuffer& buffer);
    void stop_playback();
    
    // Real-time audio effects
    void set_volume(float volume);
    void set_pitch(float pitch);
    void set_speed(float speed);
    
    // Performance monitoring
    struct PerformanceStats {
        double cpu_usage;
        double memory_usage;
        double audio_latency_ms;
        double network_latency_ms;
        size_t dropped_frames;
        size_t buffer_underruns;
    };
    PerformanceStats get_performance_stats() const;
    
    // Event callbacks
    using AudioCallback = std::function<void(const AudioBuffer&)>;
    using ErrorCallback = std::function<void(const std::string&)>;
    
    void set_audio_callback(AudioCallback callback);
    void set_error_callback(ErrorCallback callback);

private:
    AudioConfig config_;
    std::atomic<bool> initialized_;
    std::atomic<bool> streaming_;
    
    // Components
    std::unique_ptr<VoiceProcessor> voice_processor_;
    std::unique_ptr<OpusEncoder> opus_encoder_;
    std::unique_ptr<FFmpegDecoder> ffmpeg_decoder_;
    
    // Audio processing thread
    std::thread audio_thread_;
    std::atomic<bool> audio_thread_running_;
    
    // Audio buffers
    std::queue<AudioBuffer> input_queue_;
    std::queue<AudioBuffer> output_queue_;
    std::mutex queue_mutex_;
    std::condition_variable queue_cv_;
    
    // Performance monitoring
    mutable std::mutex stats_mutex_;
    PerformanceStats stats_;
    
    // Callbacks
    AudioCallback audio_callback_;
    ErrorCallback error_callback_;
    
    // Internal methods
    void audio_processing_loop();
    void update_performance_stats();
};

// Node.js integration
class NodeAudioBridge {
public:
    static void initialize();
    static void shutdown();
    
    // Expose C++ functions to Node.js
    static void register_functions(void* exports);
    
private:
    static std::unique_ptr<AudioEngine> audio_engine_;
    static std::mutex engine_mutex_;
};

} // namespace gunnchai3k

