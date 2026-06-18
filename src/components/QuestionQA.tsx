import { useState, useEffect, useCallback } from 'react';
import { fetchAnswers, submitAnswer } from '../services/api';
import type { Answer } from '../services/api';

interface QuestionQAProps {
  question: string;
  index: number;
  bookName: string;
  author?: string;
  defaultExpanded?: boolean;
  readOnly?: boolean;
  onAnswerChange?: () => void;
}

export default function QuestionQA({
  question,
  index,
  bookName,
  author,
  defaultExpanded = false,
  readOnly = false,
  onAnswerChange,
}: QuestionQAProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAnswers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAnswers(bookName, author);
      setAnswers(data.filter(a => a.questionIndex === index));
    } catch {}
    setLoading(false);
  }, [bookName, author, index]);

  useEffect(() => {
    if (expanded) loadAnswers();
  }, [expanded, loadAnswers]);

  const handleSubmit = async () => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    try {
      await submitAnswer({ bookName, author, questionIndex: index, questionText: question, answerText: answerText.trim() });
      setAnswerText('');
      loadAnswers();
      onAnswerChange?.();
    } catch {}
    setSubmitting(false);
  };

  return (
    <div className="border border-stone-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-stone-50 transition-colors cursor-pointer bg-transparent border-none"
      >
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          expanded ? 'bg-amber-200 text-amber-800' : 'bg-amber-100 text-amber-700'
        }`}>
          {index + 1}
        </span>
        <p className="text-stone-700 flex-1 leading-relaxed text-sm">{question}</p>
        <svg className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-stone-100">
          {/* Answer input */}
          {!readOnly && (
            <div className="mt-3 mb-3">
              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                placeholder="写下你对这个问题的思考或答案..."
                className="w-full h-20 px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 resize-none focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
              <button
                onClick={handleSubmit}
                disabled={!answerText.trim() || submitting}
                className="mt-2 px-4 py-2 bg-stone-800 text-white text-xs rounded-lg hover:bg-stone-700 disabled:opacity-40 cursor-pointer transition-colors"
              >
                {submitting ? '提交中...' : '提交回答'}
              </button>
            </div>
          )}

          {/* Existing answers */}
          {loading ? (
            <div className="text-xs text-stone-400">加载中...</div>
          ) : answers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-stone-400 font-medium">{answers.length} 条回答</p>
              {answers.map(a => (
                <div key={a.id} className="bg-stone-50 rounded-lg px-3 py-2">
                  <p className="text-sm text-stone-700 leading-relaxed">{a.answerText}</p>
                  <p className="text-xs text-stone-400 mt-1">{new Date(a.createdAt).toLocaleDateString('zh-CN')}</p>
                </div>
              ))}
            </div>
          ) : readOnly ? (
            <p className="text-xs text-stone-400 mt-2">暂无回答</p>
          ) : (
            <p className="text-xs text-stone-400 mt-2">暂无回答，来写下你的思考吧</p>
          )}
        </div>
      )}
    </div>
  );
}
