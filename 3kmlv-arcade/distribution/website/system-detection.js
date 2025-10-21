// 3kMLV Arcade - System Detection Script
// Automatically detects user's system and recommends optimal download

class SystemDetector {
    constructor() {
        this.detectionResult = null;
        this.init();
    }

    init() {
        this.detectSystem();
    }

    detectSystem() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        const language = navigator.language;
        const screenWidth = screen.width;
        const screenHeight = screen.height;
        const devicePixelRatio = window.devicePixelRatio || 1;
        const memory = navigator.deviceMemory || 'unknown';
        const cores = navigator.hardwareConcurrency || 'unknown';

        // Detect operating system
        const os = this.detectOS(userAgent, platform);
        
        // Detect device type
        const deviceType = this.detectDeviceType(userAgent, screenWidth, screenHeight);
        
        // Detect specific devices
        const specificDevice = this.detectSpecificDevice(userAgent, platform, screenWidth, screenHeight);
        
        // Detect architecture
        const architecture = this.detectArchitecture(userAgent, platform);
        
        // Get system capabilities
        const capabilities = this.getSystemCapabilities(memory, cores, devicePixelRatio);

        this.detectionResult = {
            os,
            deviceType,
            specificDevice,
            architecture,
            capabilities,
            userAgent,
            platform,
            language,
            screenWidth,
            screenHeight,
            devicePixelRatio,
            memory,
            cores
        };

