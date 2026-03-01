"use client";

import { useEffect, useCallback } from "react";
import { wsClient } from "@/lib/websocket";

type EventHandler<T = unknown> = (data: T) => void;

export function useWebSocket<T = unknown>(
  event: string,
  handler: EventHandler<T>,
  deps: unknown[] = [],
) {
  const stableHandler = useCallback(
    (data: unknown) => handler(data as T),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    const unsubscribe = wsClient.on(event, stableHandler);
    return unsubscribe;
  }, [event, stableHandler]);
}

/** Subscribe to multiple events at once */
export function useWebSocketEvents(
  subscriptions: Array<{ event: string; handler: (data: unknown) => void }>,
) {
  useEffect(() => {
    const unsubscribes = subscriptions.map(({ event, handler }) =>
      wsClient.on(event, handler),
    );
    return () => unsubscribes.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
