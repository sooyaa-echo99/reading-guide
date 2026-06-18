import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    if (password !== password2) { setError('两次密码不一致'); return; }
    setError(''); setLoading(true);
    try {
      await register(username.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '注册失败');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h2 className="text-xl font-bold text-stone-800 mb-1">注册</h2>
        <p className="text-stone-400 text-sm mb-6">创建账号，拥有独立书架和历史记录</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">用户名</label>
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-sm text-stone-700 transition-all"
              placeholder="至少2个字符" autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">密码</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-sm text-stone-700 transition-all"
              placeholder="至少4位"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">确认密码</label>
            <input
              type="password" value={password2}
              onChange={e => setPassword2(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-sm text-stone-700 transition-all"
              placeholder="再次输入密码"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit" disabled={!username.trim() || !password || !password2 || loading}
            className="w-full py-3 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-xs text-stone-400 mt-4">
          已有账号？<Link to="/login" className="text-amber-600 hover:text-amber-700">登录</Link>
        </p>
      </div>
    </div>
  );
}
