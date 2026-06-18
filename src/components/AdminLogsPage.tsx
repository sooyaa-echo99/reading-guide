import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchOpLogs, fetchAllUsers, type OpLog } from '../services/api';

const ACTION_LABELS: Record<string, string> = {
  register: '注册',
  login: '登录',
  guide_generate: '生成指南',
  bookshelf_add: '加入书架',
  mark_read: '标记已读',
  delete: '删除书籍',
  answer_submit: '提交回答',
};

const ACTION_COLORS: Record<string, string> = {
  register: 'bg-blue-50 text-blue-600',
  login: 'bg-slate-50 text-slate-500',
  guide_generate: 'bg-amber-50 text-amber-600',
  bookshelf_add: 'bg-green-50 text-green-600',
  mark_read: 'bg-emerald-50 text-emerald-600',
  delete: 'bg-red-50 text-red-500',
  answer_submit: 'bg-purple-50 text-purple-600',
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<OpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const location = useLocation();

  useEffect(() => {
    (async () => {
      const logData = await fetchOpLogs();
      setLogs(logData);
      setLoading(false);
    })();
  }, []);

  const [allUsers, setAllUsers] = useState<string[]>([]);
  useEffect(() => {
    fetchAllUsers().then(data => setAllUsers(data.map(u => u.username)));
  }, []);

  const filtered = useMemo(() => {
    let result = logs;
    if (filterUser) result = result.filter(l => l.username === filterUser);
    if (filterAction) result = result.filter(l => l.action === filterAction);
    return result;
  }, [logs, filterUser, filterAction]);

  const actions = useMemo(() => {
    const set = new Set(logs.map(l => l.action));
    return Array.from(set);
  }, [logs]);

  if (loading) return <div className="text-center text-stone-400 py-12">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Admin sub nav */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1">
        <Link
          to="/admin/users"
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all text-center no-underline ${
            location.pathname === '/admin/users' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          用户管理
        </Link>
        <Link
          to="/admin/logs"
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all text-center no-underline ${
            location.pathname === '/admin/logs' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          操作日志
        </Link>
      </div>

      <h1 className="text-xl font-bold text-stone-800 mb-2">操作日志</h1>
      <p className="text-sm text-stone-400 mb-6">
        共 {logs.length} 条操作记录（仅管理员 visible，最多保留 500 条）
      </p>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filterUser}
          onChange={e => { setFilterUser(e.target.value); setFilterAction(''); }}
          className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-600 bg-white cursor-pointer focus:outline-none focus:border-amber-400"
        >
          <option value="">全部用户</option>
          {allUsers.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-600 bg-white cursor-pointer focus:outline-none focus:border-amber-400"
        >
          <option value="">全部操作</option>
          {actions.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
          ))}
        </select>
        {(filterUser || filterAction) && (
          <button
            onClick={() => { setFilterUser(''); setFilterAction(''); }}
            className="px-3 py-2 text-xs text-stone-400 hover:text-stone-600 cursor-pointer bg-transparent border-none"
          >
            清除筛选
          </button>
        )}
        <span className="text-xs text-stone-400 self-center ml-auto">
          显示 {filtered.length} / {logs.length} 条
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-stone-400 py-12">
          {logs.length === 0 ? '暂无操作日志' : '没有匹配的记录'}
        </div>
      ) : (
        <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase w-28">时间</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase w-24">用户</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase w-20">操作</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase">目标</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase">详情</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-2.5 text-stone-400 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-medium text-xs ${log.username === 'echo' ? 'text-amber-600' : 'text-stone-600'}`}>
                      {log.username}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-stone-50 text-stone-500'}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-stone-700 text-xs font-medium max-w-40 truncate">
                    {log.target}
                  </td>
                  <td className="px-4 py-2.5 text-stone-400 text-xs max-w-60 truncate">
                    {log.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white border border-stone-100 rounded-xl px-5 py-4 text-center">
            <p className="text-2xl font-bold text-stone-700">{logs.filter(l => l.action === 'guide_generate').length}</p>
            <p className="text-xs text-stone-400 mt-1">生成指南</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-xl px-5 py-4 text-center">
            <p className="text-2xl font-bold text-stone-700">{logs.filter(l => l.action === 'answer_submit').length}</p>
            <p className="text-xs text-stone-400 mt-1">提交回答</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-xl px-5 py-4 text-center">
            <p className="text-2xl font-bold text-stone-700">{logs.filter(l => ['bookshelf_add', 'mark_read', 'delete'].includes(l.action)).length}</p>
            <p className="text-xs text-stone-400 mt-1">书架操作</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-xl px-5 py-4 text-center">
            <p className="text-2xl font-bold text-stone-700">{logs.filter(l => ['register', 'login'].includes(l.action)).length}</p>
            <p className="text-xs text-stone-400 mt-1">注册登录</p>
          </div>
        </div>
      )}
    </div>
  );
}
