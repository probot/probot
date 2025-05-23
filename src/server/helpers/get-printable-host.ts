export function getPrintableHost(host: string | undefined): string {
  if (typeof host !== "string") {
    return "localhost";
  }
  return host.includes(":") ? `[${host}]` : host;
}
