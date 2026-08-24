import { useEffect } from "react";

const CHANNEL_NAME = "bps_sop_realtime_sync";
let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn("BroadcastChannel not supported in this environment", e);
}

/**
 * Triggers a real-time update event across current window and other browser tabs.
 */
export function notifyRealtimeUpdate(action: string = "data_updated") {
  if (typeof window === "undefined") return;

  // 1. Dispatch custom DOM event in the current tab
  window.dispatchEvent(
    new CustomEvent("bps_sop_updated", {
      detail: { action, timestamp: Date.now() },
    })
  );

  // 2. Broadcast to all other open tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ action, timestamp: Date.now() });
    } catch (err) {
      console.warn("BroadcastChannel message error", err);
    }
  }
}

/**
 * React hook to listen for real-time updates (cross-tab broadcast + periodic background polling).
 */
export function useRealtimeSubscription(
  callback: () => void | Promise<void>,
  pollingIntervalMs: number = 3000
) {
  useEffect(() => {
    const handleUpdate = () => {
      callback();
    };

    // Listen to local custom event
    window.addEventListener("bps_sop_updated", handleUpdate);
    // Refetch when user focuses back on window
    window.addEventListener("focus", handleUpdate);

    // Refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        callback();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Listen to cross-tab BroadcastChannel
    if (broadcastChannel) {
      broadcastChannel.addEventListener("message", handleUpdate);
    }

    // Polling timer
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        callback();
      }
    }, pollingIntervalMs);

    return () => {
      window.removeEventListener("bps_sop_updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (broadcastChannel) {
        broadcastChannel.removeEventListener("message", handleUpdate);
      }
      clearInterval(intervalId);
    };
  }, [callback, pollingIntervalMs]);
}
