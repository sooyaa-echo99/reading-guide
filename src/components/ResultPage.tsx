import { useState, useEffect } from 'react';
import { BookGuide, StickyNote } from '../types';
import { addToBookshelf, fetchBookshelf } from '../services/api';
import QuestionQA from './QuestionQA';

interface Props {
  guide: BookGuide;
  onBack: () => void;
}

function buildPrintHTML(guide: BookGuide): string {
  const difficultyItems = [
    { label: '难度等级', value: guide.difficulty.level },
    { label: '语言风格', value: guide.difficulty.languageStyle },
    { label: '信息密度', value: guide.difficulty.infoDensity },
    { label: '预估时长', value: guide.difficulty.estimatedHours },
  ];
  const conceptsHTML = guide.keyConcepts.map((kc, i) =>
    `<div class="concept-card"><span class="concept-num">${i + 1}</span><h4>${esc(kc.term)}</h4><p>${esc(kc.explanation)}</p></div>`
  ).join('');
  const questionsHTML = guide.guidingQuestions.map((q, i) =>
    `<div class="question-row"><span class="q-num">${i + 1}</span><p>${esc(q)}</p></div>`
  ).join('');
  const diffHTML = difficultyItems.map(d =>
    `<div class="diff-card"><strong>${esc(d.value)}</strong><span>${esc(d.label)}</span></div>`
  ).join('');

  const stickyHTML = guide.stickyNotes && guide.stickyNotes.length > 0 ? (() => {
    const printPalette = ['#ef4444','#f97316','#eab308','#10b981','#3b82f6','#8b5cf6'];
    const printBg = ['#fef2f2','#fff7ed','#fffbeb','#ecfdf5','#eff6ff','#f5f3ff'];
    return `<div class="section">
  <h2>索引贴分类</h2>
  ${guide.stickyNotes!.map((sn, i) => {
    const bar = printPalette[i % 6];
    const bg = printBg[i % 6];
    return `<div style="margin-bottom:14px;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;background:#fff">
    <div style="display:flex;align-items:center;gap:8px;padding:12px 14px 8px;background:${bg}">
      <span style="width:10px;height:10px;border-radius:50%;background:${bar};display:inline-block"></span>
      <span style="font-size:12px;font-weight:700;color:${bar};letter-spacing:0.05em">${esc(sn.category)}</span>
    </div>
    <div style="padding:8px 14px 12px">
      ${sn.examples.map(ex => `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px;padding-left:4px">
        <span style="color:${bar};font-size:12px;line-height:1.7">·</span>
        <span style="font-size:13px;color:#44403c;line-height:1.6">${esc(ex)}</span>
      </div>`).join('')}
    </div>
  </div>`;
  }).join('')}
</div>`;
  })() : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>阅读指南 - ${esc(guide.bookName)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif;color:#1c1917;background:#fafaf9;padding:32px 40px;max-width:800px;margin:0 auto}
  .brand{text-align:center;padding-bottom:16px;border-bottom:2px solid #d4a574;margin-bottom:24px}
  .brand h2{font-size:22px;color:#1c1917;margin-bottom:4px}
  .brand p{font-size:12px;color:#a8a29e}
  h1{font-size:24px;margin-bottom:4px}
  .author{color:#a8a29e;margin-bottom:16px}
  .oneliner{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;font-size:17px;color:#92400e}
  .section{margin-bottom:24px}
  .section h2{font-size:13px;color:#a8a29e;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
  .block{background:#fff;border:1px solid #f5f5f4;border-radius:12px;padding:16px;margin-bottom:12px}
  .block h3{font-size:11px;color:#a8a29e;margin-bottom:6px}
  .block p{line-height:1.7;color:#57534e}
  .question-row{display:flex;gap:12px;align-items:flex-start;margin-bottom:10px}
  .q-num{width:26px;height:26px;border-radius:50%;background:#fef3c7;color:#b45309;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px}
  .question-row p{line-height:1.7;color:#44403c;padding-top:2px}
  .concepts{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px}
  .concept-card{background:#fff;border:1px solid #f5f5f4;border-radius:12px;padding:14px;flex:1;min-width:180px}
  .concept-num{font-size:10px;color:#a8a29e;background:#f5f5f4;padding:2px 8px;border-radius:99px;display:inline-block;margin-bottom:8px}
  .concept-card h4{font-size:14px;margin-bottom:4px;color:#1c1917}
  .concept-card p{font-size:13px;line-height:1.6;color:#78716c}
  .diffs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px}
  .diff-card{background:#fff;border:1px solid #f5f5f4;border-radius:12px;padding:14px;text-align:center;flex:1;min-width:100px}
  .diff-card strong{display:block;font-size:20px;color:#1c1917;margin-bottom:4px}
  .diff-card span{font-size:11px;color:#a8a29e}
  .footer{text-align:center;border-top:1px solid #e7e5e4;padding-top:16px;font-size:11px;color:#d6d3d1}
  @media print{body{padding:20px 24px;max-width:none}.no-print{display:none}@page{margin:12mm}}
</style>
</head>
<body>
<div class="no-print" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:12px 16px;margin-bottom:24px;text-align:center;font-size:14px;color:#92400e">
  点击下方按钮打印，或在打印对话框中选择 <strong>「另存为 PDF」</strong> 即可保存
  <br><button onclick="window.print()" style="margin-top:8px;padding:8px 24px;background:#d97706;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">🖨️ 打印 / 保存 PDF</button>
</div>
<div class="brand"><h2>阅读指南</h2><p>为你提供深度阅读引导</p></div>
<h1>${esc(guide.bookName)}</h1>
${guide.author && guide.author !== '未知' ? `<p class="author">${esc(guide.author)} 著</p>` : ''}
<div class="oneliner">${esc(guide.oneLiner)}</div>
<div class="section"><h2>历史背景</h2><div class="block"><h3>时代背景 & 创作缘起</h3><p>${esc(guide.historicalBackground)}</p></div><div class="block"><h3>关于作者</h3><p>${esc(guide.authorBio)}</p></div></div>
<div class="section"><h2>写作意图</h2><div class="block"><h3>作者想解决什么问题</h3><p>${esc(guide.writingIntent)}</p></div><div class="block"><h3>写给谁看</h3><p>${esc(guide.targetAudience)}</p></div></div>
<div class="section"><h2>带着这 5 个问题开始阅读</h2>${questionsHTML}</div>
<div class="section"><h2>适读人群</h2><p style="line-height:1.7;color:#57534e">${esc(guide.suitableReaders)}</p></div>
<div class="section"><h2>核心概念预热</h2><div class="concepts">${conceptsHTML}</div></div>
<div class="section"><h2>阅读难度评估</h2><div class="diffs">${diffHTML}</div></div>
${stickyHTML}
<p class="footer">由 DeepSeek AI 生成 · ${new Date(guide.generatedAt).toLocaleDateString('zh-CN')} · 不涉及剧透</p>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const STICKY_PALETTE = [
  { name: 'red',    bg: 'bg-red-50',      border: 'border-red-200',    accent: 'text-red-600',    badge: 'bg-red-100 text-red-700',    bar: 'bg-red-400' },
  { name: 'orange', bg: 'bg-orange-50',   border: 'border-orange-200', accent: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-400' },
  { name: 'amber',  bg: 'bg-amber-50',    border: 'border-amber-200',  accent: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700',   bar: 'bg-amber-400' },
  { name: 'emerald',bg: 'bg-emerald-50',  border: 'border-emerald-200',accent: 'text-emerald-600',badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400' },
  { name: 'sky',    bg: 'bg-sky-50',      border: 'border-sky-200',    accent: 'text-sky-600',    badge: 'bg-sky-100 text-sky-700',       bar: 'bg-sky-400' },
  { name: 'violet', bg: 'bg-violet-50',   border: 'border-violet-200', accent: 'text-violet-600', badge: 'bg-violet-100 text-violet-700',  bar: 'bg-violet-400' },
];

function StickyNotesSection({ notes }: { notes: StickyNote[] }) {
  const catOrder: string[] = [];
  for (const sn of notes) {
    if (!catOrder.includes(sn.category)) catOrder.push(sn.category);
  }
  const colorMap = new Map(catOrder.map((cat, i) => [cat, STICKY_PALETTE[i % STICKY_PALETTE.length]]));

  return (
    <div className="mb-10">
      <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        索引贴分类
      </h2>
      <p className="text-xs text-stone-400 mb-5">
        按主题分类的阅读索引——贴在对应的书页上，帮你标记重点
      </p>
      <div className="space-y-4">
        {notes.map((sn, i) => {
          const pal = colorMap.get(sn.category) || STICKY_PALETTE[0];
          return (
            <div key={i} className={`rounded-xl border ${pal.bg} ${pal.border} overflow-hidden transition-all`}>
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <span className={`w-3 h-3 rounded-full ${pal.bar}`} />
                <span className={`text-xs font-bold tracking-wide px-2.5 py-1 rounded-full ${pal.badge}`}>
                  {sn.category}
                </span>
              </div>
              <div className="px-4 pb-3 space-y-1.5">
                {sn.examples.map((ex, j) => (
                  <div key={j} className="flex items-start gap-2 pl-1">
                    <span className={`text-xs mt-0.5 ${pal.accent}`}>•</span>
                    <span className="text-sm text-stone-600 leading-relaxed">{ex}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========== Main Component ==========
export default function ResultPage({ guide, onBack }: Props) {
  const [exporting, setExporting] = useState(false);
  const [inBookshelf, setInBookshelf] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if already in bookshelf
  useEffect(() => {
    fetchBookshelf().then(entries => {
      const exists = entries.some(e => e.bookName === guide.bookName && e.author === (guide.author || ''));
      setInBookshelf(exists);
    }).catch(() => {}).finally(() => setChecking(false));
  }, [guide.bookName, guide.author]);

  const handleAddToBookshelf = async () => {
    try {
      await addToBookshelf({ bookName: guide.bookName, author: guide.author || undefined, status: 'unread' });
      setInBookshelf(true);
    } catch {}
  };

  const handleExportPDF = () => {
    setExporting(true);
    const html = buildPrintHTML(guide);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => { URL.revokeObjectURL(url); setExporting(false); }, 2000);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 bg-stone-50/90 backdrop-blur-sm border-b border-stone-100 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer bg-transparent border-none p-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">返回</span>
          </button>
          <span className="text-sm font-medium text-stone-800">阅读指南</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddToBookshelf}
              disabled={inBookshelf || checking}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                inBookshelf
                  ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
                  : 'border-stone-200 hover:border-amber-300 hover:text-amber-700 text-stone-500 bg-transparent'
              }`}
            >
              {inBookshelf ? '✓ 已在书架' : '+ 加入书架'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 bg-white border border-stone-200 hover:border-stone-300 rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              导出 PDF
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Book title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-800 mb-1">{guide.bookName}</h1>
          {guide.author && guide.author !== '未知' && (
            <p className="text-stone-400">{guide.author} 著</p>
          )}
        </div>

        {/* One liner */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-6 py-4 mb-10">
          <p className="text-amber-800 text-lg font-medium leading-relaxed text-center">
            {guide.oneLiner}
          </p>
        </div>

        {/* Sections */}
        <Section title="历史背景">
          <SectionBlock label="时代背景 & 创作缘起" text={guide.historicalBackground} />
          <SectionBlock label="关于作者" text={guide.authorBio} />
        </Section>

        <Section title="写作意图">
          <SectionBlock label="作者想解决什么问题" text={guide.writingIntent} />
          <SectionBlock label="写给谁看" text={guide.targetAudience} />
        </Section>

        {/* Guiding questions - with Q&A */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            带着这 5 个问题开始阅读
          </h2>
          <p className="text-xs text-stone-400 mb-4">点击问题可展开，写下你的思考或查看他人回答</p>
          <div className="space-y-2">
            {guide.guidingQuestions.map((q, i) => (
              <QuestionQA key={i} question={q} index={i} bookName={guide.bookName} author={guide.author} />
            ))}
          </div>
        </div>

        <Section title="适读人群">
          <p className="text-stone-600 leading-relaxed">{guide.suitableReaders}</p>
        </Section>

        {/* Key concepts */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-5">
            核心概念预热
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {guide.keyConcepts.map((kc, i) => (
              <div key={i} className="bg-white border border-stone-100 rounded-xl px-5 py-4">
                <span className="text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full">
                  {i + 1}
                </span>
                <h4 className="text-stone-800 font-medium mt-2 mb-1">{kc.term}</h4>
                <p className="text-stone-500 text-sm leading-relaxed">{kc.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-5">
            阅读难度评估
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DiffCard label="难度等级" value={guide.difficulty.level} />
            <DiffCard label="语言风格" value={guide.difficulty.languageStyle} />
            <DiffCard label="信息密度" value={guide.difficulty.infoDensity} />
            <DiffCard label="预估时长" value={guide.difficulty.estimatedHours} />
          </div>
        </div>

        {/* Sticky Notes Index */}
        {guide.stickyNotes && guide.stickyNotes.length > 0 && (
          <StickyNotesSection notes={guide.stickyNotes} />
        )}

        {/* Generated time */}
        <p className="text-xs text-stone-300 text-center pt-4 border-t border-stone-100">
          由 DeepSeek AI 生成 · {new Date(guide.generatedAt).toLocaleDateString('zh-CN')}
          · 不涉及剧透
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-5">
        {title}
      </h2>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function SectionBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="bg-white border border-stone-100 rounded-xl px-6 py-5">
      <h3 className="text-xs text-stone-400 font-medium mb-2">{label}</h3>
      <p className="text-stone-600 leading-relaxed">{text}</p>
    </div>
  );
}

function DiffCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-stone-100 rounded-xl px-5 py-4 text-center">
      <p className="text-2xl mb-1 font-medium text-stone-700">{value}</p>
      <p className="text-xs text-stone-400">{label}</p>
    </div>
  );
}
