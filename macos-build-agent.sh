#!/bin/bash
# CAFFiNE macOS Build Agent
# Watches for trigger files and automatically builds DMG
# Run this on your Mac to enable automated builds

set -e

# Configuration
REPO_DIR="$HOME/projects/caffine"
TRIGGER_FILE="/tmp/caffine-build-trigger"
COMPLETE_FILE="/tmp/caffine-build-complete"
BUILD_LOG="$HOME/.caffine/build.log"
DMG_OUTPUT="$HOME/Desktop"
CHECK_INTERVAL=5  # seconds

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$BUILD_LOG"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$BUILD_LOG"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1" | tee -a "$BUILD_LOG"
}

# Create log directory
mkdir -p "$(dirname "$BUILD_LOG")"

# Check if repository exists
check_repo() {
    if [ ! -d "$REPO_DIR" ]; then
        error "Repository not found at $REPO_DIR"
        error "Clone it first: git clone https://github.com/chauhtnguyen/caffine.git $REPO_DIR"
        return 1
    fi
    return 0
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # PostgreSQL
    if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        log "✓ PostgreSQL is running"
    else
        warn "PostgreSQL not running - build may fail"
        warn "Start with: brew services start postgresql@17"
    fi
    
    # Redis
    if redis-cli ping > /dev/null 2>&1; then
        log "✓ Redis is running"
    else
        warn "Redis not running - build may fail"
        warn "Start with: brew services start redis"
    fi
    
    # Node.js
    if command -v node > /dev/null 2>&1; then
        log "✓ Node.js $(node --version)"
    else
        error "Node.js not found!"
        return 1
    fi
    
    # Rust
    if command -v rustc > /dev/null 2>&1; then
        log "✓ Rust $(rustc --version | cut -d' ' -f2)"
    else
        error "Rust not found!"
        return 1
    fi
    
    return 0
}

# Pull latest code
pull_latest() {
    log "Pulling latest code from GitHub..."
    cd "$REPO_DIR"
    
    # Stash any local changes
    if ! git diff-index --quiet HEAD --; then
        warn "Local changes detected, stashing..."
        git stash
    fi
    
    # Pull latest
    git pull origin canary
    
    log "✓ Code updated to $(git rev-parse --short HEAD)"
}

# Build DMG
build_dmg() {
    log "Starting DMG build..."
    log "This will take 30-45 minutes..."
    
    cd "$REPO_DIR"
    
    # Configure server
    log "Configuring server..."
    cd packages/backend/server
    cat > .env << 'EOF'
DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine"
REDIS_SERVER_HOST=localhost
REDIS_SERVER_PORT=6379
NODE_ENV=production
AFFINE_SERVER_HOST=localhost
AFFINE_SERVER_PORT=3010
AFFINE_SERVER_HTTPS=false
AFFINE_INDEXER_ENABLED=true
EOF
    
    cd "$REPO_DIR"
    
    # Install dependencies
    log "Installing dependencies..."
    yarn install >> "$BUILD_LOG" 2>&1
    
    # Build native modules
    log "Building native modules (this takes 10-15 min)..."
    yarn affine @affine/server-native build >> "$BUILD_LOG" 2>&1
    yarn affine @affine/reader build >> "$BUILD_LOG" 2>&1
    
    # Build Electron app
    log "Building Electron app and DMG (this takes 15-20 min)..."
    yarn affine @affine/electron build >> "$BUILD_LOG" 2>&1
    
    # Find DMG
    DMG_FILE=$(find packages/frontend/apps/electron/out -name "*.dmg" -type f | head -1)
    
    if [ -n "$DMG_FILE" ]; then
        # Copy to Desktop
        DMG_NAME="CAFFiNE-$(date +%Y%m%d-%H%M).dmg"
        cp "$DMG_FILE" "$DMG_OUTPUT/$DMG_NAME"
        log "✓ DMG created: $DMG_OUTPUT/$DMG_NAME"
        log "Size: $(du -h "$DMG_OUTPUT/$DMG_NAME" | cut -f1)"
        
        # Create completion marker with DMG path
        echo "$DMG_OUTPUT/$DMG_NAME" > "$COMPLETE_FILE"
        
        return 0
    else
        error "DMG file not found!"
        return 1
    fi
}

