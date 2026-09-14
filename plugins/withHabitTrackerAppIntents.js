const { IOSConfig, withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const filename = "HabitTrackerAppIntents.swift";
const nativeProjectName = (config) => config.name.replace(/[\W_]+/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "app";

module.exports = function withHabitTrackerAppIntents(config) {
  config = withDangerousMod(config, ["ios", async (mod) => {
    const source = path.join(mod.modRequest.projectRoot, "native", filename);
    const destination = path.join(mod.modRequest.platformProjectRoot, filename);
    fs.copyFileSync(source, destination);
    return mod;
  }]);
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const projectName = nativeProjectName(mod);
    const filepath = filename;
    if (!project.hasFile(filepath)) {
      const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({ project, projectName });
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: projectName, project, targetUuid: target.uuid });
    }
    return mod;
  });
};
