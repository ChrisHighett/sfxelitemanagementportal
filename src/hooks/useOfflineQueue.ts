import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QueuedNote {
  id: string;
  table: string;
  data: Record<string, unknown>;
  createdAt: string;
}

const STORAGE_KEY = "sfx_offline_queue";

function loadQueue(): QueuedNote[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedNote[]>(loadQueue);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const enqueue = useCallback((table: string, data: Record<string, unknown>) => {
    const item: QueuedNote = {
      id: crypto.randomUUID(),
      table,
      data,
      createdAt: new Date().toISOString(),
    };
    setQueue((prev) => {
      const next = [...prev, item];
      saveQueue(next);
      return next;
    });
    toast.info("Saved offline — will sync when connected");
  }, []);

  const syncQueue = useCallback(async () => {
    const current = loadQueue();
    if (current.length === 0) return;

    const failed: QueuedNote[] = [];
    for (const item of current) {
      const { error } = await supabase.from(item.table as any).insert(item.data as any);
      if (error) {
        console.error("Sync failed for item", item.id, error);
        failed.push(item);
      }
    }

    saveQueue(failed);
    setQueue(failed);

    const synced = current.length - failed.length;
    if (synced > 0) toast.success(`Synced ${synced} offline note${synced !== 1 ? "s" : ""}`);
    if (failed.length > 0) toast.error(`${failed.length} note${failed.length !== 1 ? "s" : ""} failed to sync`);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue();
    }
  }, [isOnline, queue.length, syncQueue]);

  return { isOnline, queue, enqueue, syncQueue, pendingCount: queue.length };
}
