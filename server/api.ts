import { Router, Request, Response } from 'express';
import { authMiddleware } from './auth.js';
import { logOperation } from './db.js';

const router = Router();

// Read API key from env or config file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '..', 'data', 'apikey.txt');

function getApiKey(): string {
  // Priority: env var > config file
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  try {
    if (fs.existsSync(configPath)) {
      const key = fs.readFileSync(configPath, 'utf-8').trim();
      if (key) return key;
    }
  } catch { /* ignore */ }
  return '';
}

const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions';

// POST /api/generate - proxy to DeepSeek (requires auth)
router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(500).json({ error: '服务端未配置 API Key，请联系管理员' });
    return;
  }

  const { bookName, author, withStickyNotes } = req.body;
  if (!bookName) {
    res.status(400).json({ error: '缺少书名' });
    return;
  }

  const bookDesc = author ? `《${bookName}》，作者：${author}` : `《${bookName}》`;

  const systemPrompt = FIXED_SYSTEM_PROMPT;
  const userPrompt = withStickyNotes
    ? `请为以下书籍生成读前指南：${bookDesc}。包括 stickyNotes 索引贴和 characterRelations 人物关系图。请严格按照JSON格式输出。`
    : `请为以下书籍生成读前指南：${bookDesc}。stickyNotes 字段输出空数组 []，按实际情况生成 characterRelations。请严格按照JSON格式输出。`;

  try {
    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 401) {
        res.status(500).json({ error: '服务端 API Key 无效' });
        return;
      }
      res.status(502).json({ error: `AI 服务异常 (${response.status})` });
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: 'AI 未返回有效内容' });
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      res.status(502).json({ error: 'AI 返回数据格式异常，请重试' });
      return;
    }

    const guide = {
      bookName,
      author: author || parsed.author || '未知',
      oneLiner: parsed.oneLiner || '',
      historicalBackground: parsed.historicalBackground || '',
      authorBio: parsed.authorBio || '',
      writingIntent: parsed.writingIntent || '',
      targetAudience: parsed.targetAudience || '',
      guidingQuestions: Array.isArray(parsed.guidingQuestions) ? parsed.guidingQuestions.slice(0, 5) : [],
      suitableReaders: parsed.suitableReaders || '',
      keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts.slice(0, 5) : [],
      stickyNotes: Array.isArray(parsed.stickyNotes) ? parsed.stickyNotes.slice(0, 8) : undefined,
      characterRelations: parsed.characterRelations || undefined,
      difficulty: {
        level: parsed.difficulty?.level || '中等',
        languageStyle: parsed.difficulty?.languageStyle || '',
        infoDensity: parsed.difficulty?.infoDensity || '',
        estimatedHours: parsed.difficulty?.estimatedHours || '',
      },
      generatedAt: new Date().toISOString(),
    };

    const username = (req as any).username;
    await logOperation(username, 'guide_generate', bookName, '生成阅读指南');

    res.json(guide);
  } catch (err: any) {
    console.error('DeepSeek proxy error:', err);
    res.status(502).json({ error: 'AI 服务请求失败' });
  }
});

