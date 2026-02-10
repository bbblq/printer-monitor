'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

export default function DebugSNMPPage() {
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawData, setRawData] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);

  const testPrinter = async () => {
    if (!ip) return;
    setLoading(true);
    setError('');
    setRawData(null);
    setRows([]);

    try {
      const res = await fetch(`/api/admin/debug-snmp/raw?ip=${ip}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setRawData(data.raw || {});
        setRows(data.rows || []);
      }
    } catch (e) {
      setError('请求失败: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">SNMP 调试工具</h1>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="输入打印机 IP 地址"
              className="flex-1 border border-slate-300 rounded-lg px-4 py-3 font-mono"
              value={ip}
              onChange={e => setIp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && testPrinter()}
            />
            <button
              onClick={testPrinter}
              disabled={loading || !ip}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
            >
              <Search size={18} />
              {loading ? '测试中...' : '获取数据'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {rawData && Object.keys(rawData).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">原始 SNMP 数据</h2>
            </div>
            <div className="p-6 pt-0 max-h-[70vh] overflow-auto">
              <pre className="bg-slate-900 text-green-400 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap break-all">
{JSON.stringify(rawData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">耗材数据汇总</h2>
            </div>
            <div className="p-6">
              <pre className="text-sm font-mono">
{JSON.stringify(rows, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
