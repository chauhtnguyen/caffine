# CAFFiNE Development Workflow

**Project:** CAFFiNE (AFFiNE fork)  
**Team:** Chau Nguyen + Virgil Clemens (AI Assistant)  
**Repository:** https://github.com/chauhtnguyen/caffine  
**Updated:** 2026-02-21

---

## Environment Setup

### Development Environment (VM)
- **Location:** Ubuntu 24.04 VM (arm64) on UTM
- **IP:** 192.168.65.2
- **OpenClaw Gateway:** Port 18789
- **Capabilities:** Backend development, testing, web builds
- **Limitations:** Cannot build macOS DMG files

### Production Environment (Mac)
- **Location:** Chau's macOS machine (Apple Silicon)
- **PostgreSQL:** 17.7 (Homebrew)
- **Redis:** Latest (Homebrew)
- **Capabilities:** Full builds (native modules, DMG creation)
- **Shared Access:** VM project folder mounted via `/media/share/`

---

## Three-Phase Workflow

### Phase 1: DEVELOPMENT (VM - Daily)

**Who:** Virgil (AI Assistant) on VM  
**Frequency:** Daily, multiple iterations  
**Cost:** FREE  

**Activities:**
1. Write code (TypeScript/React/Rust)
2. Implement features
3. Fix bugs
4. Update documentation
5. Run linters and type checks

**Commands:**
```bash
# On VM
cd ~/projects/caffine

# Make changes
# Edit files in packages/backend/, packages/frontend/, etc.

# Type check
yarn tsc --noEmit

# Lint
yarn lint

# Format
yarn format

# Build backend (if needed)
yarn affine server build

# Build web frontend
yarn affine @affine/web build
```

**Output:**
- Source code changes
- Updated documentation
- Ready for testing

**Quality Gates:**
- ✅ TypeScript compiles without errors
- ✅ ESLint passes
- ✅ Code formatted (Prettier)
- ✅ No obvious runtime errors

---

### Phase 2: TESTING (Web Browser - Daily/Weekly)

**Who:** Chau + Virgil  
**Frequency:** Daily for small changes, weekly for feature reviews  
**Cost:** FREE  

**Setup:**

**On VM:**
```bash
cd ~/projects/caffine

# Start backend server
yarn affine server dev
# Runs on http://192.168.65.2:3010

# In another terminal, start frontend
yarn dev
# Select "web" when prompted
# Runs on http://192.168.65.2:8080
```

**Access from Mac:**
```
Open browser: http://192.168.65.2:8080
```

**Testing Checklist:**

**Basic Functionality:**
- [ ] App loads without errors
- [ ] Can create/edit/delete documents
- [ ] Workspaces work correctly
- [ ] Settings pages accessible

**New Features (e.g., Database UI):**
- [ ] Settings → Workspace → Preferences → Local Datastore
- [ ] Can edit database configuration
- [ ] Test Connection works
- [ ] Save Configuration works
- [ ] Reconnection dialog appears when database offline

**Browser Testing:**
- Chrome/Edge (primary)
- Safari (macOS native)
- Firefox (optional)

**Feedback Loop:**
1. Chau tests feature in browser
2. Reports bugs/issues via Discord
3. Virgil fixes on VM
4. Chau re-tests
5. Repeat until approved

**Approval Criteria:**
- ✅ All features work as expected
- ✅ No console errors
- ✅ UI/UX meets requirements
- ✅ Performance acceptable
- ✅ Database operations work correctly

---

### Phase 3: RELEASE (DMG Build - As Needed)

**Who:** Chau (triggers), automated build  
**Frequency:** When features are ready for distribution  
**Cost:** FREE (local Mac) or $2-4 (GitHub Actions)  

**Trigger Conditions:**
- New feature complete and tested
- Bug fixes accumulated
- Weekly/monthly release cycle
- User requests update

**Release Process:**

#### Option A: Local Mac Build (Current - FREE)

