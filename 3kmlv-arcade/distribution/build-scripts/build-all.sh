#!/bin/bash
# 3kMLV Arcade - Build All Scripts
# Creates optimized builds for all target devices

set -e

echo "🚀 3kMLV Arcade - Building All Platforms"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Build directory
BUILD_DIR="dist"
DIST_DIR="distribution/downloads"

# Create directories
mkdir -p $BUILD_DIR
mkdir -p $DIST_DIR/{windows,macos,linux,ios,android}

echo -e "${BLUE}📁 Creating build directories...${NC}"

# Function to build Windows
build_windows() {
    echo -e "${YELLOW}🪟 Building Windows x64...${NC}"
    
    # Build Windows executable
    npm run build:windows
    
    # Copy to distribution
    cp $BUILD_DIR/windows/3kmlv-arcade-windows-x64.exe $DIST_DIR/windows/
    
    # Create installer
    echo "Creating Windows installer..."
    # Add NSIS installer creation here
    
    echo -e "${GREEN}✅ Windows build complete${NC}"
}

# Function to build macOS
build_macos() {
    echo -e "${YELLOW}🍎 Building macOS...${NC}"
    
    # Build macOS Intel
    echo "Building macOS Intel version..."
    npm run build:macos:intel
    cp $BUILD_DIR/macos/3kmlv-arcade-macos-intel.dmg $DIST_DIR/macos/
    
    # Build macOS Apple Silicon
    echo "Building macOS Apple Silicon version..."
    npm run build:macos:arm64
    cp $BUILD_DIR/macos/3kmlv-arcade-macos-arm64.dmg $DIST_DIR/macos/
    
    echo -e "${GREEN}✅ macOS builds complete${NC}"
}

# Function to build Linux
build_linux() {
    echo -e "${YELLOW}🐧 Building Linux...${NC}"
    
    # Build Linux AppImage
    npm run build:linux
    cp $BUILD_DIR/linux/3kmlv-arcade-linux-x64.AppImage $DIST_DIR/linux/
    
    # Create universal package
    echo "Creating universal Linux package..."
    tar -czf $DIST_DIR/linux/3kmlv-arcade-linux-universal.tar.gz -C $BUILD_DIR/linux .
    
    echo -e "${GREEN}✅ Linux build complete${NC}"
}

# Function to build iOS
build_ios() {
    echo -e "${YELLOW}📱 Building iOS...${NC}"
    
    # Build iOS app
    npm run build:ios
    
    # Create IPA file
    echo "Creating iOS IPA..."
    # Add iOS IPA creation here
    
    cp $BUILD_DIR/ios/3kmlv-arcade-ios.ipa $DIST_DIR/ios/
    
    echo -e "${GREEN}✅ iOS build complete${NC}"
}

# Function to build Android
build_android() {
    echo -e "${YELLOW}🤖 Building Android...${NC}"
    
    # Build universal Android
    echo "Building Android universal..."
    npm run build:android:universal
    cp $BUILD_DIR/android/3kmlv-arcade-android-universal.apk $DIST_DIR/android/
    
    # Build Redmi optimized
    echo "Building Android Redmi optimized..."
    npm run build:android:redmi
    cp $BUILD_DIR/android/3kmlv-arcade-android-redmi.apk $DIST_DIR/android/
    
    # Build Pixel optimized
    echo "Building Android Pixel optimized..."
    npm run build:android:pixel
    cp $BUILD_DIR/android/3kmlv-arcade-android-pixel.apk $DIST_DIR/android/
    
    echo -e "${GREEN}✅ Android builds complete${NC}"
}

# Function to create offline packages
create_offline_packages() {
    echo -e "${YELLOW}📦 Creating offline packages...${NC}"
    
    # Create universal offline package
    echo "Creating universal offline package..."
    mkdir -p $DIST_DIR/universal
    tar -czf $DIST_DIR/universal/3kmlv-arcade-universal.tar.gz \
        -C $DIST_DIR windows macos linux ios android
    
    # Create platform-specific offline packages
    echo "Creating platform-specific offline packages..."
    
    # Windows offline package
    tar -czf $DIST_DIR/windows/3kmlv-arcade-windows-offline.tar.gz \
        -C $DIST_DIR windows
    
    # macOS offline package
    tar -czf $DIST_DIR/macos/3kmlv-arcade-macos-offline.tar.gz \
        -C $DIST_DIR macos
    
    # Linux offline package
    tar -czf $DIST_DIR/linux/3kmlv-arcade-linux-offline.tar.gz \
        -C $DIST_DIR linux
    
    # Mobile offline package
    tar -czf $DIST_DIR/mobile/3kmlv-arcade-mobile-offline.tar.gz \
        -C $DIST_DIR ios android
    
    echo -e "${GREEN}✅ Offline packages created${NC}"
}

# Function to create checksums
create_checksums() {
    echo -e "${YELLOW}🔐 Creating checksums...${NC}"
    
    # Create checksums for all files
    find $DIST_DIR -type f -name "*.exe" -o -name "*.dmg" -o -name "*.AppImage" -o -name "*.ipa" -o -name "*.apk" -o -name "*.tar.gz" | while read file; do
        echo "Creating checksum for $(basename $file)..."
        sha256sum "$file" > "$file.sha256"
        md5sum "$file" > "$file.md5"
    done
    
    echo -e "${GREEN}✅ Checksums created${NC}"
}

