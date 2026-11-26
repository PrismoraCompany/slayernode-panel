/**
 * SlayerNode Real Per-Server Cron Schedule Runner
 * Supports standard 5-field cron (minute, hour, day-of-month, month, day-of-week).
 */

import crypto from 'crypto';
import { daemonRequest, getServerNode } from './daemonBridge.js';

function matchCronField(expr, value, min, max) {
  if (!expr || expr === '*') return true;
  const parts = String(expr).trim().split(',');
  for (const part of parts) {
    if (part === '*') return true;
    if (part.includes('/')) {
      const [base, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);
      if (!step || step <= 0) continue;
      if (base === '*') {
        if ((value - min) % step === 0) return true;
      } else if (base.includes('-')) {
        const [a, b] = base.split('-').map(Number);
        if (value >= a && value <= b && (value - a) % step === 0) return true;
      } else {
        const start = parseInt(base, 10);
        if (value >= start && (value - start) % step === 0) return true;
      }
      continue;
    }
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      if (value >= a && value <= b) return true;
      continue;
    }
    if (parseInt(part, 10) === value) return true;
  }
  return false;
}

export function matchesCron(cronObj, date = new Date()) {
  const m = date.getMinutes();
  const h = date.getHours();
  const dom = date.getDate();
  const mon = date.getMonth() + 1;
  const dow = date.getDay();

  return (
    matchCronField(cronObj.minute, m, 0, 59) &&
    matchCronField(cronObj.hour, h, 0, 23) &&
    matchCronField(cronObj.day_of_month, dom, 1, 31) &&
    matchCronField(cronObj.month || '*', mon, 1, 12) &&
    matchCronField(cronObj.day_of_week, dow, 0, 6)
  );
}

export async function executeScheduleTasks(db, saveState, schedule, recordActivity) {
  const srv = (db.servers || []).find(s => String(s.uuid) === String(schedule.server_uuid));
  if (!srv || srv.suspended) return { executed: 0, error: 'Server unavailable or suspended' };

  const node = getServerNode(db, srv);
  if (!node) return { executed: 0, error: 'Assigned node missing' };

  schedule.is_processing = true;
  saveState(db);

  let executed = 0;
  let lastError = null;

  try {
    const tasks = [...(schedule.tasks || [])].sort((a, b) => (a.sequence_id || 0) - (b.sequence_id || 0));
    for (const task of tasks) {
      if (task.time_offset && Number(task.time_offset) > 0) {
        await new Promise(r => setTimeout(r, Math.min(Number(task.time_offset) * 1000, 10000)));
      }
      if (task.action === 'command' && task.payload) {
        await daemonRequest(node, `/api/servers/${srv.uuid}/commands`, {
          method: 'POST',
          body: { commands: [String(task.payload)] },
        });
        executed++;
      } else if (task.action === 'power' && task.payload) {
        await daemonRequest(node, `/api/servers/${srv.uuid}/power`, {
          method: 'POST',
          body: { action: String(task.payload) },
        });
        executed++;
      } else if (task.action === 'backup') {
        const result = await daemonRequest(node, `/api/servers/${srv.uuid}/backups`, {
          method: 'POST',
          timeoutMs: 60000,
          body: { name: `Scheduled: ${schedule.name}` },
        });
        db.backups.unshift({
          uuid: result.uuid || crypto.randomUUID(),
          server_uuid: srv.uuid,
          name: `${schedule.name} (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`,
          ignored_files: '',
          sha256_hash: result.sha256_hash || '',
          bytes: result.bytes || 0,
          is_successful: true,
          is_locked: false,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
        executed++;
      }
    }
    schedule.last_run_at = new Date().toISOString();
    recordActivity?.(null, srv.uuid, 'server:schedule.execute', `Executed schedule "${schedule.name}" (${executed} task(s))`, '127.0.0.1');
  } catch (err) {
    lastError = err.message;
  } finally {
    schedule.is_processing = false;
    saveState(db);
  }

  return { executed, error: lastError };
}

export function startScheduleLoop(getDb, saveState, recordActivity) {
  let lastMinuteKey = '';
  const timer = setInterval(async () => {
    const now = new Date();
    const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    if (minuteKey === lastMinuteKey) return;
    lastMinuteKey = minuteKey;

    const db = getDb();
    const due = (db.schedules || []).filter(s => s.is_active && !s.is_processing && s.cron && matchesCron(s.cron, now));
    for (const sched of due) {
      executeScheduleTasks(db, saveState, sched, recordActivity).catch(() => {});
    }
  }, 15_000);
  if (timer.unref) timer.unref();
  return timer;
}
