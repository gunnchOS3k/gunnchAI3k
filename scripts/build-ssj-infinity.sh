#!/bin/bash

# gunnchAI3k SSJ Infinity Build Script
# Builds the complete multi-language architecture for maximum performance

set -e

echo "🚀 Building gunnchAI3k SSJ Infinity Architecture..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the gunnchAI3k root directory"
    exit 1
fi

# Create build directories
print_status "Creating build directories..."
mkdir -p rust-backend/target
mkdir -p cpp-audio-engine/build
mkdir -p python-ai-bridge/venv

# Build Rust Backend
print_status "Building Rust backend for ultra-fast processing..."
cd rust-backend

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    print_error "Rust is not installed. Please install Rust first:"
    print_error "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Build Rust backend
cargo build --release
if [ $? -eq 0 ]; then
    print_success "Rust backend built successfully"
else
    print_error "Failed to build Rust backend"
    exit 1
fi

cd ..

# Build C++ Audio Engine
print_status "Building C++ audio engine for ultra-low latency..."
cd cpp-audio-engine

# Check if CMake is installed
if ! command -v cmake &> /dev/null; then
    print_error "CMake is not installed. Please install CMake first:"
    print_error "brew install cmake  # macOS"
    print_error "sudo apt-get install cmake  # Ubuntu"
    exit 1
fi

# Create build directory
mkdir -p build
cd build

# Configure and build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
if [ $? -eq 0 ]; then
    print_success "C++ audio engine built successfully"
else
    print_error "Failed to build C++ audio engine"
    exit 1
fi

cd ../..

# Setup Python AI Bridge
print_status "Setting up Python AI bridge for advanced NLP..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3 first:"
    print_error "brew install python3  # macOS"
    print_error "sudo apt-get install python3  # Ubuntu"
    exit 1
fi

cd python-ai-bridge

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install --upgrade pip
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    print_success "Python AI bridge setup successfully"
else
    print_error "Failed to setup Python AI bridge"
    exit 1
fi

cd ..

# Build Node.js integration
print_status "Building Node.js integration layer..."

# Install Node.js dependencies
npm install

# Build TypeScript
npm run build

if [ $? -eq 0 ]; then
    print_success "Node.js integration built successfully"
else
    print_error "Failed to build Node.js integration"
    exit 1
fi

# Create performance test
print_status "Creating performance test..."
cat > test-ssj-infinity.js << 'EOF'
const { ssjInfinityEngine } = require('./dist/src/ssj-infinity-engine');

async function testSSJInfinity() {
    console.log('🧪 Testing SSJ Infinity Engine...');
    
    try {
        await ssjInfinityEngine.initialize();
        
        // Test natural language processing
        const response = await ssjInfinityEngine.processNaturalLanguage({
            message: "@gunnchAI3k play meet me there by lucki",
            user_id: "test_user",
            guild_id: "test_guild",
            channel_id: "test_channel"
        });
        
        console.log('✅ Natural Language Response:', response);
        
        // Test music search
        const music = await ssjInfinityEngine.searchMusic("meet me there lucki");
        console.log('✅ Music Search Result:', music);
        
        // Get performance stats
        const stats = ssjInfinityEngine.getPerformanceStats();
        console.log('✅ Performance Stats:', stats);
        
        await ssjInfinityEngine.shutdown();
        console.log('🎉 SSJ Infinity Engine test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testSSJInfinity();
EOF

print_success "SSJ Infinity Architecture built successfully!"
print_success "🚀 Ready for SSJ Infinity level performance!"

echo ""
echo "📋 Build Summary:"
echo "  ✅ Rust Backend: Ultra-fast processing"
echo "  ✅ C++ Audio Engine: Ultra-low latency audio"
echo "  ✅ Python AI Bridge: Advanced NLP"
echo "  ✅ Node.js Integration: Seamless coordination"
echo ""
echo "🧪 To test the system, run:"
echo "  node test-ssj-infinity.js"
echo ""
echo "🚀 To start gunnchAI3k with SSJ Infinity:"
echo "  npm run dev"

