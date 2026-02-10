'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Send, Bell, Mail, MessageSquare, Check, X } from 'lucide-react';

interface NotificationSetting {
  id: number;
  name: string;
  type: 'wechat_work' | 'feishu' | 'email';
  enabled: number;
  alert_low_percent: number;
  alert_empty: number;
  alert_replacement: number;
  report_enabled: number;
  report_cron: string;
  created_at: string;
}

interface NotificationHistory {
  id: number;
  type: string;
  title: string;
  content: string;
  sent_at: string;
  status: string;
  setting_name: string;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<NotificationSetting>>({});
  const [sendingReport, setSendingReport] = useState(false);

  const fetchData = async () => {
    try {
      const [settingsRes, historyRes] = await Promise.all([
        fetch('/api/admin/notifications'),
        fetch('/api/admin/notifications?type=history'),
      ]);
      const settingsData = await settingsRes.json();
      const historyData = await historyRes.json();
      setSettings(settingsData.data || []);
      setHistory(historyData.data || []);
    } catch (e) {
      console.error('加载设置失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (setting?: NotificationSetting) => {
    if (setting) {
      setEditingId(setting.id);
      setFormData(setting);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        type: 'wechat_work',
        enabled: 0,
        alert_low_percent: 10,
        alert_empty: 1,
        alert_replacement: 1,
        report_enabled: 0,
        report_cron: '0 9 * * 1',
      });
    }
    setShowModal(true);
  };

  const saveSetting = async () => {
    if (!formData.name || !formData.type) {
      alert('请填写名称和类型');
      return;
    }

    const payload = {
      name: formData.name,
      type: formData.type,
      config: getConfigForType(formData.type!),
      enabled: formData.enabled ? 1 : 0,
      alert_low_percent: formData.alert_low_percent || 10,
      alert_empty: formData.alert_empty ? 1 : 0,
      alert_replacement: formData.alert_replacement ? 1 : 0,
      report_enabled: formData.report_enabled ? 1 : 0,
      report_cron: formData.report_cron || '0 9 * * 1',
    };

    try {
      const res = await fetch('/api/admin/notifications', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        alert('保存失败');
      }
    } catch (e) {
      alert('保存失败: ' + (e as Error).message);
    }
  };

