'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, CheckCircle, XCircle } from 'lucide-react'
import type { DragDropConfig } from '@/modules/learn/types'

interface DragDropProps {
  prompt: string
  config: DragDropConfig
  feedback: { correct: boolean } | null
  onAnswer: (orderedIds: string[]) => void
  disabled?: boolean
}

function SortableItem({
  id,
  text,
  isCorrectPosition,
  showResult,
}: {
  id: string
  text: string
  isCorrectPosition?: boolean
  showResult: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  let borderClass = 'border-[var(--color-border)]'
  if (showResult) {
    borderClass = isCorrectPosition ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border-2 bg-[var(--color-bg)] p-4 ${borderClass} ${
        isDragging ? 'z-10 shadow-lg' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-[var(--color-text-muted)] hover:text-[var(--color-text)] active:cursor-grabbing"
        aria-label={`Reorder ${text}`}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex-1 text-sm text-[var(--color-text)]">{text}</span>
      {showResult && isCorrectPosition && <CheckCircle className="h-5 w-5 text-green-400" />}
      {showResult && !isCorrectPosition && <XCircle className="h-5 w-5 text-red-400" />}
    </div>
  )
}

export function DragDrop({ prompt, config, feedback, onAnswer, disabled }: DragDropProps) {
  const [items, setItems] = useState(config.items)
  const showResult = feedback !== null

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (disabled || showResult) return
      const { active, over } = event
      if (!over || active.id === over.id) return

      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id)
        const newIndex = prev.findIndex((i) => i.id === over.id)
        const newItems = arrayMove(prev, oldIndex, newIndex)
        onAnswer(newItems.map((i) => i.id))
        return newItems
      })
    },
    [disabled, showResult, onAnswer]
  )

  return (
    <div>
      <p className="mb-2 text-lg font-medium text-[var(--color-text)]">{prompt}</p>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">Drag items into the correct order.</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <SortableItem
                key={item.id}
                id={item.id}
                text={item.text}
                showResult={showResult}
                isCorrectPosition={showResult ? config.correctOrder[index] === item.id : undefined}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
