const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// ─── 1. Add KSPlayer pods to Podfile ─────────────────────────────────────────

const withKSPlayerPod = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (mod) => {
      const podfilePath = path.join(mod.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withKSPlayer] Podfile not found at:', podfilePath);
        return mod;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes('kingslay/KSPlayer') && podfile.includes('DisplayCriteria')) {
        console.log('[withKSPlayer] KSPlayer pods already present, skipping');
        return mod;
      }

      // KSPlayer requires use_frameworks! but React Native needs static linking.
      // use_frameworks! :linkage => :static satisfies both — confirmed by tapframe/KSPNUVIO.
      const ksplayerPods = `
  # KSPlayer — iOS video player with FFmpeg/AVPlayer support
  pod 'KSPlayer', :git => 'https://github.com/kingslay/KSPlayer.git', :branch => 'main'
  pod 'DisplayCriteria', :git => 'https://github.com/kingslay/KSPlayer.git', :branch => 'main', :modular_headers => true
  pod 'FFmpegKit', :git => 'https://github.com/kingslay/FFmpegKit.git', :branch => 'main', :modular_headers => true
  pod 'Libass', :git => 'https://github.com/kingslay/FFmpegKit.git', :branch => 'main', :modular_headers => true
`;

      if (!podfile.includes('use_react_native!')) {
        console.warn('[withKSPlayer] Could not find use_react_native! in Podfile — pods not added');
        return mod;
      }

      const useFrameworks = podfile.includes('use_frameworks!') ? '' : "\n  use_frameworks! :linkage => :static\n";

      podfile = podfile.replace(
        /(\s*use_react_native!)/,
        `${useFrameworks}${ksplayerPods}$1`
      );
      console.log('[withKSPlayer] Added use_frameworks! :linkage => :static and KSPlayer pods');

      // ── post_install: merge RN static linkage fix into existing block ─────────
      const ksplayerPostInstallCode = `
  # [withKSPlayer] Allow non-modular includes — needed for KSPlayer Swift/ObjC interop
  # when use_frameworks! :linkage => :static is active
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end
`;

      if (!podfile.includes('[withKSPlayer] Force React Native targets')) {
        if (podfile.includes('post_install do |installer|')) {
          podfile = podfile.replace(
            'post_install do |installer|',
            `post_install do |installer|\n${ksplayerPostInstallCode}`
          );
          console.log('[withKSPlayer] Merged static linkage patch into existing post_install');
        } else {
          podfile = podfile + `\npost_install do |installer|\n${ksplayerPostInstallCode}end\n`;
          console.log('[withKSPlayer] Added new post_install block');
        }
      }

      fs.writeFileSync(podfilePath, podfile, 'utf8');
      return mod;
    },
  ]);
};

// ─── 2. Copy Swift + ObjC bridge files into ios/<ProjectName>/ ────────────────

const withKSPlayerBridge = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const projectName = mod.modRequest.projectName;
      const iosProjectDir = path.join(projectRoot, 'ios', projectName);
      const bridgeDir = path.join(projectRoot, 'plugins', 'ksplayer-bridge');

      if (!fs.existsSync(bridgeDir)) {
        throw new Error(
          `[withKSPlayer] Bridge directory not found: ${bridgeDir}\n` +
          `Please create plugins/ksplayer-bridge/ with the bridge files.`
        );
      }

      if (!fs.existsSync(iosProjectDir)) {
        fs.mkdirSync(iosProjectDir, { recursive: true });
      }

      const files = fs.readdirSync(bridgeDir);
      files.forEach((file) => {
        const src = path.join(bridgeDir, file);
        const dest = path.join(iosProjectDir, file);
        fs.copyFileSync(src, dest);
        console.log(`[withKSPlayer] Copied ${file} → ios/${projectName}/${file}`);
      });

      return mod;
    },
  ]);
};

// ─── 3. Xcode build settings + add ALL bridge files to target ─────────────────

const withKSPlayerBuildSettings = (config) => {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const projectName = mod.modRequest.projectName;
    const projectRoot = mod.modRequest.projectRoot;
    const bridgeHeaderPath = `${projectName}/KSPlayer-Bridging-Header.h`;

    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const cfg = configurations[key];
      if (cfg && cfg.buildSettings) {
        const s = cfg.buildSettings;
        if (s.PRODUCT_BUNDLE_IDENTIFIER !== undefined || s.PRODUCT_NAME !== undefined) {
          s['SWIFT_OBJC_BRIDGING_HEADER'] = `"${bridgeHeaderPath}"`;
          s['SWIFT_VERSION'] = '5.0';
          // Do NOT set ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES here —
          // writing $(inherited) into .pbxproj directly corrupts the plist,
          // breaking pod install. CocoaPods manages this via xcconfig.
          delete s['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'];
        }
      }
    }

    const bridgeDir = path.join(projectRoot, 'plugins', 'ksplayer-bridge');

    if (fs.existsSync(bridgeDir)) {
      const sourceFiles = fs
        .readdirSync(bridgeDir)
        .filter((f) => f.endsWith('.swift') || f.endsWith('.m'));

      const target = project.getFirstTarget();
      const groupKey = project.findPBXGroupKey({ name: projectName });

      if (!target || !groupKey) {
        console.warn('[withKSPlayer] Could not find Xcode target or group — skipping file addition');
        return mod;
      }

      sourceFiles.forEach((file) => {
        const filePath = `${projectName}/${file}`;
        const sources = project.pbxSourcesBuildPhaseObj(target.uuid);
        const alreadyAdded = sources && Object.values(sources.files || {}).some(
          (f) => typeof f === 'object' && f?.comment?.includes(file)
        );

        if (!alreadyAdded) {
          try {
            project.addSourceFile(filePath, { target: target.uuid }, groupKey);
            console.log(`[withKSPlayer] Added ${file} to Xcode target`);
          } catch (e) {
            console.warn(`[withKSPlayer] Could not add ${file} to Xcode target:`, e.message);
          }
        } else {
          console.log(`[withKSPlayer] ${file} already in Xcode target, skipping`);
        }
      });
    }

    return mod;
  });
};

// ─── Compose ──────────────────────────────────────────────────────────────────

module.exports = (config) => {
  config = withKSPlayerPod(config);
  config = withKSPlayerBridge(config);
  config = withKSPlayerBuildSettings(config);
  return config;
};