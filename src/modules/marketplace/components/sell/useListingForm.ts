'use client'

import { useReducer, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { PhotoItem } from './ListingPhotoUploader'
import { createListing, updateListing } from '@/modules/marketplace/actions/listing-mutations'
import { uploadListingPhoto } from '@/modules/marketplace/actions/photos'
import type { CreateListingInput } from '@/modules/marketplace/types'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type ListingFormState = {
  title: string
  description: string
  category: string
  condition: string
  brand: string
  modelName: string
  year: string
  tags: string[]
  tagInput: string
  price: string
  acceptsOffers: boolean
  acceptsTrades: boolean
  minOfferPercent: string
  fulfillment: string
  shippingCost: string
  estimatedWeight: string
  packageLength: string
  packageWidth: string
  packageHeight: string
  city: string
  state: string
  zipCode: string
  frameSize: string
  wheelSize: string
  forkTravel: string
  rearTravel: string
  frameMaterial: string
  sellerType: string
  photos: PhotoItem[]
  isSubmitting: boolean
  error: string | null
}

type Action =
  | { type: 'SET'; field: string; value: string | boolean }
  | { type: 'ADD_TAG'; tag: string }
  | { type: 'REMOVE_TAG'; tag: string }
  | { type: 'POP_TAG' }
  | { type: 'SET_PHOTOS'; photos: PhotoItem[] }
  | { type: 'SET_ERROR'; message: string | null }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END' }

function reducer(state: ListingFormState, action: Action): ListingFormState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value }
    case 'ADD_TAG': {
      const tag = action.tag.trim().toLowerCase()
      if (!tag || state.tags.includes(tag) || state.tags.length >= 10) return state
      return { ...state, tags: [...state.tags, tag] }
    }
    case 'REMOVE_TAG':
      return { ...state, tags: state.tags.filter((t) => t !== action.tag) }
    case 'POP_TAG':
      return { ...state, tags: state.tags.slice(0, -1) }
    case 'SET_PHOTOS':
      return { ...state, photos: action.photos }
    case 'SET_ERROR':
      return { ...state, error: action.message, isSubmitting: false }
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, error: null }
    case 'SUBMIT_END':
      return { ...state, isSubmitting: false }
  }
}

// ---------------------------------------------------------------------------
// Initial state builder
// ---------------------------------------------------------------------------

type InitialData = Partial<CreateListingInput> & { id?: string; photos?: PhotoItem[] }

