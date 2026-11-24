import React, { useState } from 'react';
import { Calendar, Plus, Clock, Play, Trash2, ArrowRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { Schedule } from '../../types';

export const SchedulesTab: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: 1,
      name: 'Automated Daily Restart & Backup',
      cron: { minute: '0', hour: '4', day_of_month: '*', month: '*', day_of_week: '*' },
      is_active: true,
      is_processing: false,
      last_run_at: '2026-11-23 04:00:00',
      next_run_at: '2026-11-24 04:00:00',
      tasks: [
        { id: 1, sequence_id: 1, action: 'command', payload: 'say [Server] Restarting in 60 seconds for daily cleanup...', time_offset: 0, continue_on_failure: true },
        { id: 2, sequence_id: 2, action: 'backup', payload: 'Daily Automated Backup', time_offset: 60, continue_on_failure: true },
        { id: 3, sequence_id: 3, action: 'power', payload: 'restart', time_offset: 90, continue_on_failure: false },
      ],
    },
    {
      id: 2,
      name: 'World Autosave & Chunk Flush',
      cron: { minute: '*/30', hour: '*', day_of_month: '*', month: '*', day_of_week: '*' },
      is_active: true,
      is_processing: false,
      last_run_at: '2026-11-23 14:00:00',
      next_run_at: '2026-11-23 14:30:00',
      tasks: [
        { id: 4, sequence_id: 1, action: 'command', payload: 'save-all', time_offset: 0, continue_on_failure: true },
      ],
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [cronMinute, setCronMinute] = useState('0');
  const [cronHour, setCronHour] = useState('*/6');

  const handleCreateSchedule = () => {
    if (!newScheduleName.trim()) return;
    const sched: Schedule = {
      id: Date.now(),
      name: newScheduleName.trim(),
      cron: { minute: cronMinute, hour: cronHour, day_of_month: '*', month: '*', day_of_week: '*' },
      is_active: true,
      is_processing: false,
      last_run_at: null,
      next_run_at: 'Pending',
      tasks: [
        { id: 10, sequence_id: 1, action: 'command', payload: 'broadcast System check OK', time_offset: 0, continue_on_failure: true },
      ],
    };
    setSchedules(prev => [...prev, sched]);
    setNewScheduleName('');
    setShowCreateModal(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" /> Server Schedules & Crons
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automate routine maintenance, recurring broadcasts, world saves, and backups.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Schedule
        </GlassButton>
      </div>

      <div className="flex flex-col gap-4">
        {schedules.map(sched => (
          <GlassCard key={sched.id} className="p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-400/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{sched.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Cron: {sched.cron.minute} {sched.cron.hour} {sched.cron.day_of_month} {sched.cron.month} {sched.cron.day_of_week}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <GlassBadge status={sched.is_active ? 'running' : 'offline'}>
                  {sched.is_active ? 'ENABLED' : 'DISABLED'}
                </GlassBadge>
                <GlassButton size="sm" variant="glass" leftIcon={<Play className="w-3 h-3 fill-current" />}>
                  Run Now
                </GlassButton>
              </div>
            </div>

            {/* Chained Tasks Pipeline */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Chained Task Execution Steps ({sched.tasks.length})
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {sched.tasks.map((task, idx) => (
                  <React.Fragment key={task.id}>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs">
                      <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px] text-sky-400">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200 capitalize">
                        {task.action}:
                      </span>
                      <span className="font-mono text-slate-300 max-w-xs truncate">
                        "{task.payload}"
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">
                        (+{task.time_offset}s)
                      </span>
                    </div>
                    {idx < sched.tasks.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Schedule"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 py-2">
          <GlassInput
            label="Schedule Name"
            placeholder="e.g. 6-Hour World Backup"
            value={newScheduleName}
            onChange={e => setNewScheduleName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="Minute"
              value={cronMinute}
              onChange={e => setCronMinute(e.target.value)}
              placeholder="0"
            />
            <GlassInput
              label="Hour"
              value={cronHour}
              onChange={e => setCronHour(e.target.value)}
              placeholder="*/6"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" onClick={handleCreateSchedule}>
              Create Schedule
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
