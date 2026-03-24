'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { ListingPhotoUploader, type PhotoItem } from './ListingPhotoUploader'
import { CategorySelect } from './CategorySelect'
import { ConditionSelect } from './ConditionSelect'
import { PricingSection } from './PricingSection'
import { FulfillmentSection } from './FulfillmentSection'
import { createListing, updateListing } from '@/modules/marketplace/actions/listing-mutations'
import { uploadListingPhoto } from '@/modules/marketplace/actions/photos'
import type { CreateListingInput } from '@/modules/marketplace/types'

type CreateListingFormProps = {
  initialData?: Partial<CreateListingInput> & { id?: string; photos?: PhotoItem[] }
}

export function CreateListingForm({ initialData }: CreateListingFormProps) {
  const router = useRouter()
  const isEditMode = Boolean(initialData?.id)

  // Store pending File objects for new listings (before listingId exists)
  const pendingFilesRef = useRef<Map<string, File>>(new Map())

  // ----- Form state -----
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [condition, setCondition] = useState(initialData?.condition ?? '')
  const [brand, setBrand] = useState(initialData?.brand ?? '')
  const [modelName, setModelName] = useState(initialData?.modelName ?? '')
  const [year, setYear] = useState(initialData?.year?.toString() ?? '')
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [price, setPrice] = useState(
    initialData?.price !== undefined ? initialData.price.toString() : '',
  )
  const [acceptsOffers, setAcceptsOffers] = useState(
    initialData?.acceptsOffers ?? true,
  )
  const [minOfferPercent, setMinOfferPercent] = useState(
    initialData?.minOfferPercent !== undefined
      ? initialData.minOfferPercent.toString()
      : '',
  )
  const [fulfillment, setFulfillment] = useState<string>(
    initialData?.fulfillment ?? 'local_or_ship',
  )
  const [shippingCost, setShippingCost] = useState(
    initialData?.shippingCost !== undefined
      ? initialData.shippingCost.toString()
      : '',
  )
  const [estimatedWeight, setEstimatedWeight] = useState(
    initialData?.estimatedWeight !== undefined
      ? initialData.estimatedWeight.toString()
      : '',
  )
  const [packageLength, setPackageLength] = useState(
    initialData?.packageLength !== undefined
      ? initialData.packageLength.toString()
      : '',
  )
  const [packageWidth, setPackageWidth] = useState(
    initialData?.packageWidth !== undefined
      ? initialData.packageWidth.toString()
      : '',
  )
  const [packageHeight, setPackageHeight] = useState(
    initialData?.packageHeight !== undefined
      ? initialData.packageHeight.toString()
      : '',
  )
  const [city, setCity] = useState(initialData?.city ?? '')
  const [state, setState] = useState(initialData?.state ?? '')
  const [zipCode, setZipCode] = useState(initialData?.zipCode ?? '')
  const fromGarageBikeId = initialData?.fromGarageBikeId
  const [photos, setPhotos] = useState<PhotoItem[]>(
    initialData?.photos ?? [],
  )

  // ----- Submission state -----
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ----- Tag handling -----
  const addTag = useCallback(
    (raw: string) => {
      const trimmed = raw.trim().toLowerCase()
      if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
        setTags((prev) => [...prev, trimmed])
      }
    },
    [tags],
  )

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addTag(tagInput)
        setTagInput('')
      }
      // Backspace on empty input removes last tag
      if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
        setTags((prev) => prev.slice(0, -1))
      }
    },
    [addTag, tagInput, tags.length],
  )

  const handleTagInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      // If user types a comma, add the tag
      if (val.includes(',')) {
        const parts = val.split(',')
        parts.forEach((part) => {
          if (part.trim()) addTag(part)
        })
        setTagInput('')
      } else {
        setTagInput(val)
      }
    },
    [addTag],
  )

  // Called by ListingPhotoUploader when photos change (for new listings, tracks pending Files)
  const handlePhotosChange = useCallback(
    (newPhotos: PhotoItem[], newFiles?: Map<string, File>) => {
      setPhotos(newPhotos)
      if (newFiles) {
        for (const [id, file] of newFiles) {
          pendingFilesRef.current.set(id, file)
        }
        // Clean up removed photos
        const photoIds = new Set(newPhotos.map((p) => p.id))
        for (const id of pendingFilesRef.current.keys()) {
          if (!photoIds.has(id)) {
            pendingFilesRef.current.delete(id)
          }
        }
      }
    },
    [],
  )

  // ----- Submit -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const data: CreateListingInput = {
        title: title.trim(),
        description: description.trim(),
        category: category as CreateListingInput['category'],
        condition: condition as CreateListingInput['condition'],
        brand: brand.trim() || undefined,
        modelName: modelName.trim() || undefined,
        year: year ? parseInt(year, 10) : undefined,
        tags: tags.length > 0 ? tags : undefined,
        price: parseFloat(price),
        acceptsOffers,
        minOfferPercent: minOfferPercent
          ? parseInt(minOfferPercent, 10)
          : undefined,
        fulfillment: fulfillment as CreateListingInput['fulfillment'],
        shippingCost: shippingCost ? parseFloat(shippingCost) : undefined,
        estimatedWeight: estimatedWeight
          ? parseFloat(estimatedWeight)
          : undefined,
        packageLength: packageLength ? parseInt(packageLength, 10) : undefined,
        packageWidth: packageWidth ? parseInt(packageWidth, 10) : undefined,
        packageHeight: packageHeight ? parseInt(packageHeight, 10) : undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        fromGarageBikeId: fromGarageBikeId || undefined,
      }

      if (isEditMode && initialData?.id) {
        // Edit mode
        const updated = await updateListing(initialData.id, data)
        router.push(`/marketplace/${updated.slug}`)
      } else {
        // Create mode — first create the listing, then upload photos
        const listing = await createListing(data)

        // Upload any pending photos
        for (const photo of photos) {
          const file = pendingFilesRef.current.get(photo.id)
          if (file) {
            await uploadListingPhoto(listing.id, file)
          }
        }

        router.push(`/marketplace/${listing.slug}`)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      )
      setIsSubmitting(false)
    }
  }

  // ----- Shared input styles -----
  const inputClass =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <span className="text-sm text-red-500">{error}</span>
        </div>
      )}

      {/* ---- Section 1: Photos ---- */}
      <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
        <ListingPhotoUploader
          listingId={isEditMode ? initialData?.id : undefined}
          photos={photos}
          onPhotosChange={(newPhotos) => handlePhotosChange(newPhotos)}
        />
      </section>

      {/* ---- Section 2: Item Details ---- */}
      <section className="flex flex-col gap-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Item Details
        </h3>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="listing-title"
            className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="listing-title"
            type="text"
            placeholder="e.g. 2023 Santa Cruz Megatower CC X01"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            className={inputClass}
          />
        </div>

        {/* Category + Condition side-by-side */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CategorySelect value={category} onChange={setCategory} />
          <ConditionSelect value={condition} onChange={setCondition} />
        </div>

        {/* Brand, Model, Year */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="listing-brand"
              className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
            >
              Brand
            </label>
            <input
              id="listing-brand"
              type="text"
              placeholder="e.g. Santa Cruz"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              maxLength={100}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="listing-model"
              className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
            >
              Model
            </label>
            <input
              id="listing-model"
              type="text"
              placeholder="e.g. Megatower"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              maxLength={100}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="listing-year"
              className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
            >
              Year
            </label>
            <input
              id="listing-year"
              type="number"
              min="1900"
              max="2030"
              placeholder="e.g. 2023"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={`${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            />
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="listing-description"
            className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="listing-description"
            rows={6}
            placeholder="Describe the item, its condition, upgrades, and anything buyers should know..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            required
            className={`${inputClass} resize-y`}
          />
          <span className="self-end text-xs text-[var(--color-text-muted)]">
            {description.length}/5000
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="listing-tags"
            className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
          >
            Tags
          </label>
          <p className="text-xs text-[var(--color-text-muted)]">
            Press Enter or comma to add a tag (max 10)
          </p>

          {/* Tag chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-[var(--color-text-muted)] transition-colors hover:text-red-500"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            id="listing-tags"
            type="text"
            placeholder={
              tags.length >= 10
                ? 'Maximum tags reached'
                : 'e.g. enduro, carbon, 29er'
            }
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagKeyDown}
            disabled={tags.length >= 10}
            className={inputClass}
          />
        </div>
      </section>

      {/* ---- Section 3: Pricing ---- */}
      <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
        <PricingSection
          price={price}
          onPriceChange={setPrice}
          acceptsOffers={acceptsOffers}
          onAcceptsOffersChange={setAcceptsOffers}
          minOfferPercent={minOfferPercent}
          onMinOfferPercentChange={setMinOfferPercent}
        />
      </section>

      {/* ---- Section 4: Fulfillment ---- */}
      <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
        <FulfillmentSection
          fulfillment={fulfillment}
          onFulfillmentChange={setFulfillment}
          shippingCost={shippingCost}
          onShippingCostChange={setShippingCost}
          estimatedWeight={estimatedWeight}
          onEstimatedWeightChange={setEstimatedWeight}
          packageLength={packageLength}
          onPackageLengthChange={setPackageLength}
          packageWidth={packageWidth}
          onPackageWidthChange={setPackageWidth}
          packageHeight={packageHeight}
          onPackageHeightChange={setPackageHeight}
          city={city}
          onCityChange={setCity}
          state={state}
          onStateChange={setState}
          zipCode={zipCode}
          onZipCodeChange={setZipCode}
        />
      </section>

      {/* ---- Submit ---- */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? 'Publishing...'
          : isEditMode
            ? 'Save Changes'
            : 'Publish Listing'}
      </button>
    </form>
  )
}