        this.displayResult();
    }

    detectOS(userAgent, platform) {
        if (userAgent.includes('Windows NT')) {
            const version = this.getWindowsVersion(userAgent);
            return {
                name: 'Windows',
                version: version,
                family: 'windows'
            };
        } else if (userAgent.includes('Mac OS X') || userAgent.includes('macOS')) {
            const version = this.getMacOSVersion(userAgent);
            return {
                name: 'macOS',
                version: version,
                family: 'macos'
            };
        } else if (userAgent.includes('Linux')) {
            return {
                name: 'Linux',
                version: 'unknown',
                family: 'linux'
            };
        } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
            const version = this.getiOSVersion(userAgent);
            return {
                name: 'iOS',
                version: version,
                family: 'ios'
            };
        } else if (userAgent.includes('Android')) {
            const version = this.getAndroidVersion(userAgent);
            return {
                name: 'Android',
                version: version,
                family: 'android'
            };
        }
        
        return {
            name: 'Unknown',
            version: 'unknown',
            family: 'unknown'
        };
    }

    detectDeviceType(userAgent, screenWidth, screenHeight) {
        if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
            return 'mobile';
        } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
            return 'tablet';
        } else if (screenWidth < 768) {
            return 'mobile';
        } else if (screenWidth < 1024) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    detectSpecificDevice(userAgent, platform, screenWidth, screenHeight) {
        // iPhone detection
        if (userAgent.includes('iPhone')) {
            if (userAgent.includes('iPhone13,4') || userAgent.includes('iPhone14,2')) {
                return 'iPhone 13 Mini';
            } else if (userAgent.includes('iPhone14,5') || userAgent.includes('iPhone14,4')) {
                return 'iPhone 13';
            } else if (userAgent.includes('iPhone15,2') || userAgent.includes('iPhone15,3')) {
                return 'iPhone 14';
            }
            return 'iPhone (Other)';
        }

        // iPad detection
        if (userAgent.includes('iPad')) {
            return 'iPad';
        }

        // Android device detection
        if (userAgent.includes('Android')) {
            // Redmi detection
            if (userAgent.includes('Redmi') || userAgent.includes('Xiaomi')) {
                if (userAgent.includes('2201116SG') || userAgent.includes('2201116SI')) {
                    return 'Redmi 15 Pro';
                }
                return 'Redmi/Xiaomi Device';
            }
            
            // Google Pixel detection
            if (userAgent.includes('Pixel')) {
                if (userAgent.includes('Pixel 6a') || userAgent.includes('oriole')) {
                    return 'Google Pixel 6a';
                }
                return 'Google Pixel Device';
            }
            
            return 'Android Device';
        }

        // macOS detection
        if (platform.includes('Mac')) {
            if (userAgent.includes('Intel')) {
                return 'Mac (Intel)';
            } else if (userAgent.includes('ARM64') || userAgent.includes('Apple Silicon')) {
                return 'Mac (Apple Silicon)';
            }
            return 'Mac';
        }

        // Windows detection
        if (platform.includes('Win')) {
            return 'Windows PC';
        }

        return 'Unknown Device';
    }

    detectArchitecture(userAgent, platform) {
        if (userAgent.includes('ARM64') || userAgent.includes('Apple Silicon')) {
            return 'arm64';
        } else if (userAgent.includes('Intel') || userAgent.includes('x86_64')) {
            return 'x64';
        } else if (userAgent.includes('x86')) {
            return 'x86';
        }
        return 'unknown';
    }

    getSystemCapabilities(memory, cores, devicePixelRatio) {
        return {
            memory: memory,
            cores: cores,
            devicePixelRatio: devicePixelRatio,
            performance: this.calculatePerformanceScore(memory, cores, devicePixelRatio)
        };
    }

    calculatePerformanceScore(memory, cores, devicePixelRatio) {
        let score = 0;
        
        // Memory scoring
        if (memory >= 8) score += 40;
        else if (memory >= 4) score += 30;
        else if (memory >= 2) score += 20;
        else score += 10;
        
        // CPU cores scoring
        if (cores >= 8) score += 30;
        else if (cores >= 4) score += 20;
        else if (cores >= 2) score += 10;
        else score += 5;
        
        // Display quality scoring
        if (devicePixelRatio >= 3) score += 20;
        else if (devicePixelRatio >= 2) score += 15;
        else if (devicePixelRatio >= 1.5) score += 10;
        else score += 5;
        
        return Math.min(score, 100);
    }

    getWindowsVersion(userAgent) {
        if (userAgent.includes('Windows NT 10.0')) return 'Windows 10/11';
        if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
        if (userAgent.includes('Windows NT 6.2')) return 'Windows 8';
        if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
        return 'Windows (Other)';
    }

    getMacOSVersion(userAgent) {
        if (userAgent.includes('Mac OS X 13')) return 'macOS Ventura';
        if (userAgent.includes('Mac OS X 12')) return 'macOS Monterey';
        if (userAgent.includes('Mac OS X 11')) return 'macOS Big Sur';
        if (userAgent.includes('Mac OS X 10.15')) return 'macOS Catalina';
        return 'macOS (Other)';
    }

    getiOSVersion(userAgent) {
        const match = userAgent.match(/OS (\d+)_(\d+)/);
        if (match) {
            const major = parseInt(match[1]);
            const minor = parseInt(match[2]);
            return `iOS ${major}.${minor}`;
        }
        return 'iOS (Unknown)';
    }

    getAndroidVersion(userAgent) {
        const match = userAgent.match(/Android (\d+\.\d+)/);
        if (match) {
            return `Android ${match[1]}`;
        }
        return 'Android (Unknown)';
    }

    getRecommendedDownload() {
        const { os, deviceType, specificDevice, architecture, capabilities } = this.detectionResult;
        
        // Mobile recommendations
        if (deviceType === 'mobile') {
            if (os.family === 'ios') {
                return {
                    platform: 'iOS',
                    downloadUrl: 'downloads/ios/3kmlv-arcade-ios.ipa',
                    fileName: '3kmlv-arcade-ios.ipa',
                    description: 'iOS version optimized for your device',
                    size: '45 MB',
                    requirements: 'iOS 13.0+'
                };
            } else if (os.family === 'android') {
                if (specificDevice.includes('Redmi')) {
                    return {
                        platform: 'Android (Redmi)',
                        downloadUrl: 'downloads/android/3kmlv-arcade-android-redmi.apk',
                        fileName: '3kmlv-arcade-android-redmi.apk',
                        description: 'Android version optimized for Redmi devices',
                        size: '52 MB',
                        requirements: 'Android 8.0+'
                    };
                } else if (specificDevice.includes('Pixel')) {
                    return {
                        platform: 'Android (Pixel)',
                        downloadUrl: 'downloads/android/3kmlv-arcade-android-pixel.apk',
                        fileName: '3kmlv-arcade-android-pixel.apk',
                        description: 'Android version optimized for Pixel devices',
                        size: '48 MB',
                        requirements: 'Android 8.0+'
                    };
                } else {
                    return {
                        platform: 'Android (Universal)',
                        downloadUrl: 'downloads/android/3kmlv-arcade-android-universal.apk',
                        fileName: '3kmlv-arcade-android-universal.apk',
                        description: 'Android version for all devices',
                        size: '55 MB',
                        requirements: 'Android 8.0+'
                    };
                }
            }
        }
        
        // Desktop recommendations
        if (deviceType === 'desktop') {
            if (os.family === 'windows') {
                return {
                    platform: 'Windows',
                    downloadUrl: 'downloads/windows/3kmlv-arcade-windows-x64.exe',
                    fileName: '3kmlv-arcade-windows-x64.exe',
                    description: 'Windows version for your PC',
                    size: '78 MB',
                    requirements: 'Windows 10+'
                };
            } else if (os.family === 'macos') {
                if (architecture === 'arm64') {
                    return {
                        platform: 'macOS (Apple Silicon)',
                        downloadUrl: 'downloads/macos/3kmlv-arcade-macos-arm64.dmg',
                        fileName: '3kmlv-arcade-macos-arm64.dmg',
                        description: 'macOS version for Apple Silicon (M1/M2)',
                        size: '65 MB',
                        requirements: 'macOS 11.0+'
                    };
                } else {
                    return {
                        platform: 'macOS (Intel)',
                        downloadUrl: 'downloads/macos/3kmlv-arcade-macos-intel.dmg',
                        fileName: '3kmlv-arcade-macos-intel.dmg',
                        description: 'macOS version for Intel Macs',
                        size: '72 MB',
                        requirements: 'macOS 10.15+'
                    };
                }
            } else if (os.family === 'linux') {
                return {
                    platform: 'Linux',
                    downloadUrl: 'downloads/linux/3kmlv-arcade-linux-x64.AppImage',
                    fileName: '3kmlv-arcade-linux-x64.AppImage',
                    description: 'Linux version for your system',
                    size: '85 MB',
                    requirements: 'Linux x64'
                };
            }
        }
        
        // Default fallback
        return {
            platform: 'Universal',
            downloadUrl: 'downloads/universal/3kmlv-arcade-universal.zip',
            fileName: '3kmlv-arcade-universal.zip',
            description: 'Universal version for all platforms',
            size: '120 MB',
            requirements: 'Multi-platform'
        };
    }

    displayResult() {
        const statusElement = document.getElementById('detection-status');
        const resultElement = document.getElementById('detection-result');
        
        if (statusElement && resultElement) {
            statusElement.style.display = 'none';
            resultElement.style.display = 'block';
            
            // Update device info
            const deviceName = document.getElementById('device-name');
            const deviceDetails = document.getElementById('device-details');
            const downloadButton = document.getElementById('download-button');
            
            if (deviceName) {
                deviceName.textContent = this.detectionResult.specificDevice;
            }
            
            if (deviceDetails) {
                deviceDetails.innerHTML = `
                    <strong>OS:</strong> ${this.detectionResult.os.name} ${this.detectionResult.os.version}<br>
                    <strong>Device:</strong> ${this.detectionResult.deviceType}<br>
                    <strong>Architecture:</strong> ${this.detectionResult.architecture}<br>
                    <strong>Performance Score:</strong> ${this.detectionResult.capabilities.performance}/100
                `;
            }
            
            if (downloadButton) {
                const recommendation = this.getRecommendedDownload();
                downloadButton.innerHTML = `
                    <a href="${recommendation.downloadUrl}" class="btn-download-primary" download="${recommendation.fileName}">
                        <div class="download-info">
                            <div class="download-title">${recommendation.platform}</div>
                            <div class="download-description">${recommendation.description}</div>
                            <div class="download-meta">
                                <span class="download-size">${recommendation.size}</span>
                                <span class="download-requirements">${recommendation.requirements}</span>
                            </div>
                        </div>
                        <div class="download-icon">⬇️</div>
                    </a>
                `;
            }
        }
    }
}

// Initialize system detection when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SystemDetector();
});
