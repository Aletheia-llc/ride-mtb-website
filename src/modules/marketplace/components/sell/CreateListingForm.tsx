'use client'

import { AlertCircle, X } from 'lucide-react'
import { useListingForm } from './useListingForm'
import { ListingPhotoUploader, type PhotoItem } from './ListingPhotoUploader'
import { CategorySelect } from './CategorySelect'
import { ConditionSelect } from './ConditionSelect'
import { PricingSection } from './PricingSection'
import { FulfillmentSection } from './FulfillmentSection'
import { ListingSpecsSection } from './ListingSpecsSection'
import type { CreateListingInput } from '@/modules/marketplace/types'

type CreateListingFormProps = {
  initialData?: Partial<CreateListingInput> & { id?: string; photos?: PhotoItem[] }
}

const inputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]'

const labelClass = 'text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]'

export function CreateListingForm({ initialData }: CreateListingFormProps) {
  const {
    state,
    handlers,
    isEditMode,
    handleSubmit,
    handlePhotosChange,
    handleTagKeyDown,
    handleTagInputChange,
  } = useListingForm(initialData)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Error banner */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <span className="text-sm text-red-500">{state.error}</span>
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
          photos={state.photos}
          onPhotosChange={handlePhotosChange}
        />
      </section>

      {/* ---- Section 2: Item Details ---- */}
      <section className="flex flex-col gap-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Item Details
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CategorySelect value={state.category} onChange={handlers.setCategory} />
          <ConditionSelect value={state.condition} onChange={handlers.setCondition} />
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
            value={state.title}
            onChange={(e) => handlers.setTitle(e.target.value)}
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
              value={state.brand}
              onChange={(e) => handlers.setBrand(e.target.value)}
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
              value={state.modelName}
              onChange={(e) => handlers.setModelName(e.target.value)}
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
              value={state.year}
              onChange={(e) => handlers.setYear(e.target.value)}
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
                onClick={() => handlers.setSellerType(type)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  state.sellerType === type
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
            value={state.description}
            onChange={(e) => handlers.setDescription(e.target.value)}
            maxLength={5000}
            required
            className={`${inputClass} resize-y`}
          />
          <span className="self-end text-xs text-[var(--color-text-muted)]">
            {state.description.length}/5000
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="listing-tags" className={labelClass}>Tags</label>
          <p className="text-xs text-[var(--color-text-muted)]">
            Press Enter or comma to add a tag (max 10)
          </p>
          {state.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {state.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handlers.removeTag(tag)}
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
            placeholder={state.tags.length >= 10 ? 'Maximum tags reached' : 'e.g. enduro, carbon, 29er'}
            value={state.tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagKeyDown}
            disabled={state.tags.length >= 10}
            className={inputClass}
          />
        </div>
      </section>

      {/* ---- Section 3: MTB Specs (category-gated) ---- */}
      <ListingSpecsSection
        category={state.category}
        frameSize={state.frameSize}
        wheelSize={state.wheelSize}
        forkTravel={state.forkTravel}
        rearTravel={state.rearTravel}
        frameMaterial={state.frameMaterial}
        onFrameSizeChange={handlers.setFrameSize}
        onWheelSizeChange={handlers.setWheelSize}
        onForkTravelChange={handlers.setForkTravel}
        onRearTravelChange={handlers.setRearTravel}
        onFrameMaterialChange={handlers.setFrameMaterial}
        inputClass={inputClass}
      />

      {/* ---- Section 4: Pricing ---- */}
      <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
        <PricingSection
          price={state.price}
          onPriceChange={handlers.setPrice}
          acceptsOffers={state.acceptsOffers}
          onAcceptsOffersChange={handlers.setAcceptsOffers}
          minOfferPercent={state.minOfferPercent}
          onMinOfferPercentChange={handlers.setMinOfferPercent}
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
            aria-checked={state.acceptsTrades}
            onClick={() => handlers.setAcceptsTrades(!state.acceptsTrades)}
            className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none ${
              state.acceptsTrades ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                state.acceptsTrades ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </section>

      {/* ---- Section 5: Fulfillment ---- */}
      <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
        <FulfillmentSection
          fulfillment={state.fulfillment}
          onFulfillmentChange={handlers.setFulfillment}
          shippingCost={state.shippingCost}
          onShippingCostChange={handlers.setShippingCost}
          estimatedWeight={state.estimatedWeight}
          onEstimatedWeightChange={handlers.setEstimatedWeight}
          packageLength={state.packageLength}
          onPackageLengthChange={handlers.setPackageLength}
          packageWidth={state.packageWidth}
          onPackageWidthChange={handlers.setPackageWidth}
          packageHeight={state.packageHeight}
          onPackageHeightChange={handlers.setPackageHeight}
          city={state.city}
          onCityChange={handlers.setCity}
          state={state.state}
          onStateChange={handlers.setState}
          zipCode={state.zipCode}
          onZipCodeChange={handlers.setZipCode}
        />
      </section>

      {/* ---- Submit ---- */}
      <button
        type="submit"
        disabled={state.isSubmitting}
        className="w-full rounded-lg bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.isSubmitting
          ? 'Publishing...'
          : isEditMode
            ? 'Save Changes'
            : 'Publish Listing'}
      </button>
    </form>
  )
}
