"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PendingNavigation = { kind: "link"; href: string } | { kind: "back" };

interface Options {
  /**
   * Also catch the browser's Back button. This pushes one extra history entry
   * while there are unsaved changes, so turn it off if it clashes with other
   * history handling.
   */
  guardBackButton?: boolean;
}

/**
 * Stops people leaving a page with unsaved changes by accident.
 *
 * The App Router has no "are you sure?" hook for navigation, so this covers
 * each way out separately:
 *  - closing, reloading or leaving the site: the browser's own prompt
 *  - clicking any in-app link (including the ones outside this page): the
 *    click is held and `pending` is set, so you can show your own dialog
 *  - the Back button: the same, using a one-entry history guard
 *
 * When `pending` is set, call `proceed()` to carry on or `stay()` to cancel.
 * Call `allowNavigation()` before navigating from code (router.push), which
 * this hook can't see.
 */
export function useUnsavedChangesGuard(
  when: boolean,
  { guardBackButton = true }: Options = {},
) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingNavigation | null>(null);

  const whenRef = useRef(when);
  const bypassRef = useRef(false);
  const ignorePopRef = useRef(false);
  const guardPushedRef = useRef(false);

  useEffect(() => {
    whenRef.current = when;
  }, [when]);

  // Closing the tab, reloading, or leaving for another site.
  useEffect(() => {
    if (!when) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (bypassRef.current) return;

      event.preventDefault();
      // Some browsers only show the prompt when returnValue is set.
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  // In-app links. Capture phase, so this runs before Next's Link handler.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!whenRef.current || bypassRef.current) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;

      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);

      // Other sites are handled by beforeunload.
      if (url.origin !== window.location.origin) return;

      // Same page, or only the #hash changes.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setPending({ kind: "link", href: url.pathname + url.search + url.hash });
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The Back button. While dirty we keep one extra history entry in front of
  // the page. Pressing Back lands on the real entry, where we can ask first.
  useEffect(() => {
    if (!guardBackButton) return;

    function onPopState() {
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        return;
      }

      if (bypassRef.current) return;

      if (whenRef.current) {
        setPending({ kind: "back" });
        return;
      }

      // Saved since the guard entry was added: step over it so Back still
      // takes one press.
      if (guardPushedRef.current) {
        guardPushedRef.current = false;
        window.history.back();
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [guardBackButton]);

  useEffect(() => {
    if (!guardBackButton || !when || guardPushedRef.current) return;

    // Reuse the current state object. Next.js stores its own bookkeeping
    // there and reloads the page if it finds a state without it.
    window.history.pushState(window.history.state, "", window.location.href);
    guardPushedRef.current = true;
  }, [when, guardBackButton]);

  const stay = useCallback(() => {
    if (pending?.kind === "back") {
      // Return to the guard entry. That fires a popstate we should ignore.
      ignorePopRef.current = true;
      window.setTimeout(() => {
        ignorePopRef.current = false;
      }, 300);
      window.history.go(1);
    }

    setPending(null);
  }, [pending]);

  const proceed = useCallback(() => {
    bypassRef.current = true;
    setPending(null);

    if (pending?.kind === "link") {
      router.push(pending.href);
    } else if (pending?.kind === "back") {
      guardPushedRef.current = false;
      window.history.go(-1);
    }
  }, [pending, router]);

  const allowNavigation = useCallback(() => {
    bypassRef.current = true;
  }, []);

  return {
    isPrompting: pending !== null,
    stay,
    proceed,
    allowNavigation,
  };
}