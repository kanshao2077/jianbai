import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Copy, CheckCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { TiptapEditor } from '@/components/TiptapEditor';
import { WriterMenu } from '@/components/WriterMenu';
import { VersoWordmark } from '@/components/VersoWordmark';
import { Editor } from '@tiptap/react';
import { useDebounce } from '@/hooks/use-debounce';
import { COLUMNS, DEBOUNCE_DELAY, COPY_FEEDBACK_DURATION, SCROLL_HIDE_DELAY } from '@/lib/writer-config';

// 字数统计函数 - 优化版本，无需创建 DOM 元素
const countCharacters = (html: string): number => {
  if (!html) return 0;
  // 使用正则移除 HTML 标签，性能更优
  return html
    .replace(/<[^>]*>/g, '')      // 移除 HTML 标签
    .replace(/&nbsp;/g, ' ')      // 处理 HTML 实体
    .replace(/&lt;/g, '<')        // 处理 HTML 实体
    .replace(/&gt;/g, '>')        // 处理 HTML 实体
    .replace(/&amp;/g, '&')       // 处理 HTML 实体
    .replace(/\s/g, '')           // 移除所有空白字符
    .length;
};

const WriterPage: React.FC = () => {
  // 状态管理
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({});
  const [contents, setContents] = useState<{ [key: string]: string }>({});
  const [titles, setTitles] = useState<{ [key: string]: string }>({});
  const [showAbout, setShowAbout] = useState(false);
  const [copied, setCopied] = useState(false);
  const [soloColumn, setSoloColumn] = useState<string | null>(null);
  const aboutDialogRef = useRef<HTMLDialogElement>(null);
  
  // 沉浸式写作流状态
  const [focusedColumn, setFocusedColumn] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<{ [key: string]: boolean }>({});
  
  // 记录最后激活的列（用于复制功能，不受焦点丢失影响）
  const [lastActiveColumn, setLastActiveColumn] = useState<string | null>(null);
  
  // 滚动容器引用 - 用于幽灵滚动条
  const scrollContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const scrollTimers = useRef<{ [key: string]: number }>({});
  const editingTimers = useRef<{ [key: string]: number }>({});
  const soloScrollPositions = useRef<{ [key: string]: number } | null>(null);
  
  // 编辑器实例引用 - 用于复制 Markdown
  const editorRefs = useRef<{ [key: string]: Editor | null }>({
    material: null,
    draft1: null,
    draft2: null,
    final: null,
  });

  useEffect(() => {
    const dialog = aboutDialogRef.current;
    if (showAbout) dialog?.showModal();
    else if (dialog?.open) dialog.close();
  }, [showAbout]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !showAbout) setSoloColumn(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAbout]);

  useEffect(() => () => {
    Object.values(scrollTimers.current).forEach(clearTimeout);
    Object.values(editingTimers.current).forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (soloColumn) {
      const frame = requestAnimationFrame(() => {
        const editor = editorRefs.current[soloColumn];
        if (editor && !editor.isDestroyed) editor.view.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
    if (!soloScrollPositions.current) return;
    const positions = soloScrollPositions.current;
    const frame = requestAnimationFrame(() => {
      Object.entries(positions).forEach(([id, top]) => {
        const container = scrollContainerRefs.current[id];
        if (container) container.scrollTop = top;
      });
      soloScrollPositions.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [soloColumn]);

  // 从 LocalStorage 加载数据（仅首次渲染）
  useEffect(() => {
    const loadedContents: { [key: string]: string } = {};
    const loadedTitles: { [key: string]: string } = {};
    
    COLUMNS.forEach(col => {
      loadedContents[col.id] = localStorage.getItem(col.storageKey) || '';
      loadedTitles[col.id] = localStorage.getItem(col.titleKey) || '';
    });
    
    setContents(loadedContents);
    setTitles(loadedTitles);
  }, []);

  // 🔧 优化：使用防抖 hook 保存内容
  const debouncedContents = useDebounce(contents, DEBOUNCE_DELAY);
  
  useEffect(() => {
    COLUMNS.forEach(col => {
      if (debouncedContents[col.id] !== undefined) {
        localStorage.setItem(col.storageKey, debouncedContents[col.id]);
      }
    });
  }, [debouncedContents]);

  // 🔧 优化：使用防抖 hook 保存标题
  const debouncedTitles = useDebounce(titles, DEBOUNCE_DELAY);
  
  useEffect(() => {
    COLUMNS.forEach(col => {
      if (debouncedTitles[col.id] !== undefined) {
        localStorage.setItem(col.titleKey, debouncedTitles[col.id]);
      }
    });
  }, [debouncedTitles]);

  // 🔧 优化：使用 useMemo 缓存字数统计结果
  const charCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    COLUMNS.forEach(col => {
      counts[col.id] = countCharacters(contents[col.id] || '');
    });
    return counts;
  }, [contents]);

  // 切换折叠状态
  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Keep the writing indicator stable during a burst of typing.
  const markEditing = useCallback((id: string) => {
    clearTimeout(editingTimers.current[id]);
    setEditingStatus(prev => ({ ...prev, [id]: true }));
    editingTimers.current[id] = window.setTimeout(() => {
      setEditingStatus(prev => ({ ...prev, [id]: false }));
    }, 1400);
  }, []);

  const updateContent = useCallback((id: string, value: string) => {
    setContents(prev => ({ ...prev, [id]: value }));
    markEditing(id);
  }, [markEditing]);

  const updateTitle = useCallback((id: string, value: string) => {
    setTitles(prev => ({ ...prev, [id]: value }));
    markEditing(id);
  }, [markEditing]);
  
  // 幽灵滚动条处理 - 滚动时显示，停止后隐藏
  const handleScroll = useCallback((id: string) => {
    const container = scrollContainerRefs.current[id];
    if (!container) return;
    
    // 添加滚动状态类
    container.classList.add('is-scrolling');
    
    // 清除之前的定时器
    if (scrollTimers.current[id]) {
      clearTimeout(scrollTimers.current[id]);
    }
    
    // 设置新的定时器，后移除滚动状态类
    scrollTimers.current[id] = setTimeout(() => {
      container.classList.remove('is-scrolling');
    }, SCROLL_HIDE_DELAY);
  }, []);

  // 🔧 改进：复制功能，使用 Sonner toast 替代 alert，增加降级方案
  const copyCurrentColumn = useCallback(async () => {
    // 检查是否有最后激活的列
    if (!lastActiveColumn) {
      toast.warning('Select a column to copy');
      return;
    }
    
    // 获取编辑器实例
    const editor = editorRefs.current[lastActiveColumn];
    
    if (!editor || editor.isDestroyed) {
      toast.error('The editor is not ready. Try again.');
      return;
    }
    
    const textToCopy = editor.storage.markdown.getMarkdown();
    
    // 检查内容是否为空
    if (!textToCopy || textToCopy.trim() === '') {
      toast.info('This column is empty');
      return;
    }
    
    // 找到当前列的名称
    const currentColumn = COLUMNS.find(col => col.id === lastActiveColumn);
    const columnName = currentColumn?.title || 'column';
    
    try {
      // 尝试使用现代 Clipboard API
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
      toast.success(`Copied ${columnName}`, {
        description: `${textToCopy.length} characters · Markdown`,
        duration: COPY_FEEDBACK_DURATION,
      });
    } catch {
      // 降级方案：使用 document.execCommand
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        const didCopy = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!didCopy) throw new Error('Copy failed');
        
        setCopied(true);
        setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
        toast.success(`Copied ${columnName}`);
      } catch {
        toast.error('Could not copy. Select the text and copy manually.');
      }
    }
  }, [lastActiveColumn]);

  // One clear action, with a complete four-column undo.
  const clearAllContent = useCallback(() => {
    const snapshot = { contents: { ...contents }, titles: { ...titles } };
    COLUMNS.forEach(col => {
      localStorage.removeItem(col.storageKey);
      localStorage.removeItem(col.titleKey);
    });
    setContents({});
    setTitles({});
    
    // 清空所有编辑器内容
    Object.values(editorRefs.current).forEach(editor => {
      if (editor && !editor.isDestroyed) {
        editor.commands.clearContent(false);
      }
    });
    
    toast.success('Workspace reset', {
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: () => {
          setContents(snapshot.contents);
          setTitles(snapshot.titles);
          COLUMNS.forEach(col => {
            editorRefs.current[col.id]?.commands.setContent(snapshot.contents[col.id] || '', { emitUpdate: false });
          });
        },
      },
    });
  }, [contents, titles]);

  const toggleSolo = useCallback(() => {
    if (soloColumn) {
      setSoloColumn(null);
      return;
    }
    const id = lastActiveColumn || 'final';
    soloScrollPositions.current = Object.fromEntries(
      Object.entries(scrollContainerRefs.current).map(([column, container]) => [column, container?.scrollTop || 0]),
    );
    setCollapsed(prev => ({ ...prev, [id]: false }));
    setSoloColumn(id);
  }, [soloColumn, lastActiveColumn]);

  const activeColumnTitle = COLUMNS.find(col => col.id === lastActiveColumn)?.title;
  const isWriting = Boolean(focusedColumn && editingStatus[focusedColumn]);

  return (
    <div className="writer-shell w-full flex flex-col overflow-hidden bg-background" data-writing={isWriting || undefined} data-solo={Boolean(soloColumn) || undefined}>
      <header className="writer-toolbar flex items-center justify-end border-b border-border bg-background">
        <h1 className="writer-wordmark"><VersoWordmark /></h1>
        <div className="writer-toolbar-controls flex items-center gap-1">
          <button
            type="button"
            onClick={copyCurrentColumn}
            className="writer-icon-button"
            title={activeColumnTitle ? `Copy ${activeColumnTitle} · Markdown` : 'Copy current column · Markdown'}
            aria-label={activeColumnTitle ? `Copy ${activeColumnTitle}` : 'Copy current column'}
          >
            {copied ? <CheckCheck className="w-[18px] h-[18px]" /> : <Copy className="w-[18px] h-[18px]" />}
          </button>
          <WriterMenu
            onAbout={() => setShowAbout(true)}
            onToggleFocus={toggleSolo}
            focused={Boolean(soloColumn)}
            onReset={clearAllContent}
          />
        </div>
      </header>
      {/* 主编辑区域 - 工业质感背景 */}
      <div className="writer-columns flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden bg-background">
        {COLUMNS.map((col) => {
          const isCollapsed = collapsed[col.id];
          const charCount = charCounts[col.id] || 0;
          
          return (
            <div
              key={col.id}
              className={`writer-column flex-shrink-0 ${isCollapsed ? 'w-[52px]' : 'writer-column-open flex-1'} h-full ${col.bgColor} border-r border-border relative overflow-hidden`}
              hidden={Boolean(soloColumn && soloColumn !== col.id)}
              data-active={focusedColumn === col.id ? 'true' : undefined}
              style={{ 
                transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
            >
              {isCollapsed && (
                // 折叠状态 - 竖排标题
                (<div className="h-full flex flex-col items-center justify-center relative">
                  <button
                    onClick={() => toggleCollapse(col.id)}
                    aria-label={`Expand ${col.title}`}
                    title={`Expand ${col.title}`}
                    className="writer-icon-button absolute top-3 left-1/2 -translate-x-1/2"
                    style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="writing-mode-vertical text-xs font-medium tracking-wide text-muted-foreground tabular-nums" style={{ writingMode: 'vertical-rl' }}>
                    {titles[col.id] || col.title}
                  </div>
                </div>)
              )}
                {/* Keep editors mounted so folding preserves selection and undo. */}
                <div className="h-full flex flex-col" hidden={isCollapsed}>
                  {/* 列头部 - Braun 工业丝印风格 */}
                  <div className="writer-column-header flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="writer-column-label">{col.title}</h2>
                      {/* 状态呼吸灯 - 编辑时显示橙色圆点 */}
                      {editingStatus[col.id] && (
                        <span className="writer-editing-indicator" title="Editing" aria-label="Editing" />
                      )}
                    </div>
                    <div className="writer-column-meta flex items-center gap-3">
                      {/* 字数统计 - 等宽数字 - 丝印刻度感 - 固定宽度确保对齐 */}
                      <span className="writer-count text-xs text-muted-foreground tabular-nums inline-block text-right" aria-label={`${charCount} characters`}>
                        {charCount}
                      </span>
                      {!soloColumn && <button
                        onClick={() => toggleCollapse(col.id)}
                        aria-label={`Collapse ${col.title}`}
                        title={`Collapse ${col.title}`}
                        className="writer-icon-button"
                        style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>}
                    </div>
                  </div>

                  {/* 稿件标题与正文左边缘对齐 */}
                  <div className="writer-title-frame">
                    <input
                      type="text"
                      value={titles[col.id] || ''}
                      onChange={(e) => updateTitle(col.id, e.target.value)}
                      placeholder={col.titlePlaceholder}
                      aria-label={`${col.title} title`}
                      className="writer-title w-full bg-transparent border-none caret-braun-orange"
                      onFocus={() => {
                        setFocusedColumn(col.id);
                        setLastActiveColumn(col.id);
                      }}
                      onBlur={() => setFocusedColumn(null)}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    />
                  </div>
                  {/* Tiptap 编辑器 - 所见即所得 Magic Markdown - 呼吸式滚动条 */}
                  <div 
                    ref={(el) => { scrollContainerRefs.current[col.id] = el; }}
                    className="flex-1 overflow-y-auto overflow-x-hidden editor-scroll-container"
                    onScroll={() => handleScroll(col.id)}
                  >
                    <TiptapEditor
                      value={contents[col.id] || ''}
                      onChange={(value) => updateContent(col.id, value)}
                      placeholder={col.contentPlaceholder}
                      label={`${col.title} content`}
                      onFocus={() => {
                        setFocusedColumn(col.id);
                        setLastActiveColumn(col.id); // 记录最后激活的列
                      }}
                      onBlur={() => setFocusedColumn(null)}
                      editorRef={(() => {
                        // 为每个列创建一个独立的 ref 对象
                        const ref = { 
                          get current() { return editorRefs.current[col.id]; },
                          set current(value) { editorRefs.current[col.id] = value; }
                        };
                        return ref as React.MutableRefObject<Editor | null>;
                      })()}
                    />
                  </div>
                </div>
            </div>
          );
        })}
      </div>
      {/* 关于模态框 - Braun 工业规格说明书 */}
        <dialog
          ref={aboutDialogRef}
          className="writer-about-dialog"
          aria-labelledby="writer-about-title"
          onCancel={(event) => { event.preventDefault(); setShowAbout(false); }}
          onClick={(event) => { if (event.target === event.currentTarget) setShowAbout(false); }}
        >
          <div className="writer-about-content" onClick={(event) => event.stopPropagation()}>
            <div className="writer-about-heading">
              <h2 id="writer-about-title" className="writer-wordmark"><VersoWordmark /></h2>
              <button type="button" className="writer-icon-button" aria-label="Close About" onClick={() => setShowAbout(false)}>
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>
            <p className="writer-about-intro">A quiet workspace for parallel writing.</p>
            <div className="writer-about-section">
              <h3>From source to final</h3>
              <p>Four columns for references, drafts, edits, and finished work. Write in Markdown, copy with formatting, or focus on a single column.</p>
            </div>
            <div className="writer-about-section">
              <h3>Saved here</h3>
              <p>Your titles and drafts save automatically in this browser. No account, no cloud sync. Clearing browser data removes them, so copy out work you want to keep.</p>
            </div>
            <div className="writer-about-footer">
              <p>Made by Kan Shao 2077.</p>
              <button type="button" onClick={() => setShowAbout(false)} className="writer-text-button">Back to writing</button>
            </div>
          </div>
        </dialog>
    </div>
  );
};

export default WriterPage;