# Function to create download manifest
create_download_manifest() {
    echo -e "${YELLOW}📋 Creating download manifest...${NC}"
    
    cat > $DIST_DIR/download-manifest.json << EOF
{
  "version": "1.0.0",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
    "windows": {
      "x64": {
        "file": "3kmlv-arcade-windows-x64.exe",
        "size": "$(stat -c%s $DIST_DIR/windows/3kmlv-arcade-windows-x64.exe 2>/dev/null || echo 0)",
        "checksum": "$(cat $DIST_DIR/windows/3kmlv-arcade-windows-x64.exe.sha256 2>/dev/null | cut -d' ' -f1 || echo '')",
        "requirements": "Windows 10+"
      }
    },
    "macos": {
      "intel": {
        "file": "3kmlv-arcade-macos-intel.dmg",
        "size": "$(stat -c%s $DIST_DIR/macos/3kmlv-arcade-macos-intel.dmg 2>/dev/null || echo 0)",
        "checksum": "$(cat $DIST_DIR/macos/3kmlv-arcade-macos-intel.dmg.sha256 2>/dev/null | cut -d' ' -f1 || echo '')",
        "requirements": "macOS 10.15+"
      },
      "arm64": {
        "file": "3kmlv-arcade-macos-arm64.dmg",
        "size": "$(stat -c%s $DIST_DIR/macos/3kmlv-arcade-macos-arm64.dmg 2>/dev/null || echo 0)",
        "checksum": "$(cat $DIST_DIR/macos/3kmlv-arcade-macos-arm64.dmg.sha256 2>/dev/null | cut -d' ' -f1 || echo '')",
        "requirements": "macOS 11.0+"
      }
    },
    "linux": {
      "x64": {
        "file": "3kmlv-arcade-linux-x64.AppImage",
        "size": "$(stat -c%s $DIST_DIR/linux/3kmlv-arcade-linux-x64.AppImage 2>/dev/null || echo 0)",
        "checksum": "$(cat $DIST_DIR/linux/3kmlv-arcade-linux-x64.AppImage.sha256 2>/dev/null | cut -d' ' -f1 || echo '')",
        "requirements": "Linux x64"
      }
    },
    "ios": {
      "universal": {
        "file": "3kmlv-arcade-ios.ipa",
        "size": "$(stat -c%s $DIST_DIR/ios/3kmlv-arcade-ios.ipa 2>/dev/null || echo 0)",
        "checksum": "$(cat $DIST_DIR/ios/3kmlv-arcade-ios.ipa.sha256 2>/dev/null | cut -d' ' -f1 || echo '')",
        "requirements": "iOS 13.0+"
      }
    },
    "android": {
      "universal": {
        "file": "3kmlv-arcade-android-universal.apk",
        "size": "$(stat -c%s $DIST_DIR/android/3kmlv-arcade-android-universal.apk 2>/dev/null || echo 0)",
        "checksum": "$(cat $DIST_DIR/android/3kmlv-arcade-android-universal.apk.sha256 2>/dev/null | cut -d' ' -f1 || echo '')",
        "requirements": "Android 8.0+"
      },
      "redmi": {
        "file": "3kmlv-arcade-android-redmi.apk",
        "size": "$(stat -c%s $DIST_DIR/android/3kmlv-arcade-android-redmi.apk 2>/dev/null || echo 0)",
        "checksum": "$(cat $DIST_DIR/android/3kmlv-arcade-android-redmi.apk.sha256 2>/dev/null | cut -d' ' -f1 || echo '')",
        "requirements": "Android 8.0+"
      },
      "pixel": {
        "file": "3kmlv-arcade-android-pixel.apk",
        "size": "$(stat -c%s $DIST_DIR/android/3kmlv-arcade-android-pixel.apk 2>/dev/null || echo 0)",
        "checksum": "$(cat $DIST_DIR/android/3kmlv-arcade-android-pixel.apk.sha256 2>/dev/null | cut -d' ' -f1 || echo '')",
        "requirements": "Android 8.0+"
      }
    }
  }
}
EOF
    
    echo -e "${GREEN}✅ Download manifest created${NC}"
}

# Main build process
main() {
    echo -e "${BLUE}🚀 Starting 3kMLV Arcade build process...${NC}"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ Error: package.json not found. Please run from project root.${NC}"
        exit 1
    fi
    
    # Install dependencies
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    
    # Build all platforms
    build_windows
    build_macos
    build_linux
    build_ios
    build_android
    
    # Create offline packages
    create_offline_packages
    
    # Create checksums
    create_checksums
    
    # Create download manifest
    create_download_manifest
    
    echo -e "${GREEN}🎉 All builds complete!${NC}"
    echo -e "${BLUE}📁 Distribution files created in: $DIST_DIR${NC}"
    
    # Show file sizes
    echo -e "${YELLOW}📊 Build Summary:${NC}"
    du -sh $DIST_DIR/*
    
    echo -e "${GREEN}✅ 3kMLV Arcade is ready for distribution!${NC}"
}

# Run main function
main "$@"
