'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle } from 'lucide-react'
import { ListingPhotoUploader, type PhotoItem } from './ListingPhotoUploader'
import { CategorySelect } from './CategorySelect'
import { ConditionSelect } from './ConditionSelect'
import { PricingSection } from './PricingSection'
import { FulfillmentSection } from './FulfillmentSection'
import { ListingSpecsSection } from './ListingSpecsSection'
import { createListing, updateListing } from '@/modules/marketplace/actions/listing-mutations'
import { uploadListingPhoto } from '@/modules/marketplace/actions/photos'
import type { CreateListingInput } from '@/modules/marketplace/types'

type CreateListingFormProps = {
  initialData?: Partial<CreateListingInput> & { id?: string; photos?: PhotoItem[] }
}

export function CreateListingForm({ initialData }: CreateListingFormProps) {
  const router = useRouter()
  const isEditMode = Boolean(initialData?.id)
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
  const [acceptsOffers, setAcceptsOffers] = useState(initialData?.acceptsOffers ?? true)
  const [acceptsTrades, setAcceptsTrades] = useState(initialData?.acceptsTrades ?? false)
  const [minOfferPercent, setMinOfferPercent] = useState(
    initialData?.minOfferPercent !== undefined ? initialData.minOfferPercent.toString() : '',
  )
  const [fulfillment, setFulfillment] = useState<string>(
    initialData?.fulfillment ?? 'local_or_ship',
  )
  const [shippingCost, setShippingCost] = useState(
    initialData?.shippingCost !== undefined ? initialData.shippingCost.toString() : '',
  )
  const [estimatedWeight, setEstimatedWeight] = useState(
    initialData?.estimatedWeight !== undefined ? initialData.estimatedWeight.toString() : '',
  )
  const [packageLength, setPackageLength] = useState(
    initialData?.packageLength !== undefined ? initialData.packageLength.toString() : '',
  )
  const [packageWidth, setPackageWidth] = useState(
    initialData?.packageWidth !== undefined ? initialData.packageWidth.toString() : '',
  )
  const [packageHeight, setPackageHeight] = useState(
    initialData?.packageHeight !== undefined ? initialData.packageHeight.toString() : '',
  )
  const [city, setCity] = useState(initialData?.city ?? '')
  const [state, setState] = useState(initialData?.state ?? '')
  const [zipCode, setZipCode] = useState(initialData?.zipCode ?? '')
  const fromGarageBikeId = initialData?.fromGarageBikeId

  // MTB specs
  const [frameSize, setFrameSize] = useState(initialData?.frameSize ?? '')
  const [wheelSize, setWheelSize] = useState(initialData?.wheelSize ?? '')
  const [forkTravel, setForkTravel] = useState(
    initialData?.forkTravel !== undefined ? initialData.forkTravel.toString() : '',
  )
  const [rearTravel, setRearTravel] = useState(
    initialData?.rearTravel !== undefined ? initialData.rearTravel.toString() : '',
  )
  const [frameMaterial, setFrameMaterial] = useState(initialData?.frameMaterial ?? '')
  const [sellerType, setSellerType] = useState(initialData?.sellerType ?? 'individual')

  const [photos, setPhotos] = useState<PhotoItem[]>(initialData?.photos ?? [])
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
      if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
        setTags((prev) => prev.slice(0, -1))
      }
    },
    [addTag, tagInput, tags.length],
  )

  const handleTagInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (val.includes(',')) {
        val.split(',').forEach((part) => { if (part.trim()) addTag(part) })
        setTagInput('')
      } else {
        setTagInput(val)
      }
    },
    [addTag],
  )

  const handlePhotosChange = useCallback(
    (newPhotos: PhotoItem[], newFiles?: Map<string, File>) => {
      setPhotos(newPhotos)
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
        acceptsTrades,
        minOfferPercent: minOfferPercent ? parseInt(minOfferPercent, 10) : undefined,
        fulfillment: fulfillment as CreateListingInput['fulfillment'],
        shippingCost: shippingCost ? parseFloat(shippingCost) : undefined,
        estimatedWeight: estimatedWeight ? parseFloat(estimatedWeight) : undefined,
        packageLength: packageLength ? parseInt(packageLength, 10) : undefined,
        packageWidth: packageWidth ? parseInt(packageWidth, 10) : undefined,
        packageHeight: packageHeight ? parseInt(packageHeight, 10) : undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        fromGarageBikeId: fromGarageBikeId || undefined,
        frameSize: frameSize || undefined,
        wheelSize: wheelSize || undefined,
        forkTravel: forkTravel ? parseInt(forkTravel, 10) : undefined,
        rearTravel: rearTravel ? parseInt(rearTravel, 10) : undefined,
        frameMaterial: frameMaterial || undefined,
        sellerType: sellerType || 'individual',
      }

      if (isEditMode && initialData?.id) {
        const updated = await updateListing(initialData.id, data)
        router.push(`/buy-sell/${updated.slug}`)
      } else {
        const listing = await createListing(data)
        for (const photo of photos) {
          const file = pendingFilesRef.current.get(photo.id)
          if (file) await uploadListingPhoto(listing.id, file)
        }
        router.push(`/buy-sell/${listing.slug}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]'

  const labelClass = 'text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <span className="text-sm text-red-500">{error}</span>
        </div>
      )}

      {/* ---- Community Guidelines ---- */}
      {!isEditMode && (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-[var(--color-text)]">Listing Guidelines</p>
            <ul className="mt-1 flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
              <li>• Post only items you own and are ready to sell — no duplicates or placeholder listings</li>
              <li>• Accurate photos required — use your own, not stock images</li>
              <li>• Describe condition honestly; disclose damage, wear, or modifications</li>
              <li>• Set a fair price — check recent sales for reference</li>
              <li>• Respond to messages promptly and honor agreed prices</li>
            </ul>
          </div>
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

        {/* Category + Condition — top of form, gates spec fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CategorySelect value={category} onChange={setCategory} />
          <ConditionSelect value={condition} onChange={setCondition} />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="listing-title" className={labelClass}>
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

        {/* Brand, Model, Year */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="listing-brand" className={labelClass}>Brand</label>
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
            <label htmlFor="listing-model" className={labelClass}>Model</label>
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
            <label htmlFor="listing-year" className={labelClass}>Year</label>
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

        {/* Seller type */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Seller Type</label>
          <div className="flex gap-3">
            {(['individual', 'shop'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSellerType(type)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  sellerType === type
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {type === 'individual' ? 'Individual' : 'Shop / Dealer'}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="listing-description" className={labelClass}>
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
          <label htmlFor="listing-tags" className={labelClass}>Tags</label>
          <p className="text-xs text-[var(--color-text-muted)]">
            Press Enter or comma to add a tag (max 10)
          </p>
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
            placeholder={tags.length >= 10 ? 'Maximum tags reached' : 'e.g. enduro, carbon, 29er'}
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagKeyDown}
            disabled={tags.length >= 10}
            className={inputClass}
          />
        </div>
      </section>

      {/* ---- Section 3: MTB Specs (category-gated) ---- */}
      <ListingSpecsSection
        category={category}
        frameSize={frameSize}
        wheelSize={wheelSize}
        forkTravel={forkTravel}
        rearTravel={rearTravel}
        frameMaterial={frameMaterial}
        onFrameSizeChange={setFrameSize}
        onWheelSizeChange={setWheelSize}
        onForkTravelChange={setForkTravel}
        onRearTravelChange={setRearTravel}
        onFrameMaterialChange={setFrameMaterial}
        inputClass={inputClass}
      />

      {/* ---- Section 4: Pricing ---- */}
      <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
        <PricingSection
          price={price}
          onPriceChange={setPrice}
          acceptsOffers={acceptsOffers}
          onAcceptsOffersChange={setAcceptsOffers}
          minOfferPercent={minOfferPercent}
          onMinOfferPercentChange={setMinOfferPercent}
        />

        {/* Accepts Trades toggle */}
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Open to trades</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Interested in swapping for another item
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={acceptsTrades}
            onClick={() => setAcceptsTrades((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none ${
              acceptsTrades ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                acceptsTrades ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </section>

      {/* ---- Section 5: Fulfillment ---- */}
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
