cmake_minimum_required(VERSION 3.20)
project(gunnchai3k_audio_engine)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(PkgConfig REQUIRED)
find_package(Threads REQUIRED)

# Audio libraries
pkg_check_modules(ALSA REQUIRED alsa)
pkg_check_modules(PULSEAUDIO REQUIRED libpulse)
pkg_check_modules(FFMPEG REQUIRED libavcodec libavformat libavutil libswresample)

# Node.js integration
find_package(node REQUIRED)

# Include directories
include_directories(${ALSA_INCLUDE_DIRS})
include_directories(${PULSEAUDIO_INCLUDE_DIRS})
include_directories(${FFMPEG_INCLUDE_DIRS})

# Source files
set(SOURCES
    src/audio_engine.cpp
    src/voice_processor.cpp
    src/audio_buffer.cpp
    src/opus_encoder.cpp
    src/ffmpeg_decoder.cpp
    src/node_bridge.cpp
)

# Create shared library
add_library(gunnchai3k_audio SHARED ${SOURCES})

# Link libraries
target_link_libraries(gunnchai3k_audio
    ${ALSA_LIBRARIES}
    ${PULSEAUDIO_LIBRARIES}
    ${FFMPEG_LIBRARIES}
    Threads::Threads
    node
)

# Compiler flags for maximum performance
target_compile_options(gunnchai3k_audio PRIVATE
    -O3
    -march=native
    -mtune=native
    -flto
    -ffast-math
    -funroll-loops
    -mavx2
    -mfma
)

# Set output directory
set_target_properties(gunnchai3k_audio PROPERTIES
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)

# Install targets
install(TARGETS gunnchai3k_audio
    LIBRARY DESTINATION lib
    RUNTIME DESTINATION bin
)