**Prerequisites:**
```bash
# On Mac - ensure services running
brew services start postgresql@17
brew services start redis
pg_isready -h localhost -p 5432
redis-cli ping
```

**Build Steps:**
```bash
# 1. Navigate to shared project
cd /Volumes/VirtualClaw-VM/projects/caffine

# 2. Run build script
bash ./build-complete-dmg.sh

# Wait 30-45 minutes

# 3. DMG created at:
# ~/Desktop/CAFFiNE.dmg
```

**Verification:**
```bash
# Check DMG exists
ls -lh ~/Desktop/CAFFiNE.dmg

# Size should be 200-400 MB
```

**Distribution:**
1. Install and test locally first
2. Upload to cloud storage (Google Drive, Dropbox, etc.)
3. Share link with users
4. Or create GitHub release (manual upload)

#### Option B: GitHub Actions (Future - $2-4 per build)

**Setup (one-time):**

Create `.github/workflows/release-dmg.yml`:
```yaml
name: Build macOS DMG

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-dmg:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
      
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies
        run: yarn install
      
      - name: Build native modules
        run: |
          yarn affine @affine/server-native build
          yarn affine @affine/reader build
      
      - name: Build DMG
        run: yarn affine @affine/electron build
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: CAFFiNE-macOS
          path: packages/frontend/apps/electron/out/*.dmg
      
      - name: Create Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v1
        with:
          files: packages/frontend/apps/electron/out/*.dmg
```

**Trigger Build:**
```bash
# Method 1: Tag release
git tag v0.1.0
git push origin v0.1.0

# Method 2: Manual trigger
# Go to GitHub Actions → Build macOS DMG → Run workflow
```

**Cost:** ~$2.40-3.60 per build (30-45 min × $0.08/min)

---

## Workflow Summary

### Day-to-Day Development

```
┌─────────────────────────────────────┐
│  Virgil (VM)                        │
│  • Writes code                      │
│  • Implements features              │
│  • Fixes bugs                       │
│  • Updates docs                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  VM: Start Web Server               │
│  • yarn affine server dev           │
│  • yarn dev (web)                   │
│  • http://192.168.65.2:8080         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Chau (Mac Browser)                 │
│  • Tests features                   │
│  • Reports bugs                     │
│  • Approves when ready              │
└──────────────┬──────────────────────┘
               │
               ▼ (when approved)
┌─────────────────────────────────────┐
│  Mac: Build DMG                     │
│  • bash build-complete-dmg.sh       │
│  • Wait 30-45 min                   │
│  • DMG → Desktop                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Distribution                       │
│  • Upload to cloud                  │
│  • Share with users                 │
│  • Or GitHub release                │
└─────────────────────────────────────┘
```

---

## File Locations

### VM Development
- **Project:** `~/projects/caffine/`
- **Shared to Mac:** `/media/share/projects/caffine/`
- **Web server:** `http://192.168.65.2:8080`
- **Backend API:** `http://192.168.65.2:3010`

### Mac Access
- **Mounted at:** `/Volumes/VirtualClaw-VM/projects/caffine/`
- **Build script:** `/Volumes/VirtualClaw-VM/projects/caffine/build-complete-dmg.sh`
- **DMG output:** `~/Desktop/CAFFiNE.dmg`

### GitHub Repository
- **URL:** `https://github.com/chauhtnguyen/caffine`
- **Branch:** `canary` (main development)
- **Releases:** `https://github.com/chauhtnguyen/caffine/releases`

---

## Version Control Workflow

### Branching Strategy

**Main Branches:**
- `canary` - Main development branch (default)
- `main` or `master` - Stable releases (optional)

**Feature Branches:**
- `feature/database-config-ui`
- `feature/auto-updates`
- `fix/bug-description`

### Commit Workflow

