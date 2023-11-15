export function isSupportedNodeVersion(nodeVersion = process.versions.node) {
  return Number(nodeVersion.split(".", 10)[0]) >= 18;
}
