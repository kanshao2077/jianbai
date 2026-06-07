import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Info, Copy, CheckCheck, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TiptapEditor } from '@/components/TiptapEditor';
import { Editor } from '@tiptap/react';
import { useDebounce } from '@/hooks/use-debounce';
import { COLUMNS, DEBOUNCE_DELAY, COPY_FEEDBACK_DURATION, EDITING_STATUS_DURATION, SCROLL_HIDE_DELAY } from '@/lib/writer-config';
import type { ColumnConfig } from '@/lib/writer-config';

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
  
  // 沉浸式写作流状态
  const [focusedColumn, setFocusedColumn] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<{ [key: string]: boolean }>({});
  
  // 记录最后激活的列（用于复制功能，不受焦点丢失影响）
  const [lastActiveColumn, setLastActiveColumn] = useState<string | null>(null);
  
  // 滚动容器引用 - 用于幽灵滚动条
  const scrollContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const scrollTimers = useRef<{ [key: string]: number }>({});
  
  // 编辑器实例引用 - 用于复制功能（获取纯文本）
  const editorRefs = useRef<{ [key: string]: Editor | null }>({
    material: null,
    draft1: null,
    draft2: null,
    final: null,
  });

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

  // 更新内容
  const updateContent = useCallback((id: string, value: string) => {
    setContents(prev => ({ ...prev, [id]: value }));
    // 标记为正在编辑
    setEditingStatus(prev => ({ ...prev, [id]: true }));
    // 后标记为已保存
    setTimeout(() => {
      setEditingStatus(prev => ({ ...prev, [id]: false }));
    }, EDITING_STATUS_DURATION);
  }, []);

  // 更新标题
  const updateTitle = useCallback((id: string, value: string) => {
    setTitles(prev => ({ ...prev, [id]: value }));
  }, []);
  
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
      toast.warning('请先点击要复制的编辑框');
      return;
    }
    
    // 获取编辑器实例
    const editor = editorRefs.current[lastActiveColumn];
    
    if (!editor || editor.isDestroyed) {
      toast.error('编辑器未初始化，请重试');
      return;
    }
    
    // 获取纯文本
    const textToCopy = editor.getText();
    
    // 检查内容是否为空
    if (!textToCopy || textToCopy.trim() === '') {
      toast.info('当前列内容为空');
      return;
    }
    
    // 找到当前列的名称
    const currentColumn = COLUMNS.find(col => col.id === lastActiveColumn);
    const columnName = currentColumn?.title || '内容';
    
    try {
      // 尝试使用现代 Clipboard API
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
      toast.success(`已复制 ${columnName}`, {
        description: `${textToCopy.length} 个字符`,
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
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setCopied(true);
        setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
        toast.success(`已复制 ${columnName}`);
      } catch {
        toast.error('复制失败，请手动选择文本复制');
      }
    }
  }, [lastActiveColumn]);

  // 一键清空所有列的标题和正文
  const clearAllContent = useCallback(() => {
    // 清空所有列的内容和标题
    COLUMNS.forEach(col => {
      localStorage.removeItem(col.storageKey);
      localStorage.removeItem(col.titleKey);
    });
    setContents({});
    setTitles({});
    
    // 清空所有编辑器内容
    Object.values(editorRefs.current).forEach(editor => {
      if (editor && !editor.isDestroyed) {
        editor.commands.clearContent();
      }
    });
    
    toast.success('已清空所有内容');
  }, []);

  // 重置所有内容
  const resetAll = useCallback(() => {
    if (window.confirm('确定要清空所有内容吗？此操作不可恢复。')) {
      COLUMNS.forEach(col => {
        localStorage.removeItem(col.storageKey);
        localStorage.removeItem(col.titleKey);
      });
      setContents({});
      setTitles({});
      toast.success('已重置所有内容');
    }
  }, []);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      {/* 顶部工具栏 - Braun 工业风格 */}
      <header className="flex items-center justify-between pl-4 pr-2 py-2 border-b border-border/30 bg-background">
        <div className="flex-1"></div>
        <h1 className="text-2xl font-black tracking-tighter text-black dark:text-white">见白</h1>
        <div className="flex-1 flex items-center justify-end gap-4 pr-2">
          <button
            onClick={() => setShowAbout(true)}
            className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-neutral-600 hover:text-braun-orange active:scale-95 transition-all duration-75 hover:scale-110"
            style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            title="关于"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={copyCurrentColumn}
            className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-neutral-600 hover:text-braun-orange active:scale-95 transition-all duration-75 hover:scale-110"
            style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            title="复制当前列"
          >
            {copied ? <CheckCheck className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          <button
            onClick={clearAllContent}
            className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-neutral-600 hover:text-red-500 active:scale-95 transition-all duration-75 hover:scale-110"
            style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            title="一键清空所有内容"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={resetAll}
            className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-neutral-600 hover:text-braun-orange active:scale-95 transition-all duration-75 hover:scale-110"
            style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            title="重置"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>
      {/* 主编辑区域 - 工业质感背景 */}
      <div className="flex-1 flex overflow-x-auto overflow-y-hidden no-scrollbar bg-neutral-100">
        {COLUMNS.map((col) => {
          const isCollapsed = collapsed[col.id];
          const charCount = charCounts[col.id] || 0;
          
          return (
            <div
              key={col.id}
              className={`flex-shrink-0 ${isCollapsed ? 'w-[60px]' : 'flex-1 min-w-0'} h-full ${col.bgColor} border-r border-black/5 transition-all duration-300 relative overflow-hidden rounded-[3px]`}
              style={{ 
                transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                opacity: focusedColumn && focusedColumn !== col.id ? 0.5 : 1
              }}
            >
              {isCollapsed ? (
                // 折叠状态 - 竖排标题
                (<div className="h-full flex flex-col items-center justify-center relative">
                  <button
                    onClick={() => toggleCollapse(col.id)}
                    className="absolute top-4 left-1/2 -translate-x-1/2 p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-neutral-600 hover:text-braun-orange active:scale-95 transition-all duration-75"
                    style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="writing-mode-vertical text-xs font-bold uppercase tracking-wide text-neutral-700 tabular-nums" style={{ writingMode: 'vertical-rl' }}>
                    {titles[col.id] || col.title}
                  </div>
                </div>)
              ) : (
                // 展开状态 - 完整编辑器
                (<div className="h-full flex flex-col">
                  {/* 列头部 - Braun 工业丝印风格 */}
                  <div className="flex items-center justify-between px-4 py-1.5 border-b border-black/5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold uppercase tracking-wide text-[#333333] tabular-nums">{col.title}</h2>
                      {/* 状态呼吸灯 - 编辑时显示橙色圆点 */}
                      {editingStatus[col.id] && (
                        <div className="w-2 h-2 rounded-full bg-braun-orange animate-pulse" title="正在编辑"></div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* 字数统计 - 等宽数字 - 丝印刻度感 - 固定宽度确保对齐 */}
                      <span className="font-mono text-[10px] text-[#333333] tracking-wide tabular-nums inline-block text-right" style={{ minWidth: '60px' }}>
                        CNT: {charCount}
                      </span>
                      <button
                        onClick={() => toggleCollapse(col.id)}
                        className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-neutral-600 hover:text-braun-orange active:scale-95 transition-all duration-75"
                        style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 自定义子标题输入框 - Braun 工业风格 - 居中对齐 - 极淡水印 */}
                  <div className="px-4 py-1 border-b border-black/5">
                    <input
                      type="text"
                      value={titles[col.id] || ''}
                      onChange={(e) => updateTitle(col.id, e.target.value)}
                      placeholder={col.titlePlaceholder}
                      className="w-full bg-transparent border-none outline-none text-black font-sans font-bold text-sm focus:text-black transition-colors placeholder:text-neutral-300 placeholder:opacity-30 text-center caret-braun-orange"
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
                </div>)
              )}
            </div>
          );
        })}
      </div>
      {/* 关于模态框 - Braun 工业规格说明书 */}
      {showAbout && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-[#FDFDFD] rounded-none shadow-2xl max-w-3xl w-full p-8 max-h-[85vh] overflow-y-auto border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER 页眉 - 紧凑无间距 */}
            <div className="mb-2">
              <h2 className="text-2xl font-black tracking-tighter text-black">见白 / JIAN BAI</h2>
              <p className="font-mono text-[10px] text-neutral-400 tracking-wider mb-[NaNpx]">A creation birthed by Kan Shao 2077</p>
            </div>

            {/* SECTION 1: PHILOSOPHY / 写作哲学 */}
            <div className="-mt-2">
              <h3 className="font-sans text-base font-bold tracking-widest mb-4 pt-6 border-dotted border-[0.8px] border-[rgb(245,245,245)] text-[#a3a3a3ff]">PHILOSOPHY / 写作哲学</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <span className="font-mono text-sm text-[#EB5208] shrink-0">01</span>
                  <div>
                    <p className="font-sans font-bold text-sm tracking-wide text-black uppercase mb-1">CHAOS · 始于混沌</p>
                    <p className="font-serif text-sm leading-relaxed text-neutral-600">[素材] 是灵感的堆栈、是世界的原始切片。深灰、沉重、未经审视。我们从噪点中提取信号。此时请无需在意格式。我说的。</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="font-mono text-sm text-[#EB5208] shrink-0">02</span>
                  <div>
                    <p className="font-sans font-bold text-sm tracking-wide text-black uppercase mb-1">
                      FILTER · 思维窄门
                    </p>
                    <p className="font-serif text-sm leading-relaxed text-neutral-600">[初稿] 是心流的输出。不问逻辑，不纠措辞，只求宣泄。[二稿] 是理性的回归，在此处重构逻辑，修剪枝蔓。在此之间，权衡、试错、推翻。剔除一切非必要的冗余。</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="font-mono text-sm text-[#EB5208] shrink-0">03</span>
                  <div>
                    <p className="font-sans font-bold text-sm tracking-wide text-black uppercase mb-1">
                      VOID · 落纸见白
                    </p>
                    <p className="font-serif text-sm leading-relaxed text-neutral-600">[定稿] 是纯粹的白，可用于存放最终的交付。白不是空无一物，而是极多之上的极少，是所有可能性的最终形态。当文字进入此栏，代表它已准备好面对世界。器物有形，而用无界。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: DESIGN SPECS / 设计参数 */}
            <div className="mt-8">
              <h3 className="font-sans text-base font-bold tracking-widest text-neutral-400 mb-4 border-t border-neutral-100 pt-6">
                DESIGN SPECS / 设计参数
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <span className="font-mono text-sm text-[#EB5208] shrink-0">01</span>
                  <div>
                    <p className="font-sans font-bold text-sm tracking-wide text-black uppercase mb-1">STRUCTURE · 秩序</p>
                    <p className="font-serif text-sm leading-relaxed text-neutral-600">
                      四栏渐进布局 (素材→定稿)。用物理空间的推移，具象化思维的进阶。
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="font-mono text-sm text-[#EB5208] shrink-0">02</span>
                  <div>
                    <p className="font-sans font-bold text-sm tracking-wide text-black uppercase mb-1">
                      AESTHETIC · 质感
                    </p>
                    <p className="font-serif text-sm leading-relaxed text-neutral-600">橙色脉搏。亮起的呼吸灯是系统的脉搏。自动保存。聚焦后蔡司光学高亮。</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="font-mono text-sm text-[#EB5208] shrink-0">03</span>
                  <div>
                    <p className="font-sans font-bold text-sm tracking-wide text-black uppercase mb-1">
                      PRECISION · 精密
                    </p>
                    <p className="font-serif text-sm leading-relaxed text-neutral-600">参数化字数统计、支持 markdown 格式，零干扰隐藏式滚动条。可一键复制，但也极致克制。</p>
                  </div>
                </div>
              </div>
            </div>


            {/* FOOTER 页脚 */}
            <div className="pt-6 border-t border-neutral-100 mt-[15px]">
              <p className="font-mono text-[10px] text-neutral-300 tracking-wider">
                © 2025 JIAN BAI WRITING SYSTEM · DESIGNED FOR CLARITY
              </p>
            </div>

            {/* 关闭按钮 - 纸张复古感 */}
            <button
              onClick={() => setShowAbout(false)}
              className="mt-6 w-full py-3 bg-[#F5F1E8] text-black rounded-none hover:bg-[#EDE7D9] transition-colors font-sans font-bold text-xs uppercase tracking-widest shadow-sm border border-neutral-200"
            >
              开始写作 / START WRITING
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WriterPage;
