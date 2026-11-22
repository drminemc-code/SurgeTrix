import type { ResourceItem } from '../data/catalog';

export type ResourceViewKind = 'resources' | 'plugin' | 'mods' | 'apps' | 'resource-packs';
export type ResourceSortBy = 'downloads' | 'rating' | 'name';

export function getPlatformOptionsForKind(kind: ResourceViewKind): string[] {
  switch (kind) {
    case 'mods':
      return ['All', 'Fabric', 'NeoForge', 'Forge', 'Quilt'];
    case 'plugin':
      return ['All', 'Paper', 'Purpur', 'Folia', 'Spigot', 'Velocity'];
    case 'apps':
      return ['All', 'Windows', 'macOS', 'Linux', 'Web'];
    case 'resource-packs':
      return ['All', '1.21.x', '1.20.x', 'Bedrock'];
    default:
      return ['All', 'Fabric', 'NeoForge', 'Forge', 'Windows', 'macOS', '1.21.x'];
  }
}

export function filterAndSortResources(
  resources: ResourceItem[],
  options: {
    kind: ResourceViewKind;
    platform?: string;
    search?: string;
    sortBy?: ResourceSortBy;
  }
): ResourceItem[] {
  const { kind, platform = 'All', search = '', sortBy = 'downloads' } = options;
  const q = search.trim().toLowerCase();
  const normalizedPlatform = platform.trim().toLowerCase();

  const filtered = resources.filter((item) => {
    const matchesKind =
      kind === 'resources'
        ? item.kind === 'mods' || item.kind === 'apps' || item.kind === 'resource-packs'
        : item.kind === kind;
    if (!matchesKind) return false;

    if (
      normalizedPlatform &&
      normalizedPlatform !== 'all' &&
      !item.platforms.some((p) => p.toLowerCase() === normalizedPlatform)
    ) {
      return false;
    }

    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q) ||
      item.platforms.some((p) => p.toLowerCase().includes(q))
    );
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'rating') {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.downloads - a.downloads;
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    return b.downloads - a.downloads;
  });
}
