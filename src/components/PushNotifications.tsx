"use client";

import { useEffect, useRef, useState } from "react";

// Client-side half of Web Push (server half: src/lib/webPush.ts,
// src/app/api/push/subscribe/route.ts), PLUS a "get this on your Home
// Screen" install prompt for every phone (Journey's ask — not just iOS).
// Mounted once in the Coach shell and once in the client Portal shell
// (src/app/coach/layout.tsx, src/app/portal/layout.tsx) — same component
// either way, it just targets whichever role is currently logged in.
//
// Two independent banners, install takes priority when both apply:
//  - Install banner: any phone (iOS or Android) not already running as an
//    installed app. iOS has no programmatic install API at all, so that's
//    manual Share-sheet instructions; Android/Chrome usually fires a real
//    `beforeinstallprompt` event this can trigger directly, with manual
//    instructions as the fallback for browsers that don't fire it.
//  - Notifications banner: shown once the install banner is dismissed or
//    doesn't apply. iOS Safari can't do Web Push at all until the site has
//    been added to the Home Screen (an Apple platform restriction, not
//    something fixable here), so this never offers an "Enable" button
//    there — it would just silently fail.

// Built with `new Uint8Array(n)` + a manual fill rather than
// `Uint8Array.from(...)` — the latter infers Uint8Array<ArrayBufferLike>
// (which can be backed by a SharedArrayBuffer) under this TS lib version,
// which PushManager.subscribe()'s BufferSource param rejects; this form is
// backed by a concrete ArrayBuffer.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
}

function isAndroid(): boolean {
  return /Android/.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readDismissed(key: string): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

// Chrome/Edge/Android's native install prompt — not in lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallStatus = "none" | "ios" | "android-manual" | "android-native";
type PushStatus = "checking" | "unsupported" | "can-enable" | "enabling" | "enabled" | "denied";

// Synchronous, already-available browser checks — computed as the initial
// state itself rather than in an effect, so there's no synchronous
// setState-in-effect (react-hooks/set-state-in-effect flags that pattern).
// "android-native" is the one value only discoverable asynchronously (the
// browser decides if/when to fire beforeinstallprompt) — the effect below
// upgrades "android-manual" to it if that happens.
function computeInitialInstallStatus(): InstallStatus {
  if (typeof window === "undefined") return "none";
  if (isStandalone()) return "none";
  if (isIos()) return "ios";
  if (isAndroid()) return "android-manual";
  return "none";
}

// Returns "unsupported" for iOS-not-installed too — the install banner
// above is what handles that case (installing is the prerequisite there),
// so this banner just stays out of the way rather than offering a button
// that would silently fail. Real async work (registering the service
// worker, looking up an existing subscription) starts from "checking".
function computeInitialPushStatus(vapidPublicKey: string | null): PushStatus {
  if (typeof window === "undefined") return "checking";
  if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (isIos() && !isStandalone()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "checking";
}

function installCopy(status: InstallStatus): string {
  if (status === "ios") {
    return "Want quicker access and reminders? Tap the Share icon, then Add to Home Screen.";
  }
  if (status === "android-native") {
    return "Get Steadwell on your Home Screen for quicker access and reminders.";
  }
  return "Want quicker access and reminders? Open your browser menu and tap Add to Home Screen (or Install app).";
}

export function PushNotifications({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [installStatus, setInstallStatus] = useState<InstallStatus>(computeInitialInstallStatus);
  const [installDismissed, setInstallDismissed] = useState(() => readDismissed("steadwell-install-banner-dismissed"));
  const [pushStatus, setPushStatus] = useState<PushStatus>(() => computeInitialPushStatus(vapidPublicKey));
  const [pushDismissed, setPushDismissed] = useState(() => readDismissed("steadwell-push-banner-dismissed"));
  const deferredInstallPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  // Subscribing to two external browser events — genuine effect territory
  // (see the guidance quoted above computeInitialInstallStatus): both
  // setState calls happen inside the callback, fired later by the browser,
  // never synchronously in the effect body itself.
  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      deferredInstallPrompt.current = e as BeforeInstallPromptEvent;
      setInstallStatus("android-native");
    }
    function onInstalled() {
      deferredInstallPrompt.current = null;
      setInstallStatus("none");
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (pushStatus !== "checking") return;

    (async () => {
      const registration = await navigator.serviceWorker.register("/sw.js");
      if (Notification.permission === "granted") {
        // Already granted in an earlier visit — make sure a live
        // subscription actually exists (e.g. after a browser update or
        // this being a brand-new device) rather than assuming it does.
        const existing = await registration.pushManager.getSubscription();
        const sub =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
          }));
        await fetch("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub) });
        setPushStatus("enabled");
      } else {
        setPushStatus("can-enable");
      }
    })();
  }, [pushStatus, vapidPublicKey]);

  async function promptInstall() {
    const evt = deferredInstallPrompt.current;
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => {});
    deferredInstallPrompt.current = null;
    // Whatever they chose, don't keep re-nagging on every page load.
    dismissInstall();
  }

  function dismissInstall() {
    try {
      localStorage.setItem("steadwell-install-banner-dismissed", "1");
    } catch {
      // Best-effort — a private window or blocked storage just means this
      // banner may show again next visit, not worth failing over.
    }
    setInstallDismissed(true);
  }

  async function enablePush() {
    setPushStatus("enabling");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus(permission === "denied" ? "denied" : "can-enable");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
      });
      await fetch("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub) });
      setPushStatus("enabled");
    } catch (err) {
      console.error("[PushNotifications] enable failed:", err);
      setPushStatus("can-enable");
    }
  }

  function dismissPush() {
    try {
      localStorage.setItem("steadwell-push-banner-dismissed", "1");
    } catch {
      // See dismissInstall's comment.
    }
    setPushDismissed(true);
  }

  // Install takes priority — it's the broader ask (any phone, whether or
  // not push is even configured yet) and, on iOS, a real prerequisite for
  // push to work at all.
  if (!installDismissed && installStatus !== "none") {
    return (
      <div className="bg-brand-sage/15 border-b border-brand-sage/40 text-sm text-brand-dark px-4 py-2 flex items-center justify-between gap-4">
        <span>{installCopy(installStatus)}</span>
        <div className="flex items-center gap-3 shrink-0">
          {installStatus === "android-native" && (
            <button
              onClick={promptInstall}
              className="text-xs font-semibold text-brand-dark bg-brand-sage/40 hover:bg-brand-sage/60 rounded px-3 py-1"
            >
              Add to Home Screen
            </button>
          )}
          <button onClick={dismissInstall} className="text-xs text-brand-slate/70 hover:text-brand-dark">
            {installStatus === "android-native" ? "Not now" : "Dismiss"}
          </button>
        </div>
      </div>
    );
  }

  if (pushDismissed || pushStatus === "checking" || pushStatus === "unsupported" || pushStatus === "enabled" || pushStatus === "denied") {
    return null;
  }

  return (
    <div className="bg-brand-sage/15 border-b border-brand-sage/40 text-sm text-brand-dark px-4 py-2 flex items-center justify-between gap-4">
      <span>Get a reminder before meetings and updates on your account.</span>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={enablePush}
          disabled={pushStatus === "enabling"}
          className="text-xs font-semibold text-brand-dark bg-brand-sage/40 hover:bg-brand-sage/60 rounded px-3 py-1 disabled:opacity-60"
        >
          {pushStatus === "enabling" ? "Enabling…" : "Enable Notifications"}
        </button>
        <button onClick={dismissPush} className="text-xs text-brand-slate/70 hover:text-brand-dark">
          Not now
        </button>
      </div>
    </div>
  );
}
