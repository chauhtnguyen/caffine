# macOS Build Agent Setup

Automated build system for CAFFiNE - trigger builds from anywhere!

---

## Quick Setup

### 1. Clone Repository (if not already)

```bash
cd ~/projects
git clone https://github.com/chauhtnguyen/caffine.git
cd caffine
```

### 2. Start the Build Agent

```bash
# In a terminal that you keep open:
cd ~/projects/caffine
./macos-build-agent.sh watch
```

**Output:**
```
[2026-02-21 02:30:00] CAFFiNE Build Agent started
[2026-02-21 02:30:00] Watching for trigger file: /tmp/caffine-build-trigger
[2026-02-21 02:30:00] Checking every 5 seconds
[2026-02-21 02:30:00] Press Ctrl+C to stop

To trigger a build, create: /tmp/caffine-build-trigger
Example: touch /tmp/caffine-build-trigger
```

The agent is now running and waiting for build triggers!

---

## How to Trigger a Build

### Option 1: From Terminal (on Mac)

```bash
# In another terminal:
cd ~/projects/caffine
./macos-build-agent.sh trigger
```

Or manually:
```bash
touch /tmp/caffine-build-trigger
```

### Option 2: From VM (Virgil triggers remotely)

```bash
# Virgil runs this on VM:
# (Assuming shared folder or SSH access)
ssh mac-user@your-mac "touch /tmp/caffine-build-trigger"
```

Or if shared folder is mounted:
```bash
# Create trigger file that Mac can see
touch /path/to/shared/trigger
```

### Option 3: Automated on Git Push

Set up a git hook (optional):

```bash
# In ~/projects/caffine/.git/hooks/post-merge
#!/bin/bash
touch /tmp/caffine-build-trigger
```

Make it executable:
```bash
chmod +x ~/projects/caffine/.git/hooks/post-merge
```

Now builds trigger automatically when you pull from git!

---

## What Happens When Triggered

1. **Pull Latest Code**
   - `git pull origin canary`
   - Gets latest changes from GitHub

2. **Check Prerequisites**
   - PostgreSQL running?
   - Redis running?
   - Node.js installed?
   - Rust installed?

3. **Install Dependencies**
   - `yarn install`

4. **Build Native Modules**
   - `yarn affine @affine/server-native build` (10-15 min)
   - `yarn affine @affine/reader build`

5. **Build DMG**
   - `yarn affine @affine/electron build` (15-20 min)
   - Copy to `~/Desktop/CAFFiNE-YYYYMMDD-HHMM.dmg`

6. **Notify**
   - macOS notification: "Build Complete!"
   - Creates `/tmp/caffine-build-complete` marker

**Total Time:** 30-45 minutes

---

## Commands

### Start Agent (Keep Running)

```bash
./macos-build-agent.sh watch
```

Watches for trigger files and automatically builds when detected.

### Manual Build (One-Time)

```bash
./macos-build-agent.sh build
```

Runs a build immediately without waiting for trigger.

### Trigger Build

```bash
./macos-build-agent.sh trigger
```

Creates trigger file. Agent picks it up within 5 seconds.

### Check Status

```bash
./macos-build-agent.sh status
```

Shows:
- Agent running? ✓/✗
- Current git commit
- Prerequisites status
- Last DMG location

### View Logs

```bash
./macos-build-agent.sh logs
```

Shows last 50 lines of build log.

Full logs at: `~/.caffine/build.log`

---

## Running as Background Service (launchd)

To keep the agent running permanently, even after reboot:

### 1. Create Launch Agent

```bash
cat > ~/Library/LaunchAgents/com.caffine.buildagent.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.caffine.buildagent</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/YOUR_USERNAME/projects/caffine/macos-build-agent.sh</string>
        <string>watch</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USERNAME/projects/caffine</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/.caffine/agent.log</string>
    
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/.caffine/agent-error.log</string>
</dict>
</plist>
EOF
```

**Replace `YOUR_USERNAME` with your actual username!**

### 2. Load Service

```bash
launchctl load ~/Library/LaunchAgents/com.caffine.buildagent.plist
```

### 3. Manage Service

```bash
# Check status
launchctl list | grep caffine

# Stop
launchctl stop com.caffine.buildagent

# Start
launchctl start com.caffine.buildagent

# Unload (disable)
launchctl unload ~/Library/LaunchAgents/com.caffine.buildagent.plist
```

Now the build agent runs automatically on boot!

---

## Triggering from VM

### Option A: SSH Trigger

If you have SSH access from VM to Mac:

```bash
# On VM:
ssh your-mac-user@192.168.65.1 "touch /tmp/caffine-build-trigger"
```

### Option B: Shared Folder Trigger

Create a trigger file in a shared location:

```bash
# On VM:
touch /media/share/build-trigger

# On Mac, agent watches:
while true; do
  if [ -f /path/to/shared/build-trigger ]; then
    rm /path/to/shared/build-trigger
    touch /tmp/caffine-build-trigger
  fi
  sleep 5
done
```

### Option C: HTTP Webhook

Set up a simple web server on Mac that creates the trigger file when hit.

---

## Notifications

The agent sends macOS notifications for:
- ✓ Build completed successfully
- ✗ Build failed (check logs)
- ⚠ Prerequisites missing

You'll see notifications even if the terminal is in the background.

---

## Logs

**Build logs:** `~/.caffine/build.log`

```bash
# View live
tail -f ~/.caffine/build.log

# View recent
./macos-build-agent.sh logs

# Search for errors
grep ERROR ~/.caffine/build.log
```

---

## Workflow Example

**Virgil (on VM):**
```bash
# Make code changes
cd ~/projects/caffine
# Edit files...

# Commit and push
git add .
git commit -m "feat: new feature"
git push origin canary
```

**Mac Build Agent (automatic):**
```
[Detected git push hook]
→ Create trigger file
→ Pull latest code
→ Build DMG (30-45 min)
→ Save to Desktop
→ Notify "Build Complete!"
```

**Chau (on Mac):**
```
[Sees notification]
→ Open Desktop
→ Find CAFFiNE-20260221-1430.dmg
→ Install and test
```

---

## Troubleshooting

### Agent Not Detecting Trigger

```bash
# Check agent is running
ps aux | grep macos-build-agent

# Check trigger file location
ls -la /tmp/caffine-build-trigger

# Try manual trigger
touch /tmp/caffine-build-trigger
```

### Build Fails

```bash
# Check logs
./macos-build-agent.sh logs

# Check prerequisites
./macos-build-agent.sh status

# Start required services
brew services start postgresql@17
brew services start redis
```

### No Notifications

```bash
# Check System Settings > Notifications
# Ensure Terminal (or Script Editor) can send notifications

# Test manually
osascript -e 'display notification "Test" with title "Test"'
```

---

## Configuration

Edit environment variables in the script:

```bash
# Default values
REPO_DIR="$HOME/projects/caffine"          # Repository location
TRIGGER_FILE="/tmp/caffine-build-trigger"  # Trigger file path
CHECK_INTERVAL=5                           # Polling interval (seconds)
```

Or set as environment variables:

```bash
REPO_DIR=~/different/path ./macos-build-agent.sh watch
```

---

## Summary

**Setup (once):**
```bash
cd ~/projects/caffine
./macos-build-agent.sh watch  # Keep this running
```

**Trigger build (anytime):**
```bash
./macos-build-agent.sh trigger
# Or: touch /tmp/caffine-build-trigger
```

**Result:**
- DMG appears on Desktop in 30-45 minutes
- macOS notification when done
- Fully automated!

---

**Now you can trigger builds from anywhere! 🚀**