  const deleteSetting = async (id: number) => {
    if (!confirm('确认删除该通知设置？')) return;
    await fetch(`/api/admin/notifications?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const sendReport = async () => {
    setSendingReport(true);
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_report' }),
    });
    const data = await res.json();
    alert(data.success ? '报表已发送' : '发送失败: ' + data.message);
    setSendingReport(false);
  };

  const getConfigForType = (type: string) => {
    if (type === 'wechat_work' || type === 'feishu') {
      return { webhook_url: '' };
    }
    return {
      smtp_host: '',
      smtp_port: 465,
      smtp_user: '',
      smtp_password: '',
      from_email: '',
      to_emails: '',
    };
  };

  const getTypeIcon = (type: string) => {
    if (type === 'wechat_work') return <MessageSquare size={16} className="text-green-600" />;
    if (type === 'feishu') return <MessageSquare size={16} className="text-blue-600" />;
    return <Mail size={16} className="text-orange-600" />;
  };

  const getTypeName = (type: string) => {
    if (type === 'wechat_work') return '企业微信';
    if (type === 'feishu') return '飞书';
    return '邮件';
  };

  return (
    <div className="mt-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">消息通知设置</h2>
        <div className="flex gap-2">
          <button
            onClick={sendReport}
            disabled={sendingReport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Send size={16} /> {sendingReport ? '发送中...' : '立即发送报表'}
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={16} /> 添加通知
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-xs">
            <tr>
              <th className="px-6 py-4">名称</th>
              <th className="px-6 py-4">类型</th>
              <th className="px-6 py-4">提醒耗材</th>
              <th className="px-6 py-4">报表</th>
              <th className="px-6 py-4 w-20">状态</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">正在加载...</td></tr>
            ) : settings.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-slate-500 italic">暂无通知设置</td></tr>
            ) : (
              settings.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    {getTypeIcon(s.type)}
                    <span>{getTypeName(s.type)}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {s.alert_empty === 1 && <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded mr-1">耗尽</span>}
                    {s.alert_replacement === 1 && <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded mr-1">更换</span>}
                    {s.alert_low_percent > 0 && <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">低{s.alert_low_percent}%</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {s.report_enabled === 1 ? (
                      <span className="text-green-600">✓ {s.report_cron}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${s.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button onClick={() => openModal(s)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => deleteSetting(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">发送历史</h3>
        </div>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 sticky top-0">
              <tr>
                <th className="px-6 py-2">时间</th>
                <th className="px-6 py-2">类型</th>
                <th className="px-6 py-2">标题</th>
                <th className="px-6 py-2">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="px-6 py-2 text-slate-500">{h.sent_at}</td>
                  <td className="px-6 py-2">{getTypeIcon(h.type)}</td>
                  <td className="px-6 py-2">{h.title}</td>
                  <td className="px-6 py-2">
                    {h.status === 'sent' ? (
                      <span className="text-green-600 flex items-center gap-1"><Check size={14} /> 成功</span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1"><X size={14} /> 失败</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? '编辑通知设置' : '添加通知设置'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">名称</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如: 运维群通知"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">类型</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={formData.type || 'wechat_work'}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="wechat_work">企业微信</option>
                  <option value="feishu">飞书</option>
                  <option value="email">邮件</option>
                </select>
              </div>

              {(formData.type === 'wechat_work' || formData.type === 'feishu') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-xs"
                    placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/..."
                    onChange={e => {
                      const config = getConfigForType(formData.type!);
                      config.webhook_url = e.target.value;
                      setFormData({ ...formData, config });
                    }}
                  />
                </div>
              )}

              {formData.type === 'email' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">SMTP 主机</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                        placeholder="smtp.example.com"
                        onChange={e => {
                          const config = getConfigForType('email');
                          config.smtp_host = e.target.value;
                          setFormData({ ...formData, config });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">端口</label>
                      <input
                        type="number"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                        placeholder="465"
                        defaultValue={465}
                        onChange={e => {
                          const config = getConfigForType('email');
                          config.smtp_port = parseInt(e.target.value);
                          setFormData({ ...formData, config });
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                        placeholder="your@email.com"
                        onChange={e => {
                          const config = getConfigForType('email');
                          config.smtp_user = e.target.value;
                          setFormData({ ...formData, config });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">密码/授权码</label>
                      <input
                        type="password"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                        placeholder="••••••••"
                        onChange={e => {
                          const config = getConfigForType('email');
                          config.smtp_password = e.target.value;
                          setFormData({ ...formData, config });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">收件人（多个用逗号分隔）</label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      placeholder="a@example.com, b@example.com"
                      onChange={e => {
                        const config = getConfigForType('email');
                        config.to_emails = e.target.value;
                        setFormData({ ...formData, config });
                      }}
                    />
                  </div>
                </>
              )}

              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-medium text-slate-800 mb-3">提醒设置</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.alert_empty === 1}
                      onChange={e => setFormData({ ...formData, alert_empty: e.target.checked ? 1 : 0 })}
                    />
                    <span className="text-sm">耗材耗尽时提醒</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.alert_replacement === 1}
                      onChange={e => setFormData({ ...formData, alert_replacement: e.target.checked ? 1 : 0 })}
                    />
                    <span className="text-sm">耗材更换时提醒</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.alert_low_percent! > 0}
                      onChange={e => setFormData({ ...formData, alert_low_percent: e.target.checked ? 10 : 0 })}
                    />
                    <span className="text-sm">耗材低于</span>
                    <input
                      type="number"
                      className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                      value={formData.alert_low_percent || 10}
                      onChange={e => setFormData({ ...formData, alert_low_percent: parseInt(e.target.value) })}
                      disabled={formData.alert_low_percent === 0}
                    />
                    <span className="text-sm">% 时提醒</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-medium text-slate-800 mb-3">定期报表</h4>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={formData.report_enabled === 1}
                    onChange={e => setFormData({ ...formData, report_enabled: e.target.checked ? 1 : 0 })}
                  />
                  <span className="text-sm">启用定期报表</span>
                </label>
                {formData.report_enabled === 1 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cron 表达式</label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm"
                      value={formData.report_cron || '0 9 * * 1'}
                      onChange={e => setFormData({ ...formData, report_cron: e.target.value })}
                    />
                    <p className="text-xs text-slate-500 mt-1">格式: 分 时 日 月 周 (默认: 0 9 * * 1 = 每周一 9:00)</p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled === 1}
                    onChange={e => setFormData({ ...formData, enabled: e.target.checked ? 1 : 0 })}
                  />
                  <span className="font-medium">启用此通知</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                取消
              </button>
              <button onClick={saveSetting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
