'use client'

import { useActionState } from 'react'
import { subscribeToDrops, unsubscribeFromDrops } from '@/modules/merch/actions/drops'

interface DropSubscribeButtonProps {
  isSubscribed: boolean
}

export function DropSubscribeButton({ isSubscribed }: DropSubscribeButtonProps) {
  const action = isSubscribed ? unsubscribeFromDrops : subscribeToDrops

  const [_state, formAction, pending] = useActionState(
    async (_prev: null, _formData: FormData) => {
      await action()
      return null
    },
    null,
  )

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded font-medium text-sm disabled:opacity-50 transition-colors"
        style={
          isSubscribed
            ? {
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                background: 'var(--color-surface)',
              }
            : {
                background: 'var(--color-primary)',
                color: '#fff',
              }
        }
      >
        {pending ? '...' : isSubscribed ? 'Unsubscribe' : 'Notify Me'}
      </button>
    </form>
  )
}
