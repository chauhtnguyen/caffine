# CAFFiNE Auto-Update Implementation Guide

## Overview

This implementation enables **frictionless auto-updates** for CAFFiNE (your AFFiNE fork) using the same mechanism as the official AFFiNE app. Users get an "Update available" button in the app's lower-left corner, click it, and the app updates seamlessly.

## Architecture

### Update Flow
```
Push to canary → GitHub Actions builds → Creates GitHub Release → App checks for updates → Downloads & installs
```

### Components

1. **CAFFiNEUpdateProvider** (`caffine-update-provider.ts`)
   - Custom update provider that fetches releases from `chauhtnguyen/caffine` GitHub repo
   - Uses GitHub API directly (no proxy server needed)
   - Filters releases by channel (canary/beta/stable)
   - Maps release assets to download URLs

2. **GitHub Actions Workflow** (`.github/workflows/caffine-release.yml`)
   - Triggers on push to `canary` branch
   - Builds macOS DMG for both Intel (x64) and Apple Silicon (arm64)
   - Creates GitHub Release with version tag
   - Uploads DMG, ZIP, and `latest.yml` metadata file

3. **Electron Updater Integration**
   - Modified `electron-updater.ts` to use CAFFiNEUpdateProvider
   - Checks for updates every 30 minutes when app is focused
   - Downloads updates in background
   - Prompts user to install when ready

## How It Works

### 1. Version Generation
- Format: `YYYY.M.D-canary.HHMM` (e.g., `2026.2.20-canary.2200`)
- Generated from current timestamp on each build
- Tag created as `vYYYY.M.D-canary.HHMM`

### 2. Build Process
```yaml
macOS (Intel):     runner: macos-13,  target: x86_64-apple-darwin
macOS (M1/M2/M3):  runner: macos-14,  target: aarch64-apple-darwin
```

Each build:
1. Installs dependencies
2. Builds Rust native modules
3. Generates Electron assets
4. Packages DMG (unsigned)
5. Creates ZIP archive
6. Uploads to GitHub Release

### 3. Update Detection

The app checks GitHub API:
```
GET https://api.github.com/repos/chauhtnguyen/caffine/releases
```

Filters for canary releases (prerelease: true), downloads `latest.yml`, verifies checksums, and prompts user.

### 4. Installation Flow

1. User clicks "Update" button
2. App downloads DMG in background
3. Shows progress in UI
4. When complete, prompts "Quit and Install"
5. User clicks → app quits → macOS mounts DMG → replaces app → relaunches

## Setup Instructions

### Prerequisites

✅ Already configured:
- GitHub repository with Actions enabled
- Node.js 22.16.0
- Rust toolchain
- Git SSH access

### Activation Steps

**1. Merge the auto-update branch**

```bash
cd ~/projects/caffine
git checkout canary
git merge virgil-auto-update-setup
git push origin canary
```

This will:
- Trigger the GitHub Actions workflow automatically
- Build macOS apps for both architectures
- Create a GitHub Release with DMG files

**2. Wait for first build** (~20-30 minutes)

Monitor at: https://github.com/chauhtnguyen/caffine/actions

**3. Download and install the first build**

Once the workflow completes:
1. Go to https://github.com/chauhtnguyen/caffine/releases
2. Download the appropriate DMG:
   - Intel Mac: `affine-YYYY.M.D-canary.HHMM-canary-macos-x64.dmg`
   - Apple Silicon: `affine-YYYY.M.D-canary.HHMM-canary-macos-arm64.dmg`
3. Open DMG, drag app to Applications
4. **First launch**: Right-click → Open (bypass unsigned app warning)

**4. Verify auto-update works**

After installation:
1. Make a code change (e.g., edit README)
2. Commit and push to `canary` branch
3. Wait for build to complete (~20-30 min)
4. Open your installed app
5. Check lower-left corner for "Update available" button
6. Click it → app downloads update → prompts to restart

## Code Signing (Optional but Recommended)

### Current Status: Unsigned Builds

**Pros:**
- No Apple Developer account needed ($99/year)
- Works immediately

**Cons:**
- macOS Gatekeeper warning on first launch
- Users must right-click → Open to bypass

### To Add Code Signing

**Requirements:**
1. Apple Developer account ($99/year)
2. Developer ID Application certificate
3. Developer ID Installer certificate