```bash
# On VM
cd ~/projects/caffine

# Create feature branch (optional)
git checkout -b feature/new-feature

# Make changes
# ... edit files ...

# Stage changes
git add .

# Commit
git commit -m "feat: add database configuration UI

- Add backend API endpoints
- Create settings panel component
- Implement reconnection dialog
- Update documentation"

# Push to GitHub
git push origin feature/new-feature

# Or push to canary directly
git checkout canary
git merge feature/new-feature
git push origin canary
```

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes bug nor adds feature
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintain/tooling

**Examples:**
```
feat: add database configuration UI

Add runtime database configuration through Settings UI.
Users can now configure PostgreSQL connection without editing .env files.

Closes #123

---

fix: reconnection dialog not appearing

Fixed issue where reconnection dialog wouldn't show when database went offline.
Now properly detects connection loss and displays dialog with retry options.

---

docs: update installation instructions

Added section on database setup and configuration.
Included troubleshooting guide for common issues.
```

---

## Release Versioning

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH` (e.g., `0.1.0`, `1.2.3`)

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes (backward compatible)

### Release Process

**1. Decide Version Number**
```
Current: 0.22.4 (from upstream AFFiNE)
Next release examples:
- 0.22.5 - Bug fixes only
- 0.23.0 - New features (database UI)
- 1.0.0 - Major milestone / stable release
```

**2. Update Version**
```bash
# Update package.json
cd ~/projects/caffine
npm version 0.23.0

# This creates a git tag automatically
```

**3. Update CHANGELOG**
```bash
# Edit CHANGELOG.md
cat >> CHANGELOG.md << 'EOF'
## [0.23.0] - 2026-02-21

### Added
- Runtime database configuration UI
- Connection testing and status monitoring
- Reconnection dialog with auto-retry
- Settings accessible when database offline

### Fixed
- Database connection error handling
- Configuration persistence across restarts

### Changed
- Moved database config from .env to UI
EOF
```

**4. Commit and Tag**
```bash
git add .
git commit -m "chore: release v0.23.0"
git tag -a v0.23.0 -m "Release version 0.23.0"
git push origin canary --tags
```

**5. Build DMG**
```bash
# On Mac
cd /Volumes/VirtualClaw-VM/projects/caffine
bash ./build-complete-dmg.sh
```

**6. Create GitHub Release**
```bash
# Manual:
# 1. Go to https://github.com/chauhtnguyen/caffine/releases
# 2. Click "Create a new release"
# 3. Select tag v0.23.0
# 4. Upload DMG file
# 5. Write release notes (copy from CHANGELOG)
# 6. Publish

# Or use GitHub CLI:
gh release create v0.23.0 ~/Desktop/CAFFiNE.dmg \
  --title "CAFFiNE v0.23.0" \
  --notes "See CHANGELOG.md for details"
```

---

## Quality Standards

### Code Quality

**Before Committing:**
- [ ] TypeScript compiles (`yarn tsc --noEmit`)
- [ ] No ESLint errors (`yarn lint`)
- [ ] Code formatted (`yarn format`)
- [ ] No console.log statements (use proper logging)
- [ ] Comments for complex logic
- [ ] Type safety (no `any` types unless necessary)

**Before Merging:**
- [ ] Feature tested in web browser
- [ ] No regressions in existing features
- [ ] Documentation updated
- [ ] CHANGELOG updated (for releases)

**Before Release:**
- [ ] All tests pass
- [ ] DMG builds successfully
- [ ] DMG installs and runs on clean Mac
- [ ] All features work in installed app
- [ ] No critical bugs
- [ ] Release notes written

---

## Documentation Standards

### Required Documentation

**For Each Feature:**
1. **Feature spec** - What it does, why, how to use
2. **Implementation details** - Architecture, key files
3. **User guide** - How users interact with it
4. **API docs** - If adds API endpoints
5. **Troubleshooting** - Common issues and solutions

**Documentation Files:**
- `README.md` - Project overview
- `CHANGELOG.md` - Version history
- `docs/BUILDING.md` - Build instructions
- `docs/DEVELOPMENT.md` - Development setup
- `DEV_WORKFLOW.md` - This file
- Feature-specific: `FEATURE_*.md`

### Documentation Updates

**When Adding Features:**
```bash
# Create feature doc
cat > FEATURE_DATABASE_CONFIG_UI.md << 'EOF'
# Database Configuration UI

