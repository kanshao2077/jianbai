/**
 * verso. writing workspace configuration
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
    title: 'SOURCE',
    storageKey: 'writer_material',
    titleKey: 'writer_title_material',
    bgColor: 'bg-braun-material',
    titlePlaceholder: 'Untitled',
    contentPlaceholder: 'Gather your references…'
  },
  {
    id: 'draft1',
    title: 'DRAFT',
    storageKey: 'writer_draft1',
    titleKey: 'writer_title_draft1',
    bgColor: 'bg-braun-draft1',
    titlePlaceholder: 'Untitled',
    contentPlaceholder: 'Start writing…'
  },
  {
    id: 'draft2',
    title: 'EDIT',
    storageKey: 'writer_draft2',
    titleKey: 'writer_title_draft2',
    bgColor: 'bg-braun-draft2',
    titlePlaceholder: 'Untitled',
    contentPlaceholder: 'Refine your draft…'
  },
  {
    id: 'final',
    title: 'FINAL',
    storageKey: 'writer_final',
    titleKey: 'writer_title_final',
    bgColor: 'bg-braun-final',
    titlePlaceholder: 'Untitled',
    contentPlaceholder: 'Make it ready…'
  },
];
