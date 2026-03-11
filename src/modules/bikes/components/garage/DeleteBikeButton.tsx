'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/ui/components'
import { deleteBike, type DeleteBikeState } from '../../actions/deleteBike'

interface DeleteBikeButtonProps {
  bikeId: string
}

export function DeleteBikeButton({ bikeId }: DeleteBikeButtonProps) {
  const router = useRouter()

  function handleAction(
    prevState: DeleteBikeState,
    formData: FormData,
  ): Promise<DeleteBikeState> {
    if (!confirm('Are you sure you want to delete this bike? This will also delete all service history.')) {
      return Promise.resolve(prevState)
    }
    return deleteBike(prevState, formData)
  }

  const [state, action, isPending] = useActionState<DeleteBikeState, FormData>(
    handleAction,
    { errors: {} },
  )

  useEffect(() => {
    if (state.success) {
      router.push('/bikes/garage')
    }
  }, [state.success, router])

  return (
    <form action={action}>
      <input type="hidden" name="bikeId" value={bikeId} />
      {state.errors.general && (
        <p className="mb-2 text-xs text-red-500">{state.errors.general}</p>
      )}
      <Button type="submit" variant="danger" size="sm" loading={isPending}>
        Delete Bike
      </Button>
    </form>
  )
}
