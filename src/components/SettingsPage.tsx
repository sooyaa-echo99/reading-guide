import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportAllData, importAllData } from '../services/api';
import type { AppSnapshot } from '../services/api';

export default function SettingsPage() {
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleExport = () => {
    const snapshot = exportAllData();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().slice(0, 10);
    a.download = `阅读指南-数据备份-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('数据已导出');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleImport = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const snapshot: AppSnapshot = JSON.parse(reader.result as string);
        if (!snapshot.version || !snapshot.data) {
          setMsg('无效的数据文件');
          setTimeout(() => setMsg(''), 3000);
          return;
        }
        const result = importAllData(snapshot);
        setMsg(`导入完成：${result.imported} 项新增，${result.skipped} 项已存在`);
        setTimeout(() => setMsg(''), 4000);
      } catch {
        setMsg('文件格式错误，请选择导出的 JSON 文件');
        setTimeout(() => setMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-imported
    e.target.value = '';
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h2 className="text-xl font-bold text-stone-800 mb-1">设置</h2>
        <p className="text-stone-400 text-sm mb-6">数据管理</p>

        <div className="space-y-4">
          <div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="py-3 px-4 rounded-xl border border-stone-200 bg-white text-sm text-stone-600
                           hover:border-amber-300 hover:text-amber-700 cursor-pointer transition-colors"
              >
                导出数据
              </button>
              <button
                onClick={handleImport}
                className="py-3 px-4 rounded-xl border border-stone-200 bg-white text-sm text-stone-600
                           hover:border-amber-300 hover:text-amber-700 cursor-pointer transition-colors"
              >
                导入数据
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              导出历史记录、书架、回答为 JSON 文件。换浏览器或域名后，导入即可恢复。
            </p>
          </div>

          {/* Message */}
          {msg && (
            <div className="text-center py-2 px-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">{msg}</p>
            </div>
          )}

          <button
            onClick={() => navigate(-1)}
            className="w-full py-2.5 text-sm text-stone-400 hover:text-stone-600 cursor-pointer bg-transparent border-none transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
