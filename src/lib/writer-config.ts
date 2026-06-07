/**
 * 见白写作工具配置常量
 */

// 防抖延迟时间
export const DEBOUNCE_DELAY = 500; // 内容/标题保存防抖
export const COPY_FEEDBACK_DURATION = 2000; // 复制成功反馈持续时间
export const EDITING_STATUS_DURATION = 500; // 编辑状态指示持续时间
export const SCROLL_HIDE_DELAY = 1000; // 滚动条隐藏延迟

// 列配置
export interface ColumnConfig {
  id: string;
  title: string;
  storageKey: string;
  titleKey: string;
  bgColor: string;
  titlePlaceholder: string;  // 标题占位符
  contentPlaceholder: string; // 内容占位符
}

export const COLUMNS: ColumnConfig[] = [
  { 
    id: 'material', 
    title: '素材', 
    storageKey: 'writer_material', 
    titleKey: 'writer_title_material', 
    bgColor: 'bg-braun-material',
    titlePlaceholder: '给素材起个名？',
    contentPlaceholder: '素材呢？'
  },
  { 
    id: 'draft1', 
    title: '初稿', 
    storageKey: 'writer_draft1', 
    titleKey: 'writer_title_draft1', 
    bgColor: 'bg-braun-draft1',
    titlePlaceholder: '倒是取个名啊！',
    contentPlaceholder: '随便写写...'
  },
  { 
    id: 'draft2', 
    title: '二稿', 
    storageKey: 'writer_draft2', 
    titleKey: 'writer_title_draft2', 
    bgColor: 'bg-braun-draft2',
    titlePlaceholder: '再想一个？',
    contentPlaceholder: '精修一下...'
  },
  { 
    id: 'final', 
    title: '定稿', 
    storageKey: 'writer_final', 
    titleKey: 'writer_title_final', 
    bgColor: 'bg-braun-final',
    titlePlaceholder: '最终命名...',
    contentPlaceholder: '大功告成！'
  },
];