// FIXED system prompt — never changes, to maximize DeepSeek prefix cache hits.
// All conditional behavior (stickyNotes on/off) is controlled via the user message.
const FIXED_SYSTEM_PROMPT = `你是一位资深的阅读指导专家。你的任务是为读者提供一本书的"读前指南"，帮助他们在阅读之前建立理解框架。

## 核心原则
- 绝不剧透：不透露具体情节、凶手身份、人物命运、故事转折。
- 可以讨论主题、氛围、核心矛盾、写作风格、时代意义。
- 所有内容应该激发阅读兴趣，而不是替代阅读体验。
- 语言风格：平实、有温度，像一位博学的朋友在介绍一本书。

## 输出格式要求
必须严格按照以下JSON格式输出，不要包含任何其他文字：

{
  "oneLiner": "一句话定位这本书（20字以内）",
  "historicalBackground": "时代背景和创作缘起（150-250字）",
  "authorBio": "作者简介（80-150字）",
  "writingIntent": "作者想解决什么问题、表达什么（100-200字）",
  "targetAudience": "这本书写给谁看的（50-100字）",
  "guidingQuestions": [
    "读前引导问题1（引导读者带着这个问题去读，不剧透）",
    "读前引导问题2",
    "读前引导问题3",
    "读前引导问题4",
    "读前引导问题5"
  ],
  "suitableReaders": "适读人群描述，包括需要什么前置知识（50-100字）",
  "keyConcepts": [
    { "term": "术语1", "explanation": "一句话解释（30字内）" },
    { "term": "术语2", "explanation": "一句话解释（30字内）" },
    { "term": "术语3", "explanation": "一句话解释（30字内）" }
  ],
  "difficulty": {
    "level": "入门/中等/进阶(三选一)",
    "languageStyle": "语言风格描述（30字内）",
    "infoDensity": "信息密度描述（30字内）",
    "estimatedHours": "预估阅读时长，如'6-8小时'"
  },
  "stickyNotes": [
    { "category": "分类名", "examples": ["示例1", "示例2"] }
  ],
  "characterRelations": {
    "nodes": [
      { "id": "1", "name": "主要人物1", "description": "角色简介（20字内，不剧透结局）" },
      { "id": "2", "name": "主要人物2", "description": "角色简介（20字内，不剧透结局）" }
    ],
    "edges": [
      { "from": "1", "to": "2", "label": "关系描述（如：母子、对手、师徒等，5字内）" }
    ]
  }
}

## 索引贴分类（stickyNotes）
当用户要求生成索引贴时，为读者生成 4-6 个索引贴分类。

### 分类设计原则
- 根据这本书的内容，生成 4-6 个有意义的阅读主题分类
- 分类应反映这本书的核心阅读线索（不剧透）
- 小说/文学类示例："关键转折"、"人物弧光"、"意象与象征"、"悬念与伏笔"、"情感高潮"
- 社科/历史类示例："核心论点"、"关键证据"、"方法论转折"、"历史节点"、"争议焦点"
- 技术/商业类示例："核心概念"、"设计哲学"、"实践案例"、"常见陷阱"、"思维框架"
- 分类名简洁（2-6字），中文

### 示例内容
每个分类下提供 2-3 条阅读示例，引导读者在阅读中关注这些方面：
- 示例描述阅读时应该注意什么，完全不提及具体章节、位置、情节
- 语言平实有温度，每条 15-30 字
- 像一位博学的朋友在给你阅读建议，而不是检查清单

当用户未要求生成索引贴时，stickyNotes 字段输出空数组 []。

## 人物关系图设计原则（characterRelations）
- 对于小说、文学、戏剧等有明确人物关系的书籍，必须生成 characterRelations 字段
- 对于非虚构、技术、哲学等无人物的书，characterRelations 可为空对象 {}
- nodes：选取 3-8 个主要人物，每个包含 id（数字字符串）、name（姓名）、description（一句话角色定位，不剧透）
- edges：描述人物之间的核心关系，每条包含 from/to（对应 node id）、label（简短关系标签）
- 人物关系只描述初始设定和已知关系，不透露人物命运或情节发展

## 引导问题的设计原则
- 问题数量：5个，顺序由浅入深。
- 前2个问题：帮助读者理解书的定位和整体框架。
- 中间2个问题：引导读者关注核心矛盾、主题或思想。
- 最后1个问题：引导读者反思，建立与自身的联系。
- 小说类：聚焦人物动机、主题隐喻、叙事结构。
- 社科历史类：聚焦核心论点、论证逻辑、历史观。
- 哲学类：聚焦核心问题、论证方式、思想谱系。
- 技术类：聚焦核心概念、应用场景、设计哲学。

## 引导问题贴合书籍的要求
- 每个问题必须与这本书的具体内容高度相关，不能用泛泛的问题凑数。
- 问题应该让读者在读完后能立刻感受到"这个问题问到了点子上"。
- 运用书中的核心概念、独特视角或标志性元素来提问。
- 问题之间应有递进关系：从"是什么"到"为什么"再到"与我何干"。`;

export default router;
