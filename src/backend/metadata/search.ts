import { SimpleCache } from "@/utils/cache";
import { MediaItem } from "@/utils/mediaTypes";

import {
  formatTMDBMetaToMediaItem,
  formatTMDBSearchResult,
  multiSearch,
} from "./tmdb";
import { MWQuery } from "./types/mw";

const cache = new SimpleCache<MWQuery, MediaItem[]>();
cache.setCompare((a, b) => {
  return a.searchQuery.trim() === b.searchQuery.trim();
});
cache.initialize();

export async function searchForMedia(query: MWQuery): Promise<MediaItem[]> {
  if (cache.has(query)) return cache.get(query) as MediaItem[];
  const { searchQuery } = query;

  const data = await multiSearch(searchQuery);
  const results = data.map((v) => {
    const formattedResult = formatTMDBSearchResult(v, v.media_type);
    return formatTMDBMetaToMediaItem(formattedResult);
  });

  // Sort results by relevance and popularity
  const sortedResults = results.sort((a, b) => {
    // First, check if the title starts with the search query (highest priority)
    const aStartsWith = a.title
      .toLowerCase()
      .startsWith(searchQuery.toLowerCase());
    const bStartsWith = b.title
      .toLowerCase()
      .startsWith(searchQuery.toLowerCase());
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;

    // Then, check if the title contains the search query
    const aContains = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const bContains = b.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (aContains && !bContains) return -1;
    if (!aContains && bContains) return 1;

    // Then sort by popularity (from TMDB data)
    const aPopularity =
      (data.find((d) => d.id.toString() === a.id.toString()) as any)
        ?.popularity || 0;
    const bPopularity =
      (data.find((d) => d.id.toString() === b.id.toString()) as any)
        ?.popularity || 0;
    if (aPopularity > bPopularity) return -1;
    if (aPopularity < bPopularity) return 1;

    // Finally, sort by whether they have posters
    if (a.poster && !b.poster) return -1;
    if (!a.poster && b.poster) return 1;

    return 0;
  });

  // cache results for 1 hour
  cache.set(query, sortedResults, 3600);
  return sortedResults;
}
