import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Focus as FocusIcon, Info, Maximize, Minimize, MoreHorizontal, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface WriterMenuProps {
  onAbout: () => void;
  onToggleFocus: () => void;
  focused: boolean;
  onReset: () => void;
}

export function WriterMenu({ onAbout, onToggleFocus, focused, onReset }: WriterMenuProps) {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<'first' | 'last'>('first');
  const panelId = useId();

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  useEffect(() => {
    if (!open) return;

    const items = panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    const index = initialFocus.current === 'last' ? (items?.length ?? 1) - 1 : 0;
    items?.[index]?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const runAction = (action: () => void) => {
    closeMenu();
    action();
  };

  const confirmReset = () => {
    if (window.confirm('Reset all titles and drafts? You can undo this action.')) onReset();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      toast.error('Fullscreen is unavailable', {
        description: 'Try your browser’s fullscreen shortcut instead.',
      });
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    initialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first';
    setOpen(true);
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (event.key === 'Tab') {
      closeMenu();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    if (!items.length) return;
    const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    else if (event.key === 'ArrowDown') nextIndex = (activeIndex + 1) % items.length;
    else if (event.key === 'ArrowUp') nextIndex = (activeIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  return (
    <div className="writer-menu" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className="writer-icon-button writer-menu-trigger"
        aria-label="More options"
        title="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => {
          initialFocus.current = 'first';
          setOpen(previous => !previous);
        }}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          className="writer-menu-panel"
          role="menu"
          aria-label="Workspace options"
          onKeyDown={handleMenuKeyDown}
        >
          <button type="button" className="writer-menu-item" role="menuitem" tabIndex={-1} onClick={() => runAction(onAbout)}>
            <Info size={16} aria-hidden="true" />
            <span>Info</span>
          </button>
          <button type="button" className="writer-menu-item" role="menuitem" tabIndex={-1} title={focused ? 'Show all columns' : 'Focus on current column'} onClick={() => runAction(onToggleFocus)}>
            <FocusIcon size={16} aria-hidden="true" />
            <span>Focus</span>
          </button>
          <button type="button" className="writer-menu-item" role="menuitem" tabIndex={-1} title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={() => runAction(() => void toggleFullscreen())}>
            {fullscreen ? <Minimize size={16} aria-hidden="true" /> : <Maximize size={16} aria-hidden="true" />}
            <span>Fullscreen</span>
          </button>
          <div className="writer-menu-separator" role="separator" />
          <button type="button" className="writer-menu-item" role="menuitem" tabIndex={-1} onClick={() => runAction(confirmReset)}>
            <RotateCcw size={16} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      )}
    </div>
  );
}
