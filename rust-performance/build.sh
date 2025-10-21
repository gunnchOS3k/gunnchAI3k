#!/bin/bash

# gunnchAI3k Rust Performance Build Script
# High-performance Rust backend for gunnchAI3k Discord bot

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Build configuration
PROJECT_NAME="gunnchAI3k Performance Engine"
VERSION="1.0.0"
BUILD_DIR="target"
RELEASE_DIR="target/release"
DEBUG_DIR="target/debug"

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

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE} $1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Rust installation
check_rust() {
    if ! command_exists cargo; then
        print_error "Cargo is not installed. Please install Rust to continue."
        echo "Visit https://rustup.rs/ for installation instructions."
        exit 1
    fi
    
    RUST_VERSION=$(cargo --version | cut -d' ' -f2)
    print_success "Rust version $RUST_VERSION is installed"
}

# Function to check Rust toolchain
check_rust_toolchain() {
    if ! command_exists rustup; then
        print_error "rustup is not installed. Please install Rust toolchain."
        exit 1
    fi
    
    # Check for required components
    if ! rustup component list --installed | grep -q "rust-src"; then
        print_status "Installing rust-src component..."
        rustup component add rust-src
    fi
    
    if ! rustup component list --installed | grep -q "clippy"; then
        print_status "Installing clippy component..."
        rustup component add clippy
    fi
    
    if ! rustup component list --installed | grep -q "rustfmt"; then
        print_status "Installing rustfmt component..."
        rustup component add rustfmt
    fi
    
    print_success "Rust toolchain is ready"
}

# Function to clean build directory
clean_build() {
    print_header "Cleaning Build Directory"
    
    if [ -d "$BUILD_DIR" ]; then
        print_status "Cleaning build directory..."
        cargo clean
        print_success "Build directory cleaned"
    else
        print_status "No existing build directory to clean"
    fi
}

# Function to run cargo check
run_check() {
    print_header "Running Cargo Check"
    
    print_status "Checking code for errors..."
    cargo check
    
    if [ $? -eq 0 ]; then
        print_success "Code check completed successfully"
    else
        print_error "Code check failed"
        exit 1
    fi
}

# Function to run clippy
run_clippy() {
    print_header "Running Clippy"
    
    print_status "Running clippy for code quality checks..."
    cargo clippy -- -D warnings
    
    if [ $? -eq 0 ]; then
        print_success "Clippy completed successfully"
    else
        print_warning "Clippy completed with warnings"
    fi
}

# Function to run rustfmt
run_rustfmt() {
    print_header "Running Rustfmt"
    
    print_status "Formatting code..."
    cargo fmt
    
    if [ $? -eq 0 ]; then
        print_success "Code formatting completed successfully"
    else
        print_warning "Code formatting completed with warnings"
    fi
}

# Function to run tests
run_tests() {
    print_header "Running Tests"
    
    print_status "Running unit tests..."
    cargo test
    
    if [ $? -eq 0 ]; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed"
    fi
}

# Function to build debug version
build_debug() {
    print_header "Building Debug Version"
    
    print_status "Building debug version..."
    cargo build
    
    if [ $? -eq 0 ]; then
        print_success "Debug build completed successfully"
    else
        print_error "Debug build failed"
        exit 1
    fi
}

# Function to build release version
build_release() {
    print_header "Building Release Version"
    
    print_status "Building release version with optimizations..."
    cargo build --release
    
    if [ $? -eq 0 ]; then
        print_success "Release build completed successfully"
    else
        print_error "Release build failed"
        exit 1
    fi
}

# Function to run benchmarks
run_benchmarks() {
    print_header "Running Benchmarks"
    
    print_status "Running performance benchmarks..."
    cargo bench
    
    if [ $? -eq 0 ]; then
        print_success "Benchmarks completed successfully"
    else
        print_warning "Benchmarks completed with warnings"
    fi
}

# Function to generate documentation
generate_docs() {
    print_header "Generating Documentation"
    
    print_status "Generating Rust documentation..."
    cargo doc --no-deps --open
    
    if [ $? -eq 0 ]; then
        print_success "Documentation generated successfully"
    else
        print_warning "Documentation generation completed with warnings"
    fi
}

