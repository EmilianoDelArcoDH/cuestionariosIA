"use client";

import { useCallback, useEffect, useState } from "react";

type PgEventType = "SUCCESS" | "FAILURE";

type PgEventData = {
  type: "blockly-type";
  id: string;
  state: string;
};

type PgMessageEvent = MessageEvent<{
  type?: string;
  data?: unknown;
}>;

export function usePgEvent() {
  const [data, setData] = useState<PgEventData>({
    type: "blockly-type",
    id: "",
    state: "",
  });

  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("id");

    console.log("[PGEvent] Inicialización:", {
      url: window.location.href,
      id: id ?? "",
      type: "blockly-type",
    });

    if (id) {
      setData((previousData) => ({ ...previousData, id }));
    }
  }, []);

  const isValidInitialEvent = useCallback((event: PgMessageEvent) => {
    return event.data?.type === "init" && typeof event.data.data === "string";
  }, []);

  const waitForMessage = useCallback(
    (timeout = 2000): Promise<string | null> => {
      return new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
          if (isValidInitialEvent(event as PgMessageEvent)) {
            console.log("[PGEvent] Mensaje init recibido:", event.data);
            window.clearTimeout(timer);
            window.removeEventListener("message", handler);
            resolve(event.data.data as string);
          }
        };

        const timer = window.setTimeout(() => {
          console.log(`[PGEvent] No se recibió un mensaje init en ${timeout} ms.`);
          window.removeEventListener("message", handler);
          resolve(null);
        }, timeout);

        window.addEventListener("message", handler);
      });
    },
    [isValidInitialEvent]
  );

  const postEvent = useCallback(
    (
      eventType: PgEventType,
      message: string,
      reasons: string[],
      state: unknown
    ) => {
      const payload = { data: state, eventType };
      const eventData = {
        event: eventType,
        message,
        reasons,
        state: JSON.stringify(payload),
        type: data.type,
        id: data.id,
      };

      console.group(`[PGEvent] Envío ${eventType}`);
      console.log("[PGEvent] Mensaje:", message);
      console.log("[PGEvent] Razones:", reasons);
      console.log("[PGEvent] Estado original:", state);
      console.log("[PGEvent] Payload de state:", payload);
      console.log("[PGEvent] Evento completo enviado a window.top:", eventData);
      console.groupEnd();
      window.top?.postMessage(eventData, "*");
    },
    [data.id, data.type]
  );

  return {
    data,
    postEvent,
    waitForMessage,
  };
}
