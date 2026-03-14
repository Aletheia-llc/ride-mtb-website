'use client'
import { useTransition } from 'react'
import { completeMaintenanceTask } from '../actions/manageMaintenance'

type Task = { id: string; name: string; description: string | null; intervalType: string; intervalValue: number; lastCompletedAt: Date | null; isDue: boolean }

export function MaintenanceList({ tasks }: { tasks: Task[] }) {
  const [isPending, startTransition] = useTransition()

  const handleComplete = (taskId: string) => {
    startTransition(async () => { await completeMaintenanceTask(taskId) })
  }

  return (
    <div className="space-y-2">
      {tasks.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No maintenance tasks. Add tasks to track service intervals.</p>}
      {tasks.map(task => (
        <div key={task.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${task.isDue ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">{task.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Every {task.intervalValue} {task.intervalType.toLowerCase()}
              {task.lastCompletedAt && ` · Last done ${new Date(task.lastCompletedAt).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {task.isDue && <span className="text-xs font-medium text-yellow-600 bg-yellow-500/10 rounded-full px-2 py-0.5">Due</span>}
            <button onClick={() => handleComplete(task.id)} disabled={isPending}
              className="text-xs rounded bg-[var(--color-primary)]/10 px-3 py-1.5 font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 disabled:opacity-50">
              Mark Done
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