## Overview
...

## User Guide
...

## API Reference
...
EOF

# Update README if needed
# Update main documentation index
```

---

## Communication Protocol

### Discord Channels

**#dev-caffeine**
- Development discussions
- Bug reports
- Feature requests
- Build status updates
- Release announcements

### Status Updates

**Daily (if actively developing):**
- What was implemented
- Current status
- Blockers (if any)
- Next steps

**Weekly:**
- Summary of changes
- Features completed
- Features in progress
- Upcoming priorities

**Release:**
- Version number
- New features
- Bug fixes
- Breaking changes (if any)
- Download link

---

## Emergency Procedures

### Critical Bug in Production

**Process:**
1. Virgil creates hotfix branch
2. Implements fix on VM
3. Tests via web browser
4. Chau approves
5. Build new DMG immediately
6. Release as patch version (e.g., 0.23.1)
7. Notify users

### Database Connection Issues

**Debugging:**
1. Check PostgreSQL running: `pg_isready`
2. Check Redis running: `redis-cli ping`
3. Test connection via API: `curl http://localhost:3010/api/database/status`
4. Check logs: `tail -f ~/.affine/logs/server.log`
5. Verify config: `cat ~/.affine/config/database.json`

### Build Failures

**Local Mac Build:**
1. Check prerequisites running
2. Check disk space (need ~5GB free)
3. Clean and retry: `yarn clean && yarn install`
4. Check build logs for specific errors
5. Ask Virgil for help with error messages

**GitHub Actions Build:**
1. Check workflow logs in GitHub
2. Check if macOS runner is available
3. Check if rate limits exceeded
4. Retry workflow if transient error

---

## Tools & Resources

### Development Tools

**On VM:**
- VS Code (or preferred editor)
- Git
- Node.js 22+
- Yarn package manager
- PostgreSQL 17
- Redis

**On Mac:**
- Xcode (for DMG signing, optional)
- Homebrew
- PostgreSQL 17
- Redis
- Git

### Useful Commands

```bash
# Check project size
du -sh ~/projects/caffine

# Clean build artifacts
yarn clean

# Check for outdated dependencies
yarn outdated

# Update dependencies (carefully!)
yarn upgrade-interactive

# Find large files
find . -type f -size +10M

# Count lines of code
find packages -name "*.ts" -o -name "*.tsx" | xargs wc -l
```

---

## Future Improvements

### Potential Optimizations

**Development:**
- [ ] Set up hot-reload for faster iteration
- [ ] Add pre-commit hooks (lint, format)
- [ ] Automated tests (unit, integration)
- [ ] Continuous integration (lint, test on push)

**Build:**
- [ ] Optimize build time (incremental builds)
- [ ] Cache dependencies in CI
- [ ] Parallel builds where possible
- [ ] Build for multiple platforms (Windows, Linux)

**Distribution:**
- [ ] Auto-update mechanism
- [ ] Code signing for macOS
- [ ] Notarization with Apple
- [ ] Homebrew cask formula
- [ ] Snap/Flatpak for Linux

**Workflow:**
- [ ] Automated changelog generation
- [ ] Release drafter (auto-generate release notes)
- [ ] Semantic release automation
- [ ] PR templates for structured contributions

---

## Key Takeaways

✅ **Development:** VM (Virgil) - Fast, free, daily iterations  
✅ **Testing:** Web browser (Chau) - No DMG needed for validation  
✅ **Release:** Mac build (Chau) - Only when features approved  
✅ **Cost:** $0 for most development, optional $2-4 for automated builds  
✅ **Quality:** Test in browser first, DMG build is final verification  

**This workflow maximizes development speed while minimizing build costs.**

---

**Last Updated:** 2026-02-21  
**Next Review:** When workflow changes needed
