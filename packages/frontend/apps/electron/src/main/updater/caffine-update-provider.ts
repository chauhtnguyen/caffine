// CAFFiNE Custom Update Provider - GitHub Releases Direct Integration
// Modified from AFFiNE's update provider to use chauhtnguyen/caffine GitHub releases directly

import {
  CancellationToken,
  type CustomPublishOptions,
  newError,
  type UpdateInfo,
} from 'builder-util-runtime';
import type { AppUpdater, ResolvedUpdateFileInfo } from 'electron-updater';
import { Provider } from 'electron-updater';
import type { ProviderRuntimeOptions } from 'electron-updater/out/providers/Provider';
import {
  getFileList,
  parseUpdateInfo,
} from 'electron-updater/out/providers/Provider';

import type { buildType } from '../config';
import { availableForMyPlatformAndInstaller } from './affine-update-provider';
import { isSquirrelBuild } from './utils';

interface GithubUpdateInfo extends UpdateInfo {
  tag: string;
}

interface GithubRelease {
  url: string;
  name: string;
  tag_name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  assets: Array<{
    name: string;
    url: string;
    browser_download_url: string;
    size: number;
  }>;
}

interface UpdateProviderOptions {
  owner?: string;
  repo?: string;
  channel: typeof buildType;
}

export class CAFFiNEUpdateProvider extends Provider<GithubUpdateInfo> {
  static configFeed(options: UpdateProviderOptions): CustomPublishOptions {
    return {
      provider: 'custom',
      owner: 'chauhtnguyen',
      repo: 'caffine',
      updateProvider: CAFFiNEUpdateProvider,
      ...options,
    };
  }

  constructor(
    private readonly options: CustomPublishOptions & UpdateProviderOptions,
    _updater: AppUpdater,
    runtimeOptions: ProviderRuntimeOptions
  ) {
    super(runtimeOptions);
  }

  get feedUrl(): URL {
    const owner = this.options.owner || 'chauhtnguyen';
    const repo = this.options.repo || 'caffine';
    // Use GitHub API to list releases
    // Filter by channel (canary/beta/stable) in getLatestVersion
    return new URL(`https://api.github.com/repos/${owner}/${repo}/releases`);
  }

  async getLatestVersion(): Promise<GithubUpdateInfo> {
    const cancellationToken = new CancellationToken();

    const releasesJsonStr = await this.httpRequest(
      this.feedUrl,
      {
        accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'cache-control': 'no-cache',
      },
      cancellationToken
    );

    if (!releasesJsonStr) {
      throw new Error(
        `Failed to get releases from ${this.feedUrl.toString()}, response is empty`
      );
    }

    const allReleases = JSON.parse(releasesJsonStr) as GithubRelease[];

    if (allReleases.length === 0) {
      throw new Error(`No published versions found in ${this.options.repo}`);
    }

    // Filter by channel (stable, beta, or canary)
    const channelReleases = allReleases.filter(release => {
      const tag = release.tag_name;
      const channel = this.options.channel;

      if (channel === 'stable') {
        // Stable: v1.0.0 (no suffix)
        return /^v?\d+\.\d+\.\d+$/.test(tag);
      } else if (channel === 'beta') {
        // Beta: v1.0.0-beta.1
        return /^v?\d+\.\d+\.\d+-beta\.\d+$/.test(tag);
      } else {
        // Canary: v2026.2.20-canary.2200 or any prerelease
        return release.prerelease === true;
      }
    });

    if (channelReleases.length === 0) {
      throw new Error(
        `No published versions in channel ${this.options.channel}`
      );
    }

    const latestRelease = channelReleases[0];
    const tag = latestRelease.tag_name;

    const channelFileName = 'latest.yml';
    const channelFileAsset = latestRelease.assets.find(
      ({ name }) => name === channelFileName
    );

    if (!channelFileAsset) {
      throw newError(
        `Cannot find ${channelFileName} in the latest release artifacts (${tag}).`,
        'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND'
      );
    }

    const channelFileUrl = new URL(channelFileAsset.browser_download_url);
    const channelFileContent = await this.httpRequest(channelFileUrl);

    const result = parseUpdateInfo(
      channelFileContent,
      channelFileName,
      channelFileUrl
    );

    // Map asset URLs to GitHub download URLs
    result.files
      .filter(({ url }) =>
        availableForMyPlatformAndInstaller(
          url,
          process.platform,
          process.arch,
          isSquirrelBuild()
        )
      )
      .forEach(file => {
        const asset = latestRelease.assets.find(
          ({ name }) => name === file.url
        );
        if (asset) {
          file.url = asset.browser_download_url;
        }
      });

    if (result.releaseName == null) {
      result.releaseName = latestRelease.name;
    }

    if (result.releaseNotes == null) {
      result.releaseNotes = latestRelease.body;
    }

    return {
      tag: tag,
      ...result,
    };
  }

  resolveFiles(updateInfo: GithubUpdateInfo): Array<ResolvedUpdateFileInfo> {
    const files = getFileList(updateInfo);

    return files
      .filter(({ url }) =>
        availableForMyPlatformAndInstaller(
          url,
          process.platform,
          process.arch,
          isSquirrelBuild()
        )
      )
      .map(file => ({
        url: new URL(file.url),
        info: file,
      }));
  }
}
