/* fsaa/lib/net.mjs — fetch binary over HTTPS (zero deps, no shell). */
export async function fetchFile(url) {
  const resp = await fetch(url, {
    headers: { "User-Agent": "fsaa-cli/0.1 (+https://github.com/Aramex86/fsaa)" },
    redirect: "follow",
  });
  if (!resp.ok) {
    throw new Error(`download failed: HTTP ${resp.status} for ${url}`);
  }
  const buf = await resp.arrayBuffer();
  return Buffer.from(buf);
}