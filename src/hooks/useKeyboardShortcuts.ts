import { useRef, useEffect } from "react";

type ShortcutHandler = (event: KeyboardEvent) => void;

export function useKeyboardShortcuts<T extends HTMLElement = HTMLElement>(
  enabled: boolean,
  shortcuts: Record<string, ShortcutHandler>,
  deps: React.DependencyList = [],
): React.RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts while editing text.
      const target = e.target as HTMLElement;

      if (
        target.matches(
          'input, textarea, select, [contenteditable="true"], [role="textbox"]',
        )
      ) {
        return;
      }

      if (e.repeat) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      let keyStr = "";

      if (isCtrlOrMeta) keyStr += "ctrl+";
      if (e.shiftKey) keyStr += "shift+";

      keyStr += key;

      const handler = shortcuts[keyStr];

      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };

    const input = ref.current;

    if (!input) return;

    input.addEventListener("keydown", handleKeyDown);

    return () => {
      input.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, ...deps]);

  return ref;
}