function buildInitialState(initialData?: InitialData): ListingFormState {
  return {
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    category: initialData?.category ?? '',
    condition: initialData?.condition ?? '',
    brand: initialData?.brand ?? '',
    modelName: initialData?.modelName ?? '',
    year: initialData?.year?.toString() ?? '',
    tags: initialData?.tags ?? [],
    tagInput: '',
    price: initialData?.price !== undefined ? initialData.price.toString() : '',
    acceptsOffers: initialData?.acceptsOffers ?? true,
    acceptsTrades: initialData?.acceptsTrades ?? false,
    minOfferPercent:
      initialData?.minOfferPercent !== undefined ? initialData.minOfferPercent.toString() : '',
    fulfillment: initialData?.fulfillment ?? 'local_or_ship',
    shippingCost:
      initialData?.shippingCost !== undefined ? initialData.shippingCost.toString() : '',
    estimatedWeight:
      initialData?.estimatedWeight !== undefined ? initialData.estimatedWeight.toString() : '',
    packageLength:
      initialData?.packageLength !== undefined ? initialData.packageLength.toString() : '',
    packageWidth:
      initialData?.packageWidth !== undefined ? initialData.packageWidth.toString() : '',
    packageHeight:
      initialData?.packageHeight !== undefined ? initialData.packageHeight.toString() : '',
    city: initialData?.city ?? '',
    state: initialData?.state ?? '',
    zipCode: initialData?.zipCode ?? '',
    frameSize: initialData?.frameSize ?? '',
    wheelSize: initialData?.wheelSize ?? '',
    forkTravel:
      initialData?.forkTravel !== undefined ? initialData.forkTravel.toString() : '',
    rearTravel:
      initialData?.rearTravel !== undefined ? initialData.rearTravel.toString() : '',
    frameMaterial: initialData?.frameMaterial ?? '',
    sellerType: initialData?.sellerType ?? 'individual',
    photos: initialData?.photos ?? [],
    isSubmitting: false,
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useListingForm(initialData?: InitialData) {
  const router = useRouter()
  const isEditMode = Boolean(initialData?.id)
  const fromGarageBikeId = initialData?.fromGarageBikeId
  const pendingFilesRef = useRef<Map<string, File>>(new Map())

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => buildInitialState(initialData),
  )

  const set = useCallback((field: string, value: string | boolean) => {
    dispatch({ type: 'SET', field, value })
  }, [])

  const addTag = useCallback((raw: string) => {
    dispatch({ type: 'ADD_TAG', tag: raw })
  }, [])

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addTag(state.tagInput)
        dispatch({ type: 'SET', field: 'tagInput', value: '' })
      }
      if (e.key === 'Backspace' && state.tagInput === '' && state.tags.length > 0) {
        dispatch({ type: 'POP_TAG' })
      }
    },
    [addTag, state.tagInput, state.tags.length],
  )

  const handleTagInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (val.includes(',')) {
        val.split(',').forEach((part) => { if (part.trim()) addTag(part) })
        dispatch({ type: 'SET', field: 'tagInput', value: '' })
      } else {
        dispatch({ type: 'SET', field: 'tagInput', value: val })
      }
    },
    [addTag],
  )

  const handlePhotosChange = useCallback(
    (newPhotos: PhotoItem[], newFiles?: Map<string, File>) => {
      dispatch({ type: 'SET_PHOTOS', photos: newPhotos })
      if (newFiles) {
        for (const [id, file] of newFiles) pendingFilesRef.current.set(id, file)
        const photoIds = new Set(newPhotos.map((p) => p.id))
        for (const id of pendingFilesRef.current.keys()) {
          if (!photoIds.has(id)) pendingFilesRef.current.delete(id)
        }
      }
    },
    [],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      dispatch({ type: 'SUBMIT_START' })

      try {
        const data: CreateListingInput = {
          title: state.title.trim(),
          description: state.description.trim(),
          category: state.category as CreateListingInput['category'],
          condition: state.condition as CreateListingInput['condition'],
          brand: state.brand.trim() || undefined,
          modelName: state.modelName.trim() || undefined,
          year: state.year ? parseInt(state.year, 10) : undefined,
          tags: state.tags.length > 0 ? state.tags : undefined,
          price: parseFloat(state.price),
          acceptsOffers: state.acceptsOffers,
          acceptsTrades: state.acceptsTrades,
          minOfferPercent: state.minOfferPercent
            ? parseInt(state.minOfferPercent, 10)
            : undefined,
          fulfillment: state.fulfillment as CreateListingInput['fulfillment'],
          shippingCost: state.shippingCost ? parseFloat(state.shippingCost) : undefined,
          estimatedWeight: state.estimatedWeight ? parseFloat(state.estimatedWeight) : undefined,
          packageLength: state.packageLength ? parseInt(state.packageLength, 10) : undefined,
          packageWidth: state.packageWidth ? parseInt(state.packageWidth, 10) : undefined,
          packageHeight: state.packageHeight ? parseInt(state.packageHeight, 10) : undefined,
          city: state.city.trim() || undefined,
          state: state.state.trim() || undefined,
          zipCode: state.zipCode.trim() || undefined,
          fromGarageBikeId: fromGarageBikeId || undefined,
          frameSize: state.frameSize || undefined,
          wheelSize: state.wheelSize || undefined,
          forkTravel: state.forkTravel ? parseInt(state.forkTravel, 10) : undefined,
          rearTravel: state.rearTravel ? parseInt(state.rearTravel, 10) : undefined,
          frameMaterial: state.frameMaterial || undefined,
          sellerType: (state.sellerType || 'individual') as CreateListingInput['sellerType'],
        }

        if (isEditMode && initialData?.id) {
          const updated = await updateListing(initialData.id, data)
          router.push(`/buy-sell/${updated.slug}`)
        } else {
          const listing = await createListing(data)
          for (const photo of state.photos) {
            const file = pendingFilesRef.current.get(photo.id)
            if (file) await uploadListingPhoto(listing.id, file)
          }
          router.push(`/buy-sell/${listing.slug}`)
        }
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, isEditMode, fromGarageBikeId, router],
  )

  // Memoized so sub-components using React.memo don't re-render on unrelated state changes.
  // `set` and `dispatch` are both stable references (useCallback/useReducer).
  const handlers = useMemo(
    () => ({
      setTitle: (v: string) => set('title', v),
      setDescription: (v: string) => set('description', v),
      setCategory: (v: string) => set('category', v),
      setCondition: (v: string) => set('condition', v),
      setBrand: (v: string) => set('brand', v),
      setModelName: (v: string) => set('modelName', v),
      setYear: (v: string) => set('year', v),
      removeTag: (tag: string) => dispatch({ type: 'REMOVE_TAG', tag }),
      setPrice: (v: string) => set('price', v),
      setAcceptsOffers: (v: boolean) => set('acceptsOffers', v),
      setAcceptsTrades: (v: boolean) => set('acceptsTrades', v),
      setMinOfferPercent: (v: string) => set('minOfferPercent', v),
      setFulfillment: (v: string) => set('fulfillment', v),
      setShippingCost: (v: string) => set('shippingCost', v),
      setEstimatedWeight: (v: string) => set('estimatedWeight', v),
      setPackageLength: (v: string) => set('packageLength', v),
      setPackageWidth: (v: string) => set('packageWidth', v),
      setPackageHeight: (v: string) => set('packageHeight', v),
      setCity: (v: string) => set('city', v),
      setState: (v: string) => set('state', v),
      setZipCode: (v: string) => set('zipCode', v),
      setFrameSize: (v: string) => set('frameSize', v),
      setWheelSize: (v: string) => set('wheelSize', v),
      setForkTravel: (v: string) => set('forkTravel', v),
      setRearTravel: (v: string) => set('rearTravel', v),
      setFrameMaterial: (v: string) => set('frameMaterial', v),
      setSellerType: (v: string) => set('sellerType', v),
    }),
    [set],
  )

  return {
    state,
    handlers,
    isEditMode,
    handleSubmit,
    handlePhotosChange,
    handleTagKeyDown,
    handleTagInputChange,
  }
}
