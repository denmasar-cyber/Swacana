'use client';

import { db } from './db';

let notificationInterval: ReturnType<typeof setInterval> | null = null;
let lastNotified: Set<string> = new Set();

export function requestNotificationPermission() {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) {
    console.log('[notif] Browser does not support notifications.');
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function startNotificationMonitor(intervalMs = 60000) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (notificationInterval) return;

  notificationInterval = setInterval(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const allNodes = await db.nodes.toArray();

      const overdue = allNodes.filter(
        (n) =>
          n.nodeType === 'MITIGATION' &&
          n.status === 'PENDING' &&
          n.targetDate &&
          n.targetDate < today,
      );

      const dueToday = allNodes.filter(
        (n) =>
          n.nodeType === 'MITIGATION' &&
          n.status === 'PENDING' &&
          n.targetDate === today,
      );

      // Notify overdue
      for (const node of overdue) {
        if (!lastNotified.has(node.id)) {
          lastNotified.add(node.id);
          new Notification('⚠️ Overdue Mitigation Task', {
            body: `${node.label} — was due ${node.targetDate}`,
            icon: '/favicon.ico',
          });
        }
      }

      // Notify due today
      for (const node of dueToday) {
        if (!lastNotified.has(node.id)) {
          lastNotified.add(node.id);
          new Notification('📋 Due Today', {
            body: `${node.label} — due by today`,
            icon: '/favicon.ico',
          });
        }
      }

      // Clean up old entries from lastNotified (keep max 50)
      if (lastNotified.size > 50) {
        const arr = Array.from(lastNotified);
        lastNotified = new Set(arr.slice(arr.length - 25));
      }
    } catch (err) {
      console.error('[notif] Monitor error:', err);
    }
  }, intervalMs);
}

export function stopNotificationMonitor() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}