# Send notification (macOS)
notify() {
    osascript -e "display notification \"$2\" with title \"CAFFiNE Build Agent\" subtitle \"$1\""
}

# Main build function
run_build() {
    log "========================================="
    log "Build triggered"
    log "========================================="
    
    # Remove old completion marker
    rm -f "$COMPLETE_FILE"
    
    # Check prerequisites
    if ! check_prerequisites; then
        error "Prerequisites check failed"
        notify "Build Failed" "Prerequisites missing"
        return 1
    fi
    
    # Pull latest code
    if ! pull_latest; then
        error "Failed to pull latest code"
        notify "Build Failed" "Git pull failed"
        return 1
    fi
    
    # Build DMG
    if build_dmg; then
        DMG_PATH=$(cat "$COMPLETE_FILE")
        log "========================================="
        log "Build completed successfully!"
        log "DMG: $DMG_PATH"
        log "========================================="
        notify "Build Complete!" "DMG created on Desktop"
        return 0
    else
        error "Build failed"
        notify "Build Failed" "Check logs for details"
        return 1
    fi
}

# Watch mode
watch_mode() {
    log "CAFFiNE Build Agent started"
    log "Watching for trigger file: $TRIGGER_FILE"
    log "Checking every $CHECK_INTERVAL seconds"
    log "Press Ctrl+C to stop"
    log ""
    log "To trigger a build, create: $TRIGGER_FILE"
    log "Example: touch $TRIGGER_FILE"
    log ""
    
    while true; do
        if [ -f "$TRIGGER_FILE" ]; then
            log "Build trigger detected!"
            rm -f "$TRIGGER_FILE"
            
            if run_build; then
                log "Build successful, waiting for next trigger..."
            else
                error "Build failed, waiting for next trigger..."
            fi
            
            log ""
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# Manual build mode
manual_build() {
    log "Running manual build..."
    run_build
}

# Show usage
usage() {
    cat << EOF
CAFFiNE macOS Build Agent

Usage:
  $0 watch                  Start watching for build triggers
  $0 build                  Run a manual build now
  $0 status                 Check prerequisites and repo status
  $0 trigger                Create trigger file (if agent is running)
  $0 logs                   Show recent build logs

Examples:
  # Start the agent (keeps running)
  $0 watch

  # Run a one-time build
  $0 build

  # In another terminal, trigger a build
  $0 trigger

  # Or manually:
  touch $TRIGGER_FILE

Environment Variables:
  REPO_DIR        Repository location (default: ~/projects/caffine)
  CHECK_INTERVAL  Polling interval in seconds (default: 5)

Logs:
  $BUILD_LOG
EOF
}

# Show status
show_status() {
    log "CAFFiNE Build Agent Status"
    log "========================================="
    
    # Check if agent is running
    if pgrep -f "macos-build-agent.sh watch" > /dev/null; then
        log "Agent: RUNNING"
    else
        log "Agent: NOT RUNNING"
    fi
    
    # Repository status
    if [ -d "$REPO_DIR" ]; then
        cd "$REPO_DIR"
        log "Repository: $(git rev-parse --short HEAD) ($(git branch --show-current))"
        log "Location: $REPO_DIR"
    else
        warn "Repository: NOT FOUND"
    fi
    
    # Prerequisites
    check_prerequisites
    
    # Last build
    if [ -f "$COMPLETE_FILE" ]; then
        DMG_PATH=$(cat "$COMPLETE_FILE")
        log "Last DMG: $DMG_PATH"
    else
        log "Last build: No completed builds"
    fi
    
    log "========================================="
}

# Show logs
show_logs() {
    if [ -f "$BUILD_LOG" ]; then
        tail -n 50 "$BUILD_LOG"
    else
        echo "No logs yet"
    fi
}

# Main command handler
case "${1:-help}" in
    watch)
        check_repo || exit 1
        watch_mode
        ;;
    build)
        check_repo || exit 1
        manual_build
        ;;
    trigger)
        log "Creating build trigger..."
        touch "$TRIGGER_FILE"
        log "✓ Build trigger created"
        log "Agent will pick it up within $CHECK_INTERVAL seconds"
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        error "Unknown command: $1"
        echo ""
        usage
        exit 1
        ;;
esac
