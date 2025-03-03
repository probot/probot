export function isSupportedNodeVersion(nodeVersion = process.versions.node) {
  const [major, minor] = nodeVersion.split(".", 10).map(Number);

  return major >= 22 || (major === 20 && minor >= 17);
}
