"use client";

import { useCallback, useLayoutEffect, useState } from "react";

const DEFAULT_SELECTOR = "[data-kreativ-theme]";

interface UsePortalRootOptions {
  selector?: string;
}

export function usePortalRoot({
  selector = DEFAULT_SELECTOR,
}: UsePortalRootOptions = {}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const containerRef = useCallback((node: HTMLElement | null) => {
    setContainer(node);
  }, []);

  useLayoutEffect(() => {
    setPortalRoot(container?.closest<HTMLElement>(selector) ?? null);
  }, [container, selector]);

  return { containerRef, portalRoot };
}
