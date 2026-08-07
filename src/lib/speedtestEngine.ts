// Real WAN speedtest against Cloudflare's public speed-test endpoints
// (the same backend used by speed.cloudflare.com and the open-source
// @cloudflare/speedtest package — cross-origin fetch from any page is
// intentionally supported). Runs entirely in the browser/renderer; no
// backend route is involved.

const DOWNLOAD_ENDPOINT = "https://speed.cloudflare.com/__down";
const UPLOAD_ENDPOINT = "https://speed.cloudflare.com/__up";

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function bytesToMbps(bytes: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return (bytes * 8) / (seconds * 1_000_000);
}

export async function measurePing(
  signal: AbortSignal,
  samples = 6
): Promise<{ pingMs: number; jitterMs: number }> {
  const timings: number[] = [];

  for (let i = 0; i < samples; i++) {
    if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
    const start = performance.now();
    await fetch(`${DOWNLOAD_ENDPOINT}?bytes=0&_=${Date.now()}`, { cache: "no-store", signal });
    timings.push(performance.now() - start);
  }

  const pingMs = Math.min(...timings);
  const diffs = timings.slice(1).map((t, i) => Math.abs(t - timings[i]));
  const jitterMs = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;

  return { pingMs: Math.round(pingMs), jitterMs: Math.round(jitterMs) };
}

// Downloads a series of growing payloads and reports cumulative throughput
// as data streams in, so the UI can animate a live gauge instead of jumping
// straight to a final number.
export async function measureDownload(
  signal: AbortSignal,
  onProgress: (mbps: number) => void
): Promise<number> {
  const stageSizes = [2_000_000, 8_000_000, 20_000_000];
  let totalBytes = 0;
  let totalSeconds = 0;

  for (const size of stageSizes) {
    if (signal.aborted) throw new DOMException("Cancelado", "AbortError");

    const start = performance.now();
    const res = await fetch(`${DOWNLOAD_ENDPOINT}?bytes=${size}&_=${Date.now()}`, {
      cache: "no-store",
      signal,
    });

    if (!res.ok) throw new Error(`Falha no download de teste (HTTP ${res.status}).`);

    if (res.body) {
      const reader = res.body.getReader();
      let received = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        const elapsed = (performance.now() - start) / 1000;
        onProgress(bytesToMbps(totalBytes + received, totalSeconds + elapsed));
      }
      totalBytes += received;
    } else {
      const buf = await res.arrayBuffer();
      totalBytes += buf.byteLength;
    }

    totalSeconds += (performance.now() - start) / 1000;
    onProgress(bytesToMbps(totalBytes, totalSeconds));
  }

  return bytesToMbps(totalBytes, totalSeconds);
}

// XMLHttpRequest is used (rather than fetch) specifically because
// `xhr.upload.onprogress` is the only browser-standard way to observe
// upload progress in real time.
export function measureUpload(
  signal: AbortSignal,
  onProgress: (mbps: number) => void
): Promise<number> {
  const stageSizes = [1_000_000, 4_000_000, 8_000_000];

  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Cancelado", "AbortError"));
      return;
    }

    let stageIndex = 0;
    let totalBytes = 0;
    let totalSeconds = 0;
    let currentXhr: XMLHttpRequest | null = null;

    const abortHandler = () => currentXhr?.abort();
    signal.addEventListener("abort", abortHandler);

    const cleanup = () => signal.removeEventListener("abort", abortHandler);

    function runStage() {
      if (stageIndex >= stageSizes.length) {
        cleanup();
        resolve(bytesToMbps(totalBytes, totalSeconds));
        return;
      }

      const size = stageSizes[stageIndex];
      const blob = new Blob([new Uint8Array(size)]);
      const xhr = new XMLHttpRequest();
      currentXhr = xhr;
      xhr.open("POST", `${UPLOAD_ENDPOINT}?_=${Date.now()}`, true);

      const start = performance.now();

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const elapsed = (performance.now() - start) / 1000;
        onProgress(bytesToMbps(totalBytes + evt.loaded, totalSeconds + elapsed));
      };

      xhr.onload = () => {
        totalBytes += size;
        totalSeconds += (performance.now() - start) / 1000;
        stageIndex++;
        runStage();
      };

      xhr.onerror = () => {
        cleanup();
        reject(new Error("Falha no upload de teste."));
      };

      xhr.onabort = () => {
        cleanup();
        reject(new DOMException("Cancelado", "AbortError"));
      };

      xhr.send(blob);
    }

    runStage();
  });
}
