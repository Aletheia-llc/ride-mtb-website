import type { ImportEvent } from './dedup'

export async function fetchBikeRegEvents(): Promise<ImportEvent[]> {
  // TODO: integrate real BikeReg API when access is available
  return [
    {
      title: 'Sample BikeReg XC Race',
      slug: 'sample-bikereg-xc-race',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      eventType: 'race_xc',
      importSource: 'bikereg',
      externalId: 'bikereg-sample-001',
      city: 'Denver',
      state: 'CO',
      isFree: false,
    },
  ]
}
