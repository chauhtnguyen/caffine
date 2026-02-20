# iOS Signing & TestFlight Setup Guide

## Prerequisites

- ✅ Apple Developer Program membership
- ✅ Access to developer.apple.com
- ✅ Access to appstoreconnect.apple.com

## Step 1: Create iOS Distribution Certificate

### On Your Mac:

1. **Open Keychain Access**

   ```
   Applications → Utilities → Keychain Access
   ```

2. **Request Certificate**

   - Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
   - Email: your-apple-id@email.com
   - Common Name: "CAFFiNE iOS Distribution"
   - Select "Saved to disk"
   - Save as `CertificateSigningRequest.certSigningRequest`

3. **Create Certificate at Apple**

   - Go to https://developer.apple.com/account/resources/certificates
   - Click "+" to create new certificate
   - Select "iOS Distribution"
   - Upload the CSR file you just created
   - Download the certificate (e.g., `distribution.cer`)

4. **Install Certificate**

   - Double-click `distribution.cer` to add to Keychain
   - In Keychain Access, find "iPhone Distribution: Your Name (Team ID)"
   - Right-click → Export "iPhone Distribution: Your Name"
   - Save as `Certificates.p12`
   - **Set a password** (you'll need this for GitHub Secrets)

5. **Convert to Base64** (for GitHub Secret)
   ```bash
   base64 -i Certificates.p12 -o certificates_base64.txt
   ```

## Step 2: Create App ID & Provisioning Profile

1. **Register App ID**

   - Go to https://developer.apple.com/account/resources/identifiers
   - Click "+" → App IDs
   - Description: "CAFFiNE"
   - Bundle ID: `pro.affine.app` or `your.custom.bundle.id`
   - Enable capabilities you need (Push Notifications, iCloud, etc.)
   - Register

2. **Create Provisioning Profile**

   - Go to https://developer.apple.com/account/resources/profiles
   - Click "+" → App Store (Distribution)
   - Select your App ID
   - Select your Distribution Certificate
   - Name it: "CAFFiNE App Store Distribution"
   - Download the `.mobileprovision` file

3. **Convert to Base64**
   ```bash
   base64 -i YourProfile.mobileprovision -o provision_base64.txt
   ```

## Step 3: Create App Store Connect API Key

1. **Generate API Key**

   - Go to https://appstoreconnect.apple.com/access/integrations/api
   - Click "+" to create new key
   - Name: "GitHub Actions - CAFFiNE"
   - Access: "Admin" or "App Manager"
   - Download the `.p8` file (e.g., `AuthKey_XXXXXXXXX.p8`)
   - **Note the Key ID and Issuer ID** (shown on the page)

2. **Prepare for GitHub**
   - Key ID: `XXXXXXXXX` (10 characters)
   - Issuer ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (UUID format)
   - Key content: Open the `.p8` file in text editor, copy entire contents

## Step 4: Add Secrets to GitHub

Go to: https://github.com/chauhtnguyen/caffine/settings/secrets/actions

Click "New repository secret" for each:

| Secret Name                         | Value                                 | Source   |
| ----------------------------------- | ------------------------------------- | -------- |
| `CERTIFICATES_P12_MOBILE`           | Contents of `certificates_base64.txt` | Step 1.5 |
| `CERTIFICATES_P12_PASSWORD_MOBILE`  | Password you set for .p12             | Step 1.4 |
| `BUILD_PROVISION_PROFILE`           | Contents of `provision_base64.txt`    | Step 2.3 |
| `APPLE_STORE_CONNECT_API_KEY_ID`    | Key ID (10 chars)                     | Step 3   |
| `APPLE_STORE_CONNECT_API_ISSUER_ID` | Issuer ID (UUID)                      | Step 3   |
| `APPLE_STORE_CONNECT_API_KEY`       | Contents of AuthKey_XXX.p8 file       | Step 3   |

## Step 5: Create App in App Store Connect

1. **Create New App**

   - Go to https://appstoreconnect.apple.com/apps
   - Click "+" → New App
   - Platform: iOS
   - Name: CAFFiNE
   - Primary Language: English
   - Bundle ID: Select the one you created in Step 2.1
   - SKU: `caffine` (or any unique identifier)

2. **Configure App Info**
   - Add app icon (1024x1024)
   - Screenshots (required for release, can skip for TestFlight)
   - App description
   - Privacy Policy URL (if required)

## Step 6: Update Bundle ID in Project

Edit `packages/frontend/apps/ios/capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'pro.affine.app', // Or your custom bundle ID
  appName: 'CAFFiNE',
  // ... rest of config
};
```

Also update `packages/frontend/apps/ios/App/App.xcodeproj/project.pbxproj`:

- Search for `PRODUCT_BUNDLE_IDENTIFIER`
- Change all occurrences to your bundle ID

## Step 7: Configure Fastlane (Optional)

The workflow uses Fastlane for TestFlight upload. Check if Fastfile exists:

```bash
cat packages/frontend/apps/ios/fastlane/Fastfile
```

If missing, create it:

```ruby
default_platform(:ios)

platform :ios do
  desc "Push a new beta build to TestFlight"
  lane :beta do
    build_app(
      workspace: "App.xcworkspace",
      scheme: "App",
      export_method: "app-store",
      configuration: "Release"
    )

    upload_to_testflight(
      api_key_path: nil, # Will use environment variables
      skip_waiting_for_build_processing: true
    )
  end
end
```

## Step 8: Enable iOS Build in Workflow

The iOS build is currently in the workflow but may need activation. Check `.github/workflows/caffine-release.yml`.

Add iOS to the release job if not present:

```yaml
create-release:
  needs: [prepare, build-macos, build-ios]
```

## Step 9: Test the Build

1. **Trigger workflow**

   ```bash
   git commit --allow-empty -m "test: trigger iOS build"
   git push origin canary
   ```

2. **Monitor build**

   - https://github.com/chauhtnguyen/caffine/actions
   - Look for "Build iOS/iPadOS" job
   - Check for errors in signing step

3. **Check TestFlight**
   - After successful build (~30-40 min)
   - Go to https://appstoreconnect.apple.com
   - TestFlight → Your App
   - Should see new build processing

## Troubleshooting

### "No matching provisioning profile found"

- Verify bundle ID matches in:
  - App Store Connect
  - Provisioning Profile
  - capacitor.config.ts
  - Xcode project

### "Certificate expired"

- Renew certificate at developer.apple.com
- Export new .p12
- Update `CERTIFICATES_P12_MOBILE` secret

### "API key invalid"

- Check Key ID, Issuer ID, and .p8 content
- Ensure API key has proper permissions in App Store Connect

### "Signing identity not found"

- Verify .p12 password is correct
- Check that certificate is "iPhone Distribution" not "iPhone Developer"

## TestFlight Distribution

Once build succeeds:

1. **Add External Testers**

   - App Store Connect → TestFlight → External Groups
   - Create group, add testers by email
   - Submit for Beta App Review (first time only)

2. **Internal Testing**
   - Add team members (up to 100)
   - No review required
   - Instant access after build processes

## Automation Summary

After setup, every push to `canary`:

1. Builds web bundle
2. Syncs to Capacitor
3. Compiles native iOS app
4. Signs with your certificates
5. Uploads to TestFlight automatically
6. Testers get notified of new build

---

**Security Notes:**

- Never commit certificates or API keys to git
- Use GitHub Secrets for all sensitive data
- Rotate API keys periodically
- Keep .p12 password secure

**Next Steps After Setup:**

1. Verify all secrets are added to GitHub
2. Update bundle ID in project files
3. Push to trigger build
4. Monitor Actions for success
5. Check TestFlight for new build

---

Need help with any step? Let me know which part you're on!
