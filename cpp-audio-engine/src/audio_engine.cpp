#include "audio_engine.h"
#include <iostream>
#include <chrono>
#include <algorithm>
#include <cmath>

namespace gunnchai3k {

AudioEngine::AudioEngine() 
    : initialized_(false)
    , streaming_(false)
    , audio_thread_running_(false)
{
    voice_processor_ = std::make_unique<VoiceProcessor>();
    opus_encoder_ = std::make_unique<OpusEncoder>();
    ffmpeg_decoder_ = std::make_unique<FFmpegDecoder>();
}

AudioEngine::~AudioEngine() {
    shutdown();
}

bool AudioEngine::initialize(const AudioConfig& config) {
    if (initialized_.load()) {
        return true;
    }
    
    config_ = config;
    
    // Initialize components
    if (!voice_processor_->initialize(config_)) {
        std::cerr << "Failed to initialize voice processor" << std::endl;
        return false;
    }
    
    if (!opus_encoder_->initialize(config_.sample_rate, config_.channels, 128000)) {
        std::cerr << "Failed to initialize Opus encoder" << std::endl;
        return false;
    }
    
    if (!ffmpeg_decoder_->initialize()) {
        std::cerr << "Failed to initialize FFmpeg decoder" << std::endl;
        return false;
    }
    
    initialized_.store(true);
    return true;
}

void AudioEngine::shutdown() {
    if (!initialized_.load()) {
        return;
    }
    
    stop_streaming();
    
    voice_processor_->shutdown();
    opus_encoder_->shutdown();
    ffmpeg_decoder_->shutdown();
    
    initialized_.store(false);
}

bool AudioEngine::start_streaming() {
    if (!initialized_.load() || streaming_.load()) {
        return false;
    }
    
    streaming_.store(true);
    audio_thread_running_.store(true);
    
    audio_thread_ = std::thread(&AudioEngine::audio_processing_loop, this);
    
    return true;
}

void AudioEngine::stop_streaming() {
    if (!streaming_.load()) {
        return;
    }
    
    streaming_.store(false);
    audio_thread_running_.store(false);
    
    queue_cv_.notify_all();
    
    if (audio_thread_.joinable()) {
        audio_thread_.join();
    }
}

void AudioEngine::process_audio_pipeline(const AudioBuffer& input, AudioBuffer& output) {
    if (!initialized_.load()) {
        return;
    }
    
    AudioBuffer processed = input;
    
    // Voice processing pipeline
    voice_processor_->process_audio(processed, output);
    
    // Apply real-time effects
    // Volume, pitch, speed adjustments would go here
    
    // Update performance stats
    update_performance_stats();
}

bool AudioEngine::join_voice_channel(const std::string& channel_id) {
    if (!initialized_.load()) {
        return false;
    }
    
    // Implementation would connect to Discord voice channel
    std::cout << "Joining voice channel: " << channel_id << std::endl;
    return true;
}

void AudioEngine::leave_voice_channel() {
    if (!initialized_.load()) {
        return;
    }
    
    std::cout << "Leaving voice channel" << std::endl;
}

bool AudioEngine::play_audio(const std::string& url) {
    if (!initialized_.load()) {
        return false;
    }
    
    std::vector<AudioBuffer> buffers;
    if (!ffmpeg_decoder_->decode_audio(url, buffers)) {
        std::cerr << "Failed to decode audio from URL: " << url << std::endl;
        return false;
    }
    
    // Queue audio buffers for playback
    {
        std::lock_guard<std::mutex> lock(queue_mutex_);
        for (const auto& buffer : buffers) {
            output_queue_.push(buffer);
        }
    }
    
    queue_cv_.notify_all();
    return true;
}

bool AudioEngine::play_audio_buffer(const AudioBuffer& buffer) {
    if (!initialized_.load()) {
        return false;
    }
    
    {
        std::lock_guard<std::mutex> lock(queue_mutex_);
        output_queue_.push(buffer);
    }
    
    queue_cv_.notify_all();
    return true;
}

void AudioEngine::stop_playback() {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    while (!output_queue_.empty()) {
        output_queue_.pop();
    }
}

void AudioEngine::set_volume(float volume) {
    // Implementation for volume control
    volume = std::clamp(volume, 0.0f, 1.0f);
    std::cout << "Setting volume to: " << volume << std::endl;
}

void AudioEngine::set_pitch(float pitch) {
    // Implementation for pitch control
    std::cout << "Setting pitch to: " << pitch << std::endl;
}

void AudioEngine::set_speed(float speed) {
    // Implementation for speed control
    speed = std::clamp(speed, 0.1f, 4.0f);
    std::cout << "Setting speed to: " << speed << std::endl;
}

AudioEngine::PerformanceStats AudioEngine::get_performance_stats() const {
    std::lock_guard<std::mutex> lock(stats_mutex_);
    return stats_;
}

void AudioEngine::set_audio_callback(AudioCallback callback) {
    audio_callback_ = std::move(callback);
}

void AudioEngine::set_error_callback(ErrorCallback callback) {
    error_callback_ = std::move(callback);
}

void AudioEngine::audio_processing_loop() {
    auto start_time = std::chrono::high_resolution_clock::now();
    
    while (audio_thread_running_.load()) {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        
        // Wait for audio data or timeout
        queue_cv_.wait_for(lock, std::chrono::milliseconds(10), [this] {
            return !input_queue_.empty() || !output_queue_.empty() || !audio_thread_running_.load();
        });
        
        // Process input audio
        if (!input_queue_.empty()) {
            AudioBuffer input = input_queue_.front();
            input_queue_.pop();
            lock.unlock();
            
            AudioBuffer output;
            process_audio_pipeline(input, output);
            
            if (audio_callback_) {
                audio_callback_(output);
            }
        }
        
        // Process output audio
        if (!output_queue_.empty()) {
            AudioBuffer output = output_queue_.front();
            output_queue_.pop();
            lock.unlock();
            
            // Send to voice channel
            // Implementation would send to Discord
        }
        
        // Update performance stats periodically
        auto current_time = std::chrono::high_resolution_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(current_time - start_time);
        
        if (elapsed.count() >= 1000) { // Update every second
            update_performance_stats();
            start_time = current_time;
        }
    }
}

void AudioEngine::update_performance_stats() {
    std::lock_guard<std::mutex> lock(stats_mutex_);
    
    // Calculate CPU usage (simplified)
    static auto last_time = std::chrono::high_resolution_clock::now();
    auto current_time = std::chrono::high_resolution_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::microseconds>(current_time - last_time);
    
    stats_.cpu_usage = std::min(100.0, elapsed.count() / 1000.0);
    stats_.memory_usage = 0.0; // Would calculate actual memory usage
    stats_.audio_latency_ms = config_.max_latency_ms;
    stats_.network_latency_ms = 0.0; // Would measure network latency
    
    last_time = current_time;
}

// VoiceProcessor implementation
VoiceProcessor::VoiceProcessor() 
    : initialized_(false)
    , voice_threshold_(0.1f)
    , noise_floor_(0.01f)
    , noise_profile_learned_(false)
{
}

VoiceProcessor::~VoiceProcessor() {
    shutdown();
}

bool VoiceProcessor::initialize(const AudioConfig& config) {
    if (initialized_.load()) {
        return true;
    }
    
    config_ = config;
    energy_history_.resize(100, 0.0f);
    noise_spectrum_.resize(config.buffer_size / 2, 0.0f);
    echo_buffer_.resize(config.buffer_size, 0.0f);
    reference_buffer_.resize(config.buffer_size, 0.0f);
    
    initialized_.store(true);
    return true;
}

void VoiceProcessor::shutdown() {
    if (!initialized_.load()) {
        return;
    }
    
    initialized_.store(false);
}

bool VoiceProcessor::process_audio(const AudioBuffer& input, AudioBuffer& output) {
    if (!initialized_.load()) {
        return false;
    }
    
    output = input;
    
    // Voice activity detection
    if (detect_voice_activity(input)) {
        // Apply noise suppression
        suppress_noise(output);
        
        // Apply echo cancellation
        cancel_echo(output);
        
        // Apply automatic gain control
        apply_agc(output);
    }
    
    return true;
}

bool VoiceProcessor::detect_voice_activity(const AudioBuffer& buffer) {
    if (buffer.samples.empty()) {
        return false;
    }
    
    // Calculate RMS energy
    float energy = 0.0f;
    for (float sample : buffer.samples) {
        energy += sample * sample;
    }
    energy = std::sqrt(energy / buffer.samples.size());
    
    // Update energy history
    energy_history_.erase(energy_history_.begin());
    energy_history_.push_back(energy);
    
    // Calculate average energy
    float avg_energy = 0.0f;
    for (float e : energy_history_) {
        avg_energy += e;
    }
    avg_energy /= energy_history_.size();
    
    // Voice activity detection
    return energy > (avg_energy + voice_threshold_);
}

void VoiceProcessor::suppress_noise(AudioBuffer& buffer) {
    if (buffer.samples.empty()) {
        return;
    }
    
    // Simple noise suppression (would be more sophisticated in production)
    for (float& sample : buffer.samples) {
        if (std::abs(sample) < noise_floor_) {
            sample *= 0.1f; // Suppress noise
        }
    }
}

void VoiceProcessor::cancel_echo(AudioBuffer& buffer) {
    if (buffer.samples.empty()) {
        return;
    }
    
    // Simple echo cancellation (would be more sophisticated in production)
    for (size_t i = 0; i < buffer.samples.size(); ++i) {
        if (i < echo_buffer_.size()) {
            buffer.samples[i] -= echo_buffer_[i] * 0.3f;
        }
    }
    
    // Update echo buffer
    echo_buffer_ = buffer.samples;
}

void VoiceProcessor::apply_agc(AudioBuffer& buffer) {
    if (buffer.samples.empty()) {
        return;
    }
    
    // Simple automatic gain control
    float max_sample = 0.0f;
    for (float sample : buffer.samples) {
        max_sample = std::max(max_sample, std::abs(sample));
    }
    
    if (max_sample > 0.0f) {
        float gain = 0.8f / max_sample; // Target 80% of full scale
        for (float& sample : buffer.samples) {
            sample *= gain;
        }
    }
}

} // namespace gunnchai3k

