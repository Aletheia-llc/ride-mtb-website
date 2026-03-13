import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding bike spectrum categories...')

  const categories = [
    {
      categoryNumber: 1,
      categoryName: 'Gravel / Road+',
      categoryDescription: 'Light, fast, and versatile. Built for gravel roads, bike paths, and light trail riding.',
      travelRange: '0–40mm',
      recommendedWheelConfig: '29/29',
      recommendedSizes: { XS: '58–63"', S: '63–67"', M: '67–71"', L: '71–75"', XL: '75–79"' },
    },
    {
      categoryNumber: 3,
      categoryName: 'Cross-Country',
      categoryDescription: 'Efficient climbing and quick handling. Ideal for XC racing and fast singletrack.',
      travelRange: '80–120mm',
      recommendedWheelConfig: '29/29',
      recommendedSizes: { XS: '58–63"', S: '63–67"', M: '67–71"', L: '71–75"', XL: '75–79"' },
    },
    {
      categoryNumber: 5,
      categoryName: 'Trail / All-Mountain',
      categoryDescription: 'The do-it-all category. Balanced climbing and descending for varied terrain.',
      travelRange: '120–150mm',
      recommendedWheelConfig: '29/29',
      recommendedSizes: { XS: '58–63"', S: '63–67"', M: '67–71"', L: '71–75"', XL: '75–79"' },
    },
    {
      categoryNumber: 7,
      categoryName: 'Enduro',
      categoryDescription: 'Gravity-focused with enough pedaling ability for big days. Built for steep, technical descents.',
      travelRange: '150–180mm',
      recommendedWheelConfig: '29/27.5',
      recommendedSizes: { XS: '58–63"', S: '63–67"', M: '67–71"', L: '71–75"', XL: '75–79"' },
    },
    {
      categoryNumber: 9,
      categoryName: 'Downhill',
      categoryDescription: 'Maximum suspension travel and stability for bike parks and shuttle-accessed terrain.',
      travelRange: '180–210mm',
      recommendedWheelConfig: '27.5/27.5',
      recommendedSizes: { XS: '58–63"', S: '63–67"', M: '67–71"', L: '71–75"', XL: '75–79"' },
    },
  ]

  for (const cat of categories) {
    await prisma.bikeSpectrumCategory.upsert({
      where: { categoryNumber: cat.categoryNumber },
      update: cat,
      create: cat,
    })
  }

  console.log('Seeding bike brands...')

  const brands = [
    { slug: 'trek', name: 'Trek', website: 'https://www.trekbikes.com' },
    { slug: 'specialized', name: 'Specialized', website: 'https://www.specialized.com' },
    { slug: 'giant', name: 'Giant', website: 'https://www.giant-bicycles.com' },
    { slug: 'santa-cruz', name: 'Santa Cruz', website: 'https://www.santacruzbicycles.com' },
    { slug: 'yeti', name: 'Yeti', website: 'https://www.yeticycles.com' },
    { slug: 'canyon', name: 'Canyon', website: 'https://www.canyon.com' },
  ]

  const brandIds: Record<string, string> = {}

  for (const brand of brands) {
    const b = await prisma.bikeBrand.upsert({
      where: { slug: brand.slug },
      update: brand,
      create: brand,
    })
    brandIds[brand.slug] = b.id
  }

  console.log('Seeding bike brand models...')

  const models: Array<{
    brandSlug: string
    categoryNumber: number
    modelName: string
    priceRange: string
    productUrl: string
    availableSizes: string[]
    keySpecs: Record<string, string>
  }> = [
    { brandSlug: 'trek', categoryNumber: 5, modelName: 'Fuel EX 8', priceRange: '$3,299–$3,999', productUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/trail-mountain-bikes/fuel-ex/fuel-ex-8/', availableSizes: ['S', 'M', 'ML', 'L', 'XL', 'XXL'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'Alpha Platinum Aluminum' } },
    { brandSlug: 'trek', categoryNumber: 5, modelName: 'Fuel EX 9.8 GX', priceRange: '$5,999–$6,499', productUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/trail-mountain-bikes/fuel-ex/fuel-ex-9-8-gx/', availableSizes: ['S', 'M', 'ML', 'L', 'XL', 'XXL'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'OCLV Mountain Carbon' } },
    { brandSlug: 'trek', categoryNumber: 7, modelName: 'Slash 8', priceRange: '$4,299–$4,799', productUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/enduro-mountain-bikes/slash/slash-8/', availableSizes: ['S', 'M', 'ML', 'L', 'XL', 'XXL'], keySpecs: { travel: '170mm rear / 180mm front', wheel: '29"', frame: 'Alpha Platinum Aluminum' } },
    { brandSlug: 'trek', categoryNumber: 3, modelName: 'Procaliber 9.6', priceRange: '$2,799', productUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/cross-country-mountain-bikes/procaliber/procaliber-9-6/', availableSizes: ['S', 'M', 'L', 'XL', 'XXL'], keySpecs: { travel: '100mm front', wheel: '29"', frame: 'Alpha Platinum Aluminum' } },
    { brandSlug: 'specialized', categoryNumber: 5, modelName: 'Stumpjumper Comp', priceRange: '$3,700', productUrl: 'https://www.specialized.com/us/en/stumpjumper-comp/p/199470', availableSizes: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'M5 Alloy' } },
    { brandSlug: 'specialized', categoryNumber: 5, modelName: 'Stumpjumper Expert', priceRange: '$5,500', productUrl: 'https://www.specialized.com/us/en/stumpjumper-expert/p/199472', availableSizes: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'FACT 11m Carbon' } },
    { brandSlug: 'specialized', categoryNumber: 7, modelName: 'Enduro Comp', priceRange: '$4,500', productUrl: 'https://www.specialized.com/us/en/enduro-comp/p/199476', availableSizes: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], keySpecs: { travel: '160mm rear / 170mm front', wheel: '29"', frame: 'M5 Alloy' } },
    { brandSlug: 'giant', categoryNumber: 5, modelName: 'Trance X 29 2', priceRange: '$3,200', productUrl: 'https://www.giant-bicycles.com/us/trance-x-29-2', availableSizes: ['S', 'M', 'L', 'XL'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'ALUXX SL Aluminum' } },
    { brandSlug: 'giant', categoryNumber: 3, modelName: 'XTC Advanced 29 2', priceRange: '$3,100', productUrl: 'https://www.giant-bicycles.com/us/xtc-advanced-29-2', availableSizes: ['S', 'M', 'L', 'XL'], keySpecs: { travel: '100mm front', wheel: '29"', frame: 'Advanced Grade Composite' } },
    { brandSlug: 'santa-cruz', categoryNumber: 5, modelName: 'Tallboy 5 A', priceRange: '$3,599', productUrl: 'https://www.santacruzbicycles.com/en-US/tallboy', availableSizes: ['S', 'M', 'L', 'XL', 'XXL'], keySpecs: { travel: '120mm rear / 130mm front', wheel: '29"', frame: 'Aluminum' } },
    { brandSlug: 'santa-cruz', categoryNumber: 5, modelName: '5010 5 A', priceRange: '$3,199', productUrl: 'https://www.santacruzbicycles.com/en-US/5010', availableSizes: ['S', 'M', 'L', 'XL'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '27.5"', frame: 'Aluminum' } },
    { brandSlug: 'santa-cruz', categoryNumber: 7, modelName: 'Megatower 2 A', priceRange: '$4,499', productUrl: 'https://www.santacruzbicycles.com/en-US/megatower', availableSizes: ['S', 'M', 'L', 'XL', 'XXL'], keySpecs: { travel: '160mm rear / 170mm front', wheel: '29"', frame: 'Aluminum' } },
    { brandSlug: 'yeti', categoryNumber: 5, modelName: 'SB130 C2', priceRange: '$5,799', productUrl: 'https://www.yeticycles.com/bikes/sb130', availableSizes: ['XS', 'S', 'M', 'L', 'XL'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'C-Series Carbon' } },
    { brandSlug: 'yeti', categoryNumber: 7, modelName: 'SB150 C2', priceRange: '$6,299', productUrl: 'https://www.yeticycles.com/bikes/sb150', availableSizes: ['XS', 'S', 'M', 'L', 'XL'], keySpecs: { travel: '150mm rear / 160mm front', wheel: '29"', frame: 'C-Series Carbon' } },
    { brandSlug: 'canyon', categoryNumber: 5, modelName: 'Spectral 125 CF 7', priceRange: '$3,199', productUrl: 'https://www.canyon.com/en-us/mountain-bikes/trail/spectral/', availableSizes: ['XS', 'S', 'M', 'L', 'XL'], keySpecs: { travel: '125mm rear / 140mm front', wheel: '29"', frame: 'Carbon' } },
    { brandSlug: 'canyon', categoryNumber: 7, modelName: 'Strive CFR 9', priceRange: '$5,999', productUrl: 'https://www.canyon.com/en-us/mountain-bikes/enduro/strive/', availableSizes: ['XS', 'S', 'M', 'L', 'XL'], keySpecs: { travel: '160mm rear / 170mm front', wheel: '29"', frame: 'Carbon' } },
  ]

  for (const model of models) {
    const brandId = brandIds[model.brandSlug]
    if (!brandId) continue

    await prisma.bikeBrandModel.upsert({
      where: { brandId_categoryNumber_modelName: { brandId, categoryNumber: model.categoryNumber, modelName: model.modelName } },
      update: {
        priceRange: model.priceRange,
        productUrl: model.productUrl,
        availableSizes: model.availableSizes,
        keySpecs: model.keySpecs,
      },
      create: {
        brandId,
        categoryNumber: model.categoryNumber,
        modelName: model.modelName,
        priceRange: model.priceRange,
        productUrl: model.productUrl,
        availableSizes: model.availableSizes,
        keySpecs: model.keySpecs,
      },
    })
  }

  console.log('Done seeding bike data.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
