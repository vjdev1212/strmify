const { withXcodeProject, withDangerousMod } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

const KSPLAYER_REPO = 'https://github.com/kingslay/KSPlayer.git';
const KSPLAYER_COMMIT = 'bdfa2da39bb18865b317c4ffd08cdef5f8efc043';
const FFMPEGKIT_REPO = 'https://github.com/kingslay/FFmpegKit.git';
const FFMPEGKIT_COMMIT = 'c32be9bfb628042737ad3ef622e930c5c7b15954';

const PODS_BEGIN = '# >>> withKSPlayer pods';
const PODS_END = '# <<< withKSPlayer pods';
const POST_BEGIN = '# >>> withKSPlayer post_install';
const POST_END = '# <<< withKSPlayer post_install';

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stripBlock = (text, begin, end) =>
  text.replace(
    new RegExp(`[ \\t]*${escapeRe(begin)}[\\s\\S]*?${escapeRe(end)}[ \\t]*\\n?`, 'g'),
    ''
  );

// ─── 1. Add KSPlayer pods to Podfile ─────────────────────────────────────────

const withKSPlayerPod = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (mod) => {
      const iosRoot = mod.modRequest.platformProjectRoot;
      const podfilePath = path.join(iosRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withKSPlayer] Podfile not found at:', podfilePath);
        return mod;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!/^[ \t]*use_react_native!/m.test(podfile)) {
        console.warn('[withKSPlayer] Could not find use_react_native! in Podfile — pods not added');
        return mod;
      }

      podfile = stripBlock(podfile, PODS_BEGIN, PODS_END);
      podfile = stripBlock(podfile, POST_BEGIN, POST_END);
      podfile = podfile.replace(
        /^[ \t]*pod '(?:KSPlayer|DisplayCriteria|FFmpegKit|Libass)'.*\n/gm,
        ''
      );

      let linkageLine = '';
      if (podfile.includes('ios.useFrameworks')) {
        const propertiesPath = path.join(iosRoot, 'Podfile.properties.json');
        const properties = fs.existsSync(propertiesPath)
          ? JSON.parse(fs.readFileSync(propertiesPath, 'utf8'))
          : {};

        if (properties['ios.useFrameworks'] !== 'static') {
          properties['ios.useFrameworks'] = 'static';
          fs.writeFileSync(propertiesPath, JSON.stringify(properties, null, 2) + '\n', 'utf8');
          console.log('[withKSPlayer] Set ios.useFrameworks = static in Podfile.properties.json');
        }
      } else if (!/^[ \t]*use_frameworks!(?![^\n]*\bif\b)/m.test(podfile)) {
        linkageLine = "  use_frameworks! :linkage => :static\n";
        console.log('[withKSPlayer] Added use_frameworks! :linkage => :static');
      }

      const podsBlock =
        `  ${PODS_BEGIN}\n` +
        `  pod 'KSPlayer', :git => '${KSPLAYER_REPO}', :commit => '${KSPLAYER_COMMIT}'\n` +
        `  pod 'DisplayCriteria', :git => '${KSPLAYER_REPO}', :commit => '${KSPLAYER_COMMIT}', :modular_headers => true\n` +
        `  pod 'FFmpegKit', :git => '${FFMPEGKIT_REPO}', :commit => '${FFMPEGKIT_COMMIT}', :modular_headers => true\n` +
        `  pod 'Libass', :git => '${FFMPEGKIT_REPO}', :commit => '${FFMPEGKIT_COMMIT}', :modular_headers => true\n` +
        `  ${PODS_END}\n\n`;

      podfile = podfile.replace(
        /^[ \t]*use_react_native!/m,
        (match) => `${linkageLine}${podsBlock}${match}`
      );
      console.log('[withKSPlayer] Added KSPlayer pods (pinned)');

      const postInstallCode =
        `    ${POST_BEGIN}\n` +
        `    # Allow non-modular includes — needed for KSPlayer Swift/ObjC interop\n` +
        `    # when use_frameworks! :linkage => :static is active\n` +
        `    installer.pods_project.targets.each do |target|\n` +
        `      target.build_configurations.each do |build_config|\n` +
        `        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n` +
        `      end\n` +
        `    end\n` +
        `    ${POST_END}\n`;

      if (/post_install do \|installer\|\n/.test(podfile)) {
        podfile = podfile.replace(
          /post_install do \|installer\|\n/,
          (match) => `${match}${postInstallCode}`
        );
        console.log('[withKSPlayer] Merged patch into existing post_install');
      } else {
        podfile += `\npost_install do |installer|\n${postInstallCode}end\n`;
        console.log('[withKSPlayer] Added new post_install block');
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