# Function to create release package
create_release_package() {
    print_header "Creating Release Package"
    
    PACKAGE_NAME="gunnchai3k-performance-$VERSION"
    PACKAGE_DIR="packages/$PACKAGE_NAME"
    
    # Create package directory
    mkdir -p "$PACKAGE_DIR"
    
    # Copy release binary
    if [ -f "$RELEASE_DIR/libgunnchai3k_performance.dylib" ]; then
        cp "$RELEASE_DIR/libgunnchai3k_performance.dylib" "$PACKAGE_DIR/"
    elif [ -f "$RELEASE_DIR/libgunnchai3k_performance.so" ]; then
        cp "$RELEASE_DIR/libgunnchai3k_performance.so" "$PACKAGE_DIR/"
    elif [ -f "$RELEASE_DIR/gunnchai3k_performance.dll" ]; then
        cp "$RELEASE_DIR/gunnchai3k_performance.dll" "$PACKAGE_DIR/"
    fi
    
    # Copy source files
    cp -r src "$PACKAGE_DIR/"
    cp Cargo.toml "$PACKAGE_DIR/"
    cp README.md "$PACKAGE_DIR/" 2>/dev/null || true
    
    # Create package info
    cat > "$PACKAGE_DIR/package-info.json" << EOF
{
  "name": "$PACKAGE_NAME",
  "version": "$VERSION",
  "description": "High-performance Rust backend for gunnchAI3k",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files": [
    "*.dylib",
    "*.so",
    "*.dll",
    "src/**/*",
    "Cargo.toml",
    "README.md"
  ]
}
EOF
    
    # Create tarball
    cd packages
    tar -czf "$PACKAGE_NAME.tar.gz" "$PACKAGE_NAME"
    cd ..
    
    print_success "Release package created: packages/$PACKAGE_NAME.tar.gz"
}

# Function to display build summary
display_build_summary() {
    print_header "Build Summary"
    
    echo -e "${GREEN}✓${NC} Rust toolchain checked"
    echo -e "${GREEN}✓${NC} Build directory cleaned"
    echo -e "${GREEN}✓${NC} Code checked for errors"
    echo -e "${GREEN}✓${NC} Code quality checked with clippy"
    echo -e "${GREEN}✓${NC} Code formatted with rustfmt"
    echo -e "${GREEN}✓${NC} Tests executed"
    echo -e "${GREEN}✓${NC} Debug build completed"
    echo -e "${GREEN}✓${NC} Release build completed"
    echo -e "${GREEN}✓${NC} Benchmarks executed"
    echo -e "${GREEN}✓${NC} Documentation generated"
    echo -e "${GREEN}✓${NC} Release package created"
    
    echo ""
    print_success "Build completed successfully!"
    echo ""
    echo -e "${CYAN}Build Output:${NC} $BUILD_DIR/"
    echo -e "${CYAN}Release Binary:${NC} $RELEASE_DIR/"
    echo -e "${CYAN}Documentation:${NC} target/doc/"
    echo -e "${CYAN}Release Package:${NC} packages/"
    echo ""
    echo -e "${YELLOW}To run the performance engine:${NC} cargo run --release"
    echo -e "${YELLOW}To run tests:${NC} cargo test"
    echo -e "${YELLOW}To run benchmarks:${NC} cargo bench"
    echo -e "${YELLOW}To view documentation:${NC} cargo doc --open"
}

# Main build function
main() {
    print_header "gunnchAI3k Rust Performance Build System"
    echo -e "${CYAN}Building $PROJECT_NAME v$VERSION${NC}"
    echo ""
    
    # Check prerequisites
    check_rust
    check_rust_toolchain
    
    # Clean build directory
    clean_build
    
    # Run code quality checks
    run_check
    run_clippy
    run_rustfmt
    
    # Run tests
    run_tests
    
    # Build versions
    build_debug
    build_release
    
    # Run benchmarks
    run_benchmarks
    
    # Generate documentation
    generate_docs
    
    # Create release package
    create_release_package
    
    # Display summary
    display_build_summary
}

# Handle command line arguments
case "${1:-}" in
    "clean")
        clean_build
        ;;
    "check")
        run_check
        ;;
    "clippy")
        run_clippy
        ;;
    "fmt")
        run_rustfmt
        ;;
    "test")
        run_tests
        ;;
    "build")
        build_debug
        ;;
    "release")
        build_release
        ;;
    "bench")
        run_benchmarks
        ;;
    "docs")
        generate_docs
        ;;
    "package")
        create_release_package
        ;;
    "help"|"-h"|"--help")
        echo "gunnchAI3k Rust Performance Build Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  clean      Clean build directory"
        echo "  check      Run cargo check"
        echo "  clippy     Run clippy for code quality"
        echo "  fmt        Run rustfmt for code formatting"
        echo "  test       Run tests"
        echo "  build      Build debug version"
        echo "  release   Build release version"
        echo "  bench      Run benchmarks"
        echo "  docs       Generate documentation"
        echo "  package    Create release package"
        echo "  help       Show this help message"
        echo ""
        echo "If no command is specified, a full build will be performed."
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run '$0 help' for usage information."
        exit 1
        ;;
esac

