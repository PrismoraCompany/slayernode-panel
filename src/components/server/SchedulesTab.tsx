import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Play, Trash2, CheckCircle2, PauseCircle } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiFetch, apiJson } from '../../lib/api';
import { Schedule } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';

export const SchedulesTab: React.FC = () => {
  const { activeServer } = useServers();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('');
  const [minute, setMinute] = useState('0');
  const [hour, setHour] = useState('4');
  const [dayOfMonth, setDayOfMonth] = useState('*');
  const [dayOfWeek, setDayOfWeek] = useState('*');
  const [taskAction, setTaskAction] = useState<'command' | 'power' | 'backup'>('command');
  const [taskPayload, setTaskPayload] = useState('say Automated maintenance notice');
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);

  const loadSchedules = useCallback(async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const res = await apiJson<{ data: Schedule[] }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/schedules`
      );
      setSchedules(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  if (!activeServer) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiJson<Schedule>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/schedules`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            minute: minute.trim() || '*',
            hour: hour.trim() || '*',
            day_of_month: dayOfMonth.trim() || '*',
            day_of_week: dayOfWeek.trim() || '*',
            is_active: true,
            tasks: [{ action: taskAction, payload: taskAction === 'backup' ? '' : taskPayload.trim(), time_offset: 0 }],
          }),
        }
      );
      setSchedules(prev => [...prev, created]);
      setShowCreate(false);
      setName('');
    } catch (err: any) {
      setError(err?.message || 'Failed creating schedule.');
    }
  };

  const handleToggleActive = async (sched: Schedule) => {
    try {
      const updated = await apiJson<Schedule>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/schedules/${sched.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ is_active: !sched.is_active }),
        }
      );
      setSchedules(prev => prev.map(s => (s.id === sched.id ? updated : s)));
    } catch {}
  };

  const handleRunNow = async (sched: Schedule) => {
    setRunningId(sched.id);
    setError(null);
    try {
      const res = await apiJson<{ schedule: Schedule }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/schedules/${sched.id}/execute`,
        { method: 'POST' }
      );
      if (res?.schedule) {
        setSchedules(prev => prev.map(s => (s.id === sched.id ? res.schedule : s)));
      }
    } catch (err: any) {
      setError(err?.message || 'Schedule execution failed.');
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this automated cron schedule?')) return;
    try {
      await apiFetch(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/schedules/${id}`, {
        method: 'DELETE',
      });
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch {}
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Cron Task Schedules</h3>
            <p className="text-xs text-slate-400">Automated per-server commands, restarts, and backups executed on schedule.</p>
          </div>
        </div>
        <GlassButton variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Schedule
        </GlassButton>
      </GlassCard>

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {schedules.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-slate-400">
          {loading ? 'Loading schedules...' : 'No cron schedules configured for this server yet.'}
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map(sched => (
            <GlassCard key={sched.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-sm font-bold text-white">{sched.name}</h4>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(sched)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer flex items-center gap-1 ${
                      sched.is_active
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-white/10'
                    }`}
                  >
                    {sched.is_active ? <CheckCircle2 className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
                    {sched.is_active ? 'Active' : 'Paused'}
                  </button>
                  <code className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 text-amber-300">
                    {sched.cron.minute} {sched.cron.hour} {sched.cron.day_of_month} {sched.cron.month || '*'} {sched.cron.day_of_week}
                  </code>
                </div>
                <div className="text-xs text-slate-400 font-mono flex items-center gap-3 flex-wrap">
                  <span>
                    Task:{' '}
                    <strong className="text-slate-200">
                      {sched.tasks?.[0] ? `${sched.tasks[0].action}: ${sched.tasks[0].payload || 'archive volume'}` : 'None'}
                    </strong>
                  </span>
                  <span>
                    Last Run: {sched.last_run_at ? new Date(sched.last_run_at).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  disabled={runningId === sched.id}
                  onClick={() => handleRunNow(sched)}
                >
                  <Play className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  {runningId === sched.id ? 'Running...' : 'Run Now'}
                </GlassButton>
                <GlassButton variant="danger" size="sm" onClick={() => handleDelete(sched.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </GlassButton>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Cron Schedule" maxWidth="md">
        <form onSubmit={handleCreate} className="flex flex-col gap-4 py-2">
          <GlassInput label="Schedule Name" placeholder="e.g. Nightly Backup" value={name} onChange={e => setName(e.target.value)} required />
          <div className="grid grid-cols-4 gap-2">
            <GlassInput label="Minute" value={minute} onChange={e => setMinute(e.target.value)} />
            <GlassInput label="Hour" value={hour} onChange={e => setHour(e.target.value)} />
            <GlassInput label="Day (Month)" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} />
            <GlassInput label="Day (Week)" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Task Action</label>
            <select
              value={taskAction}
              onChange={e => setTaskAction(e.target.value as any)}
              className="w-full glass-input px-3 py-2 text-xs text-white"
            >
              <option value="command">Send Console Command</option>
              <option value="power">Send Power Action (start/stop/restart)</option>
              <option value="backup">Create Server Backup</option>
            </select>
          </div>
          {taskAction !== 'backup' && (
            <GlassInput
              label={taskAction === 'power' ? 'Power Action' : 'Console Command'}
              value={taskPayload}
              onChange={e => setTaskPayload(e.target.value)}
              placeholder={taskAction === 'power' ? 'restart' : 'save-all'}
            />
          )}
          <div className="flex justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary">Save Schedule</GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
