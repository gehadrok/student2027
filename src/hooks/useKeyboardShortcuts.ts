import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description?: string;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside input/textarea unless it's Escape or Search shortcut
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);

      shortcuts.forEach((sc) => {
        const matchesKey = e.key.toLowerCase() === sc.key.toLowerCase();
        const matchesCtrl = sc.ctrl ? e.ctrlKey || e.metaKey : true;
        const matchesAlt = sc.alt ? e.altKey : true;
        const matchesShift = sc.shift ? e.shiftKey : true;

        if (matchesKey && matchesCtrl && matchesAlt && matchesShift) {
          if (isInput && sc.key.toLowerCase() !== 'escape' && sc.key.toLowerCase() !== 'k') {
            return;
          }
          e.preventDefault();
          sc.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};
