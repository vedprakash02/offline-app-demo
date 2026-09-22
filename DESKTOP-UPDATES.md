# Desktop Updates

The Tauri desktop app checks for updates when it opens. When a newer signed release is available, it shows an update popup, downloads the installer, and restarts into the new version.

## One-time setup

1. Create a Tauri signing key on the build machine. Keep the private key outside the repository and never upload it to MilesWeb:

   `npm.cmd run tauri -- signer generate -w C:\path\to\vidya-prabandh.key`

2. Put the generated public key in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.
3. Replace `https://YOUR-MILESWEB-DOMAIN/updates/latest.json` in the same config with the real HTTPS URL on MilesWeb.
4. Keep the private key path available as `TAURI_SIGNING_PRIVATE_KEY` when building releases. Protect `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if a password was set. For GitHub Actions, add both values as repository secrets named `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
5. Ensure the update URL and installer URL are HTTPS and publicly reachable without login.

## Release process

1. Increase `version` in `src-tauri/tauri.conf.json`, for example `1.0.0` to `1.0.1`.
2. Build the signed Windows installer with the signing key available:

   `npm.cmd run tauri -- build`

3. Upload the generated NSIS installer and its `.sig` file from `src-tauri/target/release/bundle/nsis/` to MilesWeb.
4. Upload a `latest.json` file beside them. Example:

```json
{
  "version": "1.0.1",
  "notes": "Bug fixes and improvements",
  "pub_date": "2026-09-22T12:00:00Z",
  "platforms": {
    "windows-x86_64-nsis": {
      "signature": "CONTENTS_OF_THE_INSTALLER_SIG_FILE",
      "url": "https://YOUR-MILESWEB-DOMAIN/updates/Vidya-Prabandh-Demo_1.0.1_x64-setup.exe"
    }
  }
}
```

5. Test `latest.json` in a browser and install the previous app version on a test machine. Open it and confirm the update popup appears.

## GitHub Actions release flow

The source repository contains a workflow at `.github/workflows/release.yml`. After the one-time signing secrets are added, release a new version by changing the Tauri version and pushing a tag:

The workflow publishes to the separate public repository `vedprakash02/vidya-prabandh-releases`. In the private source repository settings, add these Actions secrets:

- `RELEASE_REPO_TOKEN`: a GitHub token allowed to create releases and upload assets in the public release repository.
- `TAURI_SIGNING_PRIVATE_KEY`: the complete contents of `C:\Users\MYPC\.tauri\vidya-prabandh.key`.
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the password used when creating that key.

Never commit these values to source files or send them in chat. The public release repository must contain an initial commit on its `main` branch before the first automated release.

```cmd
git add .
git commit -m "Release 1.0.1"
git push origin main
git tag v1.0.1
git push origin v1.0.1
```

The workflow builds the Windows installer and publishes the signed updater artifacts to a GitHub Release. The app checks the public release repository automatically.

## Important

- Every release must have a higher version number.
- The `.sig` content must match the exact installer file being served.
- Do not commit or upload the private signing key.
- If the endpoint or public key is still a placeholder, the app will not find a production update.
- Existing user data is stored in the app data directory and is not replaced by the installer update.
