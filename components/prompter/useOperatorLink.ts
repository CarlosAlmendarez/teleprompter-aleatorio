import { useCallback, useEffect, useRef, useState } from "react";
import type { PrompterCommand, PrompterSnapshot } from "@/lib/player/prompterCommands";

// Operator mode: the original window becomes the controller and opens a
// "reader" window (same page, ?view=reader&link=<id>) that does the actual
// scrolling. Both talk over a BroadcastChannel — same browser, no server.
//   reader → controller: hello (asks for init), state (~5×/s), bye
//   controller → reader: init (current settings), command, close

type Message =
  | { kind: "hello" }
  | { kind: "init"; state: PrompterSnapshot }
  | { kind: "command"; command: PrompterCommand }
  | { kind: "state"; state: PrompterSnapshot }
  | { kind: "bye" }
  | { kind: "close" };

export type LinkRole = "local" | "controller" | "reader";

const channelName = (id: string) => `prompter-link-${id}`;

type ScreenDetails = { screens: Array<{ availLeft: number; availTop: number; availWidth: number; availHeight: number; isPrimary?: boolean }>; currentScreen: object };

/** Moves the reader to another monitor when Window Management is already granted. */
async function moveToOtherScreen(win: Window) {
  try {
    const status = await navigator.permissions.query({ name: "window-management" as PermissionName });
    const getDetails = (window as unknown as { getScreenDetails?: () => Promise<ScreenDetails> }).getScreenDetails;
    if (status.state !== "granted" || !getDetails) return false;
    const details = await getDetails.call(window);
    const other = details.screens.find((s) => s !== details.currentScreen);
    if (!other) return false;
    win.moveTo(other.availLeft, other.availTop);
    win.resizeTo(other.availWidth, other.availHeight);
    return true;
  } catch {
    return false;
  }
}

/** Asks for Window Management permission (user gesture), then moves the reader. */
export async function requestSecondScreen(win: Window | null): Promise<boolean> {
  const getDetails = (window as unknown as { getScreenDetails?: () => Promise<ScreenDetails> }).getScreenDetails;
  if (!win || win.closed || !getDetails) return false;
  try {
    await getDetails.call(window); // prompts the first time
  } catch {
    return false;
  }
  return moveToOtherScreen(win);
}

export function secondScreenSupported(): boolean {
  return typeof window !== "undefined" && "getScreenDetails" in window;
}

export function useOperatorLink({
  readerLinkId,
  onCommand,
  onInit,
  onRemoteState,
  getSnapshot,
}: {
  /** Set when this window IS the reader. */
  readerLinkId: string | null;
  onCommand: (command: PrompterCommand) => void;
  onInit: (state: PrompterSnapshot) => void;
  onRemoteState: (state: PrompterSnapshot) => void;
  getSnapshot: () => PrompterSnapshot;
}) {
  const [role, setRole] = useState<LinkRole>(readerLinkId ? "reader" : "local");
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const readerWindowRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handlers = useRef({ onCommand, onInit, onRemoteState, getSnapshot });
  useEffect(() => {
    handlers.current = { onCommand, onInit, onRemoteState, getSnapshot };
  });

  const post = useCallback((message: Message) => channelRef.current?.postMessage(message), []);

  const disconnect = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    channelRef.current?.close();
    channelRef.current = null;
    readerWindowRef.current = null;
    setConnected(false);
    setRole("local");
  }, []);

  // Reader side: announce ourselves, then follow the controller.
  useEffect(() => {
    if (!readerLinkId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(channelName(readerLinkId));
    channelRef.current = channel;
    channel.onmessage = (e: MessageEvent<Message>) => {
      const msg = e.data;
      if (msg.kind === "init") {
        handlers.current.onInit(msg.state);
        setConnected(true);
      } else if (msg.kind === "command") handlers.current.onCommand(msg.command);
      else if (msg.kind === "close") window.close();
    };
    channel.postMessage({ kind: "hello" } satisfies Message);
    const bye = () => channel.postMessage({ kind: "bye" } satisfies Message);
    window.addEventListener("pagehide", bye);
    return () => {
      window.removeEventListener("pagehide", bye);
      bye();
      channel.close();
      channelRef.current = null;
    };
  }, [readerLinkId]);

  /** Controller side: open the reader window and start linking. */
  const openReader = useCallback(
    (readerUrl: (linkId: string) => string) => {
      if (typeof BroadcastChannel === "undefined") return false;
      const id = crypto.randomUUID();
      const win = window.open(readerUrl(id), `prompter-reader-${id}`, "popup,width=1280,height=800");
      if (!win) return false; // blocked
      disconnect();
      const channel = new BroadcastChannel(channelName(id));
      channelRef.current = channel;
      readerWindowRef.current = win;
      setRole("controller");
      channel.onmessage = (e: MessageEvent<Message>) => {
        const msg = e.data;
        if (msg.kind === "hello") {
          channel.postMessage({ kind: "init", state: handlers.current.getSnapshot() } satisfies Message);
          setConnected(true);
        } else if (msg.kind === "state") handlers.current.onRemoteState(msg.state);
        else if (msg.kind === "bye") disconnect();
      };
      pollRef.current = setInterval(() => {
        if (win.closed) disconnect();
      }, 1000);
      void moveToOtherScreen(win);
      return true;
    },
    [disconnect],
  );

  const closeReader = useCallback(() => {
    post({ kind: "close" });
    readerWindowRef.current?.close();
    disconnect();
  }, [post, disconnect]);

  const send = useCallback((command: PrompterCommand) => post({ kind: "command", command }), [post]);
  const publish = useCallback((state: PrompterSnapshot) => post({ kind: "state", state }), [post]);

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

  return { role, connected, openReader, closeReader, send, publish, readerWindow: readerWindowRef };
}
