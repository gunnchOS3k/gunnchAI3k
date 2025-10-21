// 3kMLV Arcade - Download Website Script
// Handles tab switching and interactive elements

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tab functionality
    initializeTabs();
    
    // Initialize download tracking
    initializeDownloadTracking();
    
    // Initialize smooth scrolling
    initializeSmoothScrolling();
    
    // Initialize animations
    initializeAnimations();
});

// Tab functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            showTab(targetTab);
        });
    });
}

function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(tabName + '-instructions');
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Add active class to clicked button
    const clickedButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
}

// Download tracking
function initializeDownloadTracking() {
    const downloadLinks = document.querySelectorAll('a[href*="downloads/"]');
    
    downloadLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const downloadUrl = this.getAttribute('href');
            const fileName = this.getAttribute('download') || downloadUrl.split('/').pop();
            
            // Track download
            trackDownload(downloadUrl, fileName);
            
            // Show download started notification
            showDownloadNotification(fileName);
        });
    });
}

function trackDownload(url, fileName) {
    // Send analytics event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'download', {
            'event_category': 'engagement',
            'event_label': fileName,
            'value': 1
        });
    }
    
    // Log to console for debugging
    console.log('Download started:', fileName, 'from', url);
}

function showDownloadNotification(fileName) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'download-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">⬇️</div>
            <div class="notification-text">
                <div class="notification-title">Download Started</div>
                <div class="notification-subtitle">${fileName}</div>
            </div>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00ff88 0%, #0088ff 100%);
        color: #000;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0, 255, 136, 0.3);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Smooth scrolling
function initializeSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Animations
function initializeAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.download-option, .feature-card, .tab-content');
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(element);
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .download-notification {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .notification-icon {
        font-size: 1.5rem;
    }
    
    .notification-text {
        flex: 1;
    }
    
    .notification-title {
        font-weight: 600;
        font-size: 1rem;
        margin-bottom: 2px;
    }
    
    .notification-subtitle {
        font-size: 0.9rem;
        opacity: 0.8;
    }
`;
document.head.appendChild(style);

// Performance monitoring
function initializePerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', function() {
        if (typeof performance !== 'undefined') {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log('Page load time:', loadTime + 'ms');
            
            // Track performance metrics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'timing_complete', {
                    'name': 'load',
                    'value': loadTime
                });
            }
        }
    });
    
    // Monitor download performance
    const downloadLinks = document.querySelectorAll('a[href*="downloads/"]');
    downloadLinks.forEach(link => {
        link.addEventListener('click', function() {
            const startTime = performance.now();
            
            // Monitor download time
            const monitorDownload = () => {
                const endTime = performance.now();
                const downloadTime = endTime - startTime;
                
                console.log('Download time:', downloadTime + 'ms');
                
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'timing_complete', {
                        'name': 'download',
                        'value': Math.round(downloadTime)
                    });
                }
            };
            
            // Monitor for 10 seconds
            setTimeout(monitorDownload, 10000);
        });
    });
}

// Initialize performance monitoring
initializePerformanceMonitoring();

// Error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    
    // Track errors
    if (typeof gtag !== 'undefined') {
        gtag('event', 'exception', {
            'description': e.error.message,
            'fatal': false
        });
    }
});

// Offline detection
function initializeOfflineDetection() {
    window.addEventListener('online', function() {
        console.log('Connection restored');
        showConnectionNotification('Connection restored', 'success');
    });
    
    window.addEventListener('offline', function() {
        console.log('Connection lost');
        showConnectionNotification('Connection lost - Downloads may be affected', 'warning');
    });
}

function showConnectionNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `connection-notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#00ff88' : '#ff8800'};
        color: #000;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        font-weight: 600;
        animation: fadeInDown 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOutUp 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Initialize offline detection
initializeOfflineDetection();

// Add connection notification styles
const connectionStyle = document.createElement('style');
connectionStyle.textContent = `
    @keyframes fadeInDown {
        from {
            transform: translateX(-50%) translateY(-20px);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOutUp {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(-20px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(connectionStyle);
