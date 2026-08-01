import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

interface ApkManifest {
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  releaseNotes?: string;
}

const VERSION_URL = (import.meta.env.VITE_APK_VERSION_URL as string | undefined) ?? "https://vishwassilk.com/version.json";
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

export function UpdateBanner() {
  const [manifest, setManifest] = useState<ApkManifest | null>(null);
  const [installedVersion, setInstalledVersion] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    async function check() {
      try {
        const [info, manifestResponse] = await Promise.all([
          App.getInfo(),
          fetch(VERSION_URL, { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (!manifestResponse.ok) return;
        const manifestJson = (await manifestResponse.json()) as ApkManifest;
        if (!manifestJson || typeof manifestJson.versionCode !== "number") return;
        const installedCode = Number(info.build);
        setInstalledVersion(info.version);
        if (manifestJson.versionCode > installedCode) {
          setManifest(manifestJson);
        }
      } catch {
        /* offline / not reachable — skip silently */
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!Capacitor.isNativePlatform() || !manifest || dismissed) return null;

  const currentManifest = manifest;
  function openDownload() {
    window.open(currentManifest.downloadUrl, "_system");
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] shadow-lg" role="banner">
      <div className="bg-emerald-700 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">A new version of VISHWAS SILK is available</p>
            <p className="text-xs text-emerald-100">
              Version {manifest.versionName} (you have {installedVersion}){manifest.releaseNotes ? ` · ${manifest.releaseNotes}` : ""}
            </p>
          </div>
          <button
            onClick={openDownload}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            Update now
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg px-2 py-1 text-sm text-emerald-100 underline-offset-2 hover:underline"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
