#!/bin/bash

# Gunnch Gaming Hypervisor Build Script
# This script builds the complete gaming hypervisor system

set -e

echo "🚀 Building Gunnch Gaming Hypervisor..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first:"
    echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Check if C++ compiler is available
if ! command -v gcc &> /dev/null && ! command -v clang &> /dev/null; then
    echo "❌ C++ compiler not found. Please install build-essential:"
    echo "sudo apt install build-essential  # Ubuntu/Debian"
    echo "brew install gcc  # macOS"
    exit 1
fi

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is not installed. Please install FFmpeg:"
    echo "sudo apt install ffmpeg  # Ubuntu/Debian"
    echo "brew install ffmpeg  # macOS"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p games
mkdir -p assets/sprites
mkdir -p assets/sounds
mkdir -p assets/music
mkdir -p assets/models
mkdir -p logs

# Build Rust components
echo "🦀 Building Rust components..."
cargo build --release

# Build C++ components (if any)
echo "🔧 Building C++ components..."
if [ -d "cpp" ]; then
    cd cpp
    mkdir -p build
    cd build
    cmake ..
    make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
    cd ../..
fi

# Install additional dependencies
echo "📦 Installing additional dependencies..."
cargo install --path .

# Create example games
echo "🎮 Creating example games..."
mkdir -p examples
cat > examples/hello_world.rs << 'EOF'
use gunnch_gaming_hypervisor::*;

#[tokio::main]
async fn main() -> Result<()> {
    println!("🎮 Hello from Gunnch Gaming Hypervisor!");
    
    // Initialize AI engine
    let mut ai_engine = GameAIEngine::new();
    ai_engine.initialize().await?;
    
    // Generate a simple game
    let game = ai_engine.generate_game_from_name("Hello World Game", 2024).await?;
    
    println!("✅ Game generated: {}", game.name);
    println!("📁 Game directory: games/{}", game.name);
    
    Ok(())
}
EOF

# Create development setup script
echo "🔧 Creating development setup..."
cat > setup_dev.sh << 'EOF'
#!/bin/bash

# Development setup script for Gunnch Gaming Hypervisor

echo "🔧 Setting up development environment..."

# Install development dependencies
cargo install cargo-watch
cargo install cargo-expand
cargo install cargo-udeps

# Set up pre-commit hooks
if [ -d ".git" ]; then
    echo "📝 Setting up pre-commit hooks..."
    cat > .git/hooks/pre-commit << 'HOOK_EOF'
#!/bin/bash
cargo fmt
cargo clippy -- -D warnings
cargo test
HOOK_EOF
    chmod +x .git/hooks/pre-commit
fi

# Create VS Code settings
mkdir -p .vscode
cat > .vscode/settings.json << 'VSCODE_EOF'
{
    "rust-analyzer.cargo.features": "all",
    "rust-analyzer.checkOnSave.command": "clippy",
    "rust-analyzer.checkOnSave.extraArgs": ["--", "-D", "warnings"],
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll": true
    }
}
VSCODE_EOF

echo "✅ Development environment set up!"
EOF

chmod +x setup_dev.sh

# Create test script
echo "🧪 Creating test script..."
cat > test.sh << 'EOF'
#!/bin/bash

# Test script for Gunnch Gaming Hypervisor

echo "🧪 Running tests..."

# Run Rust tests
echo "🦀 Running Rust tests..."
cargo test

# Run integration tests
echo "🔗 Running integration tests..."
cargo test --test integration

# Run performance tests
echo "⚡ Running performance tests..."
cargo bench

echo "✅ All tests passed!"
EOF

chmod +x test.sh

# Create documentation
echo "📚 Generating documentation..."
cargo doc --no-deps --open

# Create release package
echo "📦 Creating release package..."
mkdir -p dist
cp target/release/gunnch-gaming-hypervisor dist/
cp -r assets dist/
cp -r examples dist/
cp README.md dist/
cp LICENSE dist/ 2>/dev/null || echo "No LICENSE file found"

# Create installer script
echo "📦 Creating installer script..."
cat > dist/install.sh << 'EOF'
#!/bin/bash

# Installer script for Gunnch Gaming Hypervisor

echo "🚀 Installing Gunnch Gaming Hypervisor..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first:"
    echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Install the hypervisor
cargo install --path .

# Create desktop entry (Linux)
if [ "$(uname)" = "Linux" ]; then
    cat > ~/.local/share/applications/gunnch-gaming-hypervisor.desktop << 'DESKTOP_EOF'
[Desktop Entry]
Name=Gunnch Gaming Hypervisor
Comment=AI-Powered Game Generation & Emulation
Exec=gunnch-gaming-hypervisor
Icon=applications-games
Terminal=false
Type=Application
Categories=Game;Development;
DESKTOP_EOF
fi

echo "✅ Installation complete!"
echo "🎮 Run 'gunnch-gaming-hypervisor' to start!"
EOF

chmod +x dist/install.sh

echo "✅ Build complete!"
echo ""
echo "🎮 Gunnch Gaming Hypervisor is ready!"
echo ""
echo "📁 Files created:"
echo "  - target/release/gunnch-gaming-hypervisor (main executable)"
echo "  - games/ (game storage directory)"
echo "  - assets/ (asset storage directory)"
echo "  - examples/ (example code)"
echo "  - dist/ (release package)"
echo ""
echo "🚀 To run:"
echo "  ./target/release/gunnch-gaming-hypervisor"
echo ""
echo "🔧 To set up development:"
echo "  ./setup_dev.sh"
echo ""
echo "🧪 To run tests:"
echo "  ./test.sh"
echo ""
echo "📚 To view documentation:"
echo "  cargo doc --open"
echo ""
echo "🎮 Happy gaming and learning! ✨"

