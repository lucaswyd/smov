import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Icon, Icons } from "@/components/Icon";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Flare } from "@/components/utils/Flare";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useProgressStore } from "@/stores/progress";
import { shouldShowProgress } from "@/stores/progress/utils";
import { EditButton } from "@/components/buttons/EditButton";
import { ProgressMediaItem, ProgressEpisodeItem } from "@/stores/progress";

interface ExtendedProgressMediaItem extends ProgressMediaItem {
  id: number;
}

interface WatchingPartProps {
  onItemsChange: (hasItems: boolean) => void;
}

function formatSeries(series?: ProgressEpisodeItem | null) {
  if (!series) return undefined;
  return {
    episode: series.number,
    season: 1, // Netflix-style: always show season 1
    episodeId: series.id,
    seasonId: series.seasonId,
  };
}

export function WatchingPart({ onItemsChange }: WatchingPartProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { bookmarks } = useBookmarkStore();
  const { items, removeItem } = useProgressStore();
  const [editing, setEditing] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const sortedProgressItems = useMemo(() => {
    let output: ExtendedProgressMediaItem[] = [];
    Object.entries(items)
      .filter(([_, item]) => shouldShowProgress(item).show)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .forEach(([id, item]) => {
        output.push({
          id: parseInt(id),
          ...item,
        });
      });

    output = output.filter((v) => {
      const isBookMarked = !!bookmarks[v.id];
      return !isBookMarked;
    });
    return output;
  }, [items, bookmarks]);

  useEffect(() => {
    onItemsChange(sortedProgressItems.length > 0);
  }, [sortedProgressItems, onItemsChange]);

  if (sortedProgressItems.length === 0) return null;

  const scrollLeft = () => {
    gridRef.current?.scrollBy({ left: -150, behavior: "smooth" });
  };

  const scrollRight = () => {
    gridRef.current?.scrollBy({ left: 150, behavior: "smooth" });
  };

  const handleRemove = (id: number) => {
    removeItem(id.toString());
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center mb-2">
        <SectionHeading icon={Icons.CLOCK} className="text-lg font-bold">
          {t("home.continueWatching.sectionTitle")}
        </SectionHeading>
        <EditButton 
          editing={editing} 
          onEdit={setEditing} 
          className="ml-4"
        />
      </div>
      <div className="relative overflow-hidden mt-2">
        <div
          className="flex whitespace-nowrap pt-4 overflow-auto scrollbar rounded-xl overflow-y-hidden custom-scrollbar"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          ref={gridRef}
        >
          {sortedProgressItems.map((item) => {
            const firstEpisode = Object.values(item.episodes)[0];
            const percentage = firstEpisode?.progress?.watched ?
              (firstEpisode.progress.watched / firstEpisode.progress.duration) * 100 : undefined;

            return (
              <div
                key={item.id}
                className={`text-center relative mt-3 mx-[0.285em] mb-3 transition-transform ${editing ? 'hover:scale-105' : 'hover:scale-105'} duration-[0.45s] cursor-pointer`}
                style={{ flex: "0 0 200px" }}
                onClick={(e) => {
                  if (editing) return;
                  const mediaType = item.type === 'movie' ? 'movie' : 'tv';
                  const episode = Object.values(item.episodes)[0];
                  if (!episode) return;
                  const mediaPath = `tmdb-${mediaType}-${item.id}-${encodeURIComponent(item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                  navigate(`/media/${mediaPath}/${episode.seasonId}/${episode.id}`);
                }}
              >
                <Flare.Base className="group cursor-pointer rounded-xl relative p-[0.65em] bg-background-main transition-colors duration-300 bg-transparent">
                  <Flare.Light
                    flareSize={300}
                    cssColorVar="--colors-mediaCard-hoverAccent"
                    backgroundClass="bg-mediaCard-hoverBackground duration-200"
                    className="rounded-xl bg-background-main group-hover:opacity-100"
                  />
                  <img
                    src={`https://image.tmdb.org/t/p/w500${item.poster || ''}`}
                    alt={item.title}
                    loading="lazy"
                    className="rounded-xl relative"
                  />
                  {editing && (
                    <>
                      <div className="absolute inset-0 bg-black/50 rounded-xl" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(item.id);
                        }}
                        className="absolute inset-0 flex items-center justify-center z-10"
                      >
                        <div className="bg-background-main/50 hover:bg-background-main/70 rounded-full p-3 transition-colors">
                          <Icon icon={Icons.X} className="text-white w-6 h-6" />
                        </div>
                      </button>
                    </>
                  )}
                  {firstEpisode ? (
                    <div
                      className="absolute right-2 top-2 rounded-md bg-mediaCard-badge px-2 py-1 transition-colors"
                    >
                      <p
                        className="text-center text-xs font-bold text-white transition-colors"
                      >
                        {t("media.episodeDisplay", {
                          season: item.seasons[firstEpisode.seasonId]?.number || 1,
                          episode: firstEpisode.number,
                        })}
                      </p>
                    </div>
                  ) : null}
                  {percentage !== undefined ? (
                    <>
                      <div
                        className="absolute inset-x-2 bottom-9 p-2 z-10"
                      >
                        <div className="relative h-1 overflow-hidden rounded-full bg-mediaCard-barColor">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-mediaCard-barFillColor"
                            style={{
                              width: `${Math.round(percentage).toFixed(0)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl" />
                  <h1 className="group relative pt-2 text-[13.5px] whitespace-normal duration-[0.35s] font-semibold text-white opacity-0 group-hover:opacity-100">
                    {(item.title?.length ?? 0) > 32
                      ? `${item.title?.slice(0, 32)}...`
                      : item.title}
                  </h1>
                </Flare.Base>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center">
          <button
            type="button"
            title="Back"
            className="absolute left-5 top-1/2 transform -translate-y-3/4 z-10"
            onClick={scrollLeft}
          >
            <div className="cursor-pointer text-white flex justify-center items-center h-10 w-10 rounded-full bg-search-hoverBackground active:scale-110 transition-[transform,background-color] duration-200">
              <Icon icon={Icons.ARROW_LEFT} />
            </div>
          </button>
          <button
            type="button"
            title="Next"
            className="absolute right-5 top-1/2 transform -translate-y-3/4 z-10"
            onClick={scrollRight}
          >
            <div className="cursor-pointer text-white flex justify-center items-center h-10 w-10 rounded-full bg-search-hoverBackground active:scale-110 transition-[transform,background-color] duration-200">
              <Icon icon={Icons.ARROW_RIGHT} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