**Steps:**
1. Enroll at https://developer.apple.com
2. Create certificates in Keychain Access
3. Export certificates as `.p12` files
4. Add to GitHub Secrets:
   - `CERTIFICATES_P12` (base64-encoded .p12)
   - `CERTIFICATES_P12_PASSWORD`
   - `APPLE_ID`
   - `APPLE_PASSWORD` (app-specific password)
   - `APPLE_TEAM_ID`

5. Uncomment signing step in workflow:
```yaml
- name: Signing By Apple Developer ID
  uses: apple-actions/import-codesign-certs@v5
  with:
    p12-file-base64: ${{ secrets.CERTIFICATES_P12 }}
    p12-password: ${{ secrets.CERTIFICATES_P12_PASSWORD }}
```

## Customization

### Change Update Channel

Edit `caffine-release.yml`:
```yaml
BUILD_TYPE: canary  # Change to 'beta' or 'stable'
```

### Trigger Manually

Instead of auto-triggering on push:
```yaml
on:
  workflow_dispatch:
    inputs:
      create-release:
        description: 'Create GitHub Release?'
        type: boolean
        default: true
```

Then trigger from GitHub UI: Actions → CAFFiNE Release → Run workflow

### Adjust Check Frequency

Edit `electron-updater.ts`:
```typescript
// Current: checks every 30 minutes (1800 seconds)
lastCheckTime + 1000 * 1800 < Date.now()

// Change to 1 hour:
lastCheckTime + 1000 * 3600 < Date.now()
```

## Troubleshooting

### Build Fails

**Check GitHub Actions logs:**
https://github.com/chauhtnguyen/caffine/actions

Common issues:
- Node version mismatch → Update `setup-node` version
- Rust compilation errors → Check `Cargo.toml` dependencies
- Out of memory → Increase `NODE_OPTIONS` memory limit

### Update Not Detected

**Verify latest.yml is present:**
https://github.com/chauhtnguyen/caffine/releases/latest

Should contain:
```yaml
version: YYYY.M.D-canary.HHMM
files:
  - url: affine-YYYY.M.D-canary.HHMM-canary-macos-arm64.dmg
    sha512: <hash>
    size: <bytes>
```

**Check app logs:**
```bash
# macOS Console app → search for "affine" or "updater"
# Or check in app: Help → Toggle Developer Tools → Console
```

### Download Fails

**Verify asset URLs in latest.yml:**
- Should use `browser_download_url` from GitHub API
- Format: `https://github.com/chauhtnguyen/caffine/releases/download/vX.Y.Z/file.dmg`

## Maintenance

### Regular Updates

Simply push code to `canary` branch:
```bash
git add .
git commit -m "feat: your changes"
git push origin canary
```

GitHub Actions handles the rest automatically.

### Clean Up Old Releases

GitHub retains all releases indefinitely. To clean up:
1. Go to https://github.com/chauhtnguyen/caffine/releases
2. Delete old canary releases (keep last 5-10)
3. Or automate with GitHub API

### Monitor Build Times

Current estimate: ~20-30 minutes per build
- Node modules: ~5 min
- Rust native build: ~10 min
- Electron packaging: ~5 min
- Upload & release: ~2 min

## Comparison with Docker Approach

| Aspect | GitHub Releases Auto-Update | Docker |
|--------|----------------------------|--------|
| **User Experience** | Native macOS app, seamless updates | Web interface or containers |
| **Update Method** | Click button in app | Pull new image, restart |
| **Code Signing** | Optional (unsigned works) | Not applicable |
| **Build Time** | 20-30 min (automated) | Manual build + transfer |
| **Storage** | GitHub (unlimited releases) | Docker registry |
| **Offline Access** | App works offline | Needs Docker daemon |
| **Native Features** | Full macOS integration | Limited to container |

## Next Steps

1. ✅ Code changes committed to `virgil-auto-update-setup` branch
2. ⏳ Merge to `canary` branch to trigger first build
3. ⏳ Download first release from GitHub
4. ⏳ Install and test auto-update flow
5. 🔄 (Optional) Set up Apple Developer account for signing

## Support

If issues arise:
- Check workflow logs: https://github.com/chauhtnguyen/caffine/actions
- Review update provider code: `packages/frontend/apps/electron/src/main/updater/caffine-update-provider.ts`
- Compare with official AFFiNE: `affine-update-provider.ts`

---

**Implementation by:** Virgil Clemens  
**Date:** 2026-02-20  
**Status:** Ready for testing
