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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function check() {
      setError(null);
      try {
        let info: Awaited<ReturnType<typeof App.getInfo>> | null = null;
        try {
          info = await App.getInfo();
          if (info) setInstalledVersion(info.version);
        } catch (err) {
          console.warn("[UpdateBanner] App.getInfo failed:", err);
          setError("App.getInfo failed: " + String(err));
        }

        let manifestResponse: Response;
        try {
          manifestResponse = await fetch(VERSION_URL, { cache: "no-store" });
        } catch (err) {
          console.warn("[UpdateBanner] fetch failed:", err);
          setError("Network error: " + String(err));
          return;
        }
        if (!manifestResponse.ok) {
          setError("version.json HTTP " + manifestResponse.status);
          return;
        }
        const manifestJson = (await manifestResponse.json()) as ApkManifest;
        if (!manifestJson || typeof manifestJson.versionCode !== "number") {
          setError("version.json parse failed");
          return;
        }
        const installedCode = info ? Number(info.build) : NaN;
        if (!Number.isNaN(installedCode) && manifestJson.versionCode > installedCode) {
          setManifest(manifestJson);
        } else if (Number.isNaN(installedCode)) {
          setError("Cannot read installed version (App.getInfo unavailable)");
        }
      } catch (err) {
        console.error("[UpdateBanner] unexpected error:", err);
        setError("Unexpected: " + String(err));
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!Capacitor.isNativePlatform() || dismissed) return null;

  if (!manifest) {
    if (!error) return null;
    return (
      <div className="fixed inset-x-0 top-0 z-[9999] bg-amber-600 px-4 py-2 text-xs text-white shadow-lg" role="banner">
        Update check failed: {error}{" "}
        <button onClick={() => setDismissed(true)} className="ml-2 font-semibold underline">
          dismiss
        </button>
      </div>
    );
  }

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
