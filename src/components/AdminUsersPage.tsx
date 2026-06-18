import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchAllUsers, type StoredUser } from '../services/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      const data = await fetchAllUsers();
      setUsers(data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center text-stone-400 py-12">加载中...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
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

      <h1 className="text-xl font-bold text-stone-800 mb-2">用户管理</h1>
      <p className="text-sm text-stone-400 mb-6">
        共 {users.length} 位注册用户（仅管理员 visible）
      </p>

      {users.length === 0 ? (
        <div className="text-center text-stone-400 py-12">暂无注册用户</div>
      ) : (
        <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase">用户名</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase">注册时间</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase">状态</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-stone-700">{u.username}</span>
                    {u.username === 'echo' && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">管理员</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-400">
                    {new Date(u.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">正常</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      {users.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white border border-stone-100 rounded-xl px-5 py-4 text-center">
            <p className="text-2xl font-bold text-stone-700">{users.length}</p>
            <p className="text-xs text-stone-400 mt-1">总用户数</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-xl px-5 py-4 text-center">
            <p className="text-2xl font-bold text-stone-700">
              {users.filter(u => {
                const d = new Date(u.createdAt);
                const now = new Date();
                return d.toDateString() === now.toDateString();
              }).length}
            </p>
            <p className="text-xs text-stone-400 mt-1">今日新增</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-xl px-5 py-4 text-center">
            <p className="text-2xl font-bold text-stone-700">
              {users.filter(u => u.username !== 'echo').length}
            </p>
            <p className="text-xs text-stone-400 mt-1">普通用户</p>
          </div>
        </div>
      )}
    </div>
  );
}
