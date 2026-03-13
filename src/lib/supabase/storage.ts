export const StorageFolders = {
  avatars: 'avatars',
  trails: 'trails',
  media: 'media',
  gear: 'gear',
  events: 'events',
  marketplace: 'marketplace',
} as const;

export type StorageFolder = (typeof StorageFolders)[keyof typeof StorageFolders];
