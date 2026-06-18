export interface StickyNote {
  /** 索引贴分类名，如"关键转折"、"意象与象征" */
  category: string;
  /** 该分类下的阅读示例（不可剧透），2-3条 */
  examples: string[];
}

export interface BookGuide {
  bookName: string;
  author: string;
  /** 一句话定位 */
  oneLiner: string;
  /** 历史背景 */
  historicalBackground: string;
  /** 作者简介 */
  authorBio: string;
  /** 写作意图 */
  writingIntent: string;
  /** 写给谁看 */
  targetAudience: string;
  /** 读前引导问题（无剧透） */
  guidingQuestions: string[];
  /** 适读人群 */
  suitableReaders: string;
  /** 核心词汇预热 */
  keyConcepts: { term: string; explanation: string }[];
  /** 阅读难度 */
  difficulty: {
    level: string;
    languageStyle: string;
    infoDensity: string;
    estimatedHours: string;
  };
  /** 索引贴分类（可选，用户开启后生成） */
  stickyNotes?: StickyNote[];
  /** 生成时间 */
  generatedAt: string;
}

export interface SearchParams {
  bookName: string;
  author?: string;
  /** 是否生成索引贴分类 */
  withStickyNotes?: boolean;
}

export type AppState = 'search' | 'loading' | 'result' | 'error';
