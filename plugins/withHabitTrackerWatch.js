const { IOSConfig, withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const appBundleId = "com.furkanozbek.habit-tracker";
const watchAppName = "HabitTrackerWatchApp";
const watchExtensionName = "HabitTrackerWatchExtension";
const bridgeFiles = ["WatchConnectivityBridge.swift", "WatchConnectivityBridge.m"];
const nativeProjectName = (config) => config.name.replace(/[\W_]+/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "app";

function copy(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function targetFor(project, name) {
  return Object.entries(project.pbxNativeTargetSection()).find(([key, value]) => !key.endsWith("_comment") && value.name?.replaceAll('"', "") === name)?.[0];
}

function configure(project, targetId, settings) {
  for (const [key, config] of Object.entries(project.pbxXCBuildConfigurationSection())) {
    if (key.endsWith("_comment") || config.buildSettings === undefined) continue;
    const list = project.pbxNativeTargetSection()[targetId]?.buildConfigurationList;
    if (project.hash.project.objects.XCConfigurationList?.[list]?.buildConfigurations?.some((item) => item.value === key)) {
      Object.assign(config.buildSettings, settings);
    }
  }
}

module.exports = function withHabitTrackerWatch(config) {
  config = withDangerousMod(config, ["ios", async (mod) => {
    const root = mod.modRequest.projectRoot;
    const ios = mod.modRequest.platformProjectRoot;
    for (const file of bridgeFiles) copy(path.join(root, "native", file), path.join(ios, file));
    for (const folder of [watchAppName, watchExtensionName]) {
      for (const file of fs.readdirSync(path.join(root, "watch", folder))) {
        copy(path.join(root, "watch", folder, file), path.join(ios, folder, file));
      }
    }
    return mod;
  }]);
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const mainTarget = IOSConfig.XcodeUtils.getApplicationNativeTarget({ project, projectName: nativeProjectName(config) });
    const mainGroup = project.findPBXGroupKey({ name: nativeProjectName(config) });
    for (const file of bridgeFiles) if (!project.hasFile(file)) project.addSourceFile(file, { target: mainTarget.uuid }, mainGroup);

    let appId = targetFor(project, watchAppName);
    let extensionId = targetFor(project, watchExtensionName);
    if (!appId) { appId = project.addTarget(watchAppName, "watch2_app", watchAppName, `${appBundleId}.watchkitapp`).uuid; }
    if (!extensionId) { extensionId = project.addTarget(watchExtensionName, "watch2_extension", watchExtensionName, `${appBundleId}.watchkitapp.watchkitextension`).uuid; }
    // The xcode package creates watch products but not the extension's compile phases.
    // Add them before adding Swift/framework files so they never fall into the phone target.
    const extensionTarget = project.pbxNativeTargetSection()[extensionId];
    if (!extensionTarget.buildPhases.some((phase) => project.hash.project.objects.PBXSourcesBuildPhase?.[phase.value])) {
      project.addBuildPhase([], "PBXSourcesBuildPhase", "Sources", extensionId);
      project.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", extensionId);
    }
    let group = project.findPBXGroupKey({ name: watchExtensionName });
    if (!group) {
      group = project.addPbxGroup([], watchExtensionName, watchExtensionName).uuid;
      project.addToPbxGroup({ uuid: group }, project.getFirstProject().firstProject.mainGroup);
    }
    const source = `${watchExtensionName}/HabitTrackerWatchApp.swift`;
    if (!project.hasFile(source)) project.addSourceFile(source, { target: extensionId }, group);
    if (!project.hasFile("WatchConnectivity.framework")) project.addFramework("WatchConnectivity.framework", { target: extensionId });

    const shared = {
      CODE_SIGN_STYLE: "Automatic", CURRENT_PROJECT_VERSION: 1, MARKETING_VERSION: "1.0.0",
      SDKROOT: "watchos", SUPPORTED_PLATFORMS: '"watchos watchsimulator"', TARGETED_DEVICE_FAMILY: 4,
      WATCHOS_DEPLOYMENT_TARGET: "10.0", SWIFT_VERSION: "5.0", SKIP_INSTALL: "YES",
    };
    configure(project, appId, { ...shared, INFOPLIST_FILE: `${watchAppName}/Info.plist`, CODE_SIGN_ENTITLEMENTS: `${watchAppName}/${watchAppName}.entitlements`, PRODUCT_BUNDLE_IDENTIFIER: `${appBundleId}.watchkitapp`, PRODUCT_NAME: '"Habit Tracker Watch"' });
    configure(project, extensionId, { ...shared, APPLICATION_EXTENSION_API_ONLY: "YES", INFOPLIST_FILE: `${watchExtensionName}/Info.plist`, CODE_SIGN_ENTITLEMENTS: `${watchExtensionName}/${watchExtensionName}.entitlements`, PRODUCT_BUNDLE_IDENTIFIER: `${appBundleId}.watchkitapp.watchkitextension`, PRODUCT_NAME: '"Habit Tracker Watch Extension"' });
    return mod;
  });
};
