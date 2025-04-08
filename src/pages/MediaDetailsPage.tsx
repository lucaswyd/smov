import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { get } from "@/backend/metadata/tmdb";
import { Dropdown } from "@/components/form/Dropdown";
import { SeasonSelector } from "@/components/form/SeasonSelector";
import { Icon, Icons } from "@/components/Icon";
import { ThiccContainer } from "@/components/layout/ThinContainer";
import { Flare } from "@/components/utils/Flare";
import { conf } from "@/setup/config";

import { SubPageLayout } from "./layouts/SubPageLayout";

interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  runtime: number;
  vote_average: number;
  genres: { id: number; name: string }[];
  production_companies: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
}

interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  vote_average?: number;
}

interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  overview: string;
  poster_path: string | null;
  episodes: Episode[];
}

interface TVShowDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  episode_run_time: number[];
  vote_average: number;
  genres: { id: number; name: string }[];
  networks: {
    id: number;
    name: string;
    logo_path: string;
  }[];
  images: {
    logos: {
      file_path: string;
      iso_639_1: string;
    }[];
  };
  seasons: Season[];
}

interface Credits {
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
  }[];
}

export function MediaDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { media } = useParams();
  const [details, setDetails] = useState<MovieDetails | TVShowDetails | null>(
    null,
  );
  const [credits, setCredits] = useState<Credits | null>(null);
  const [images, setImages] = useState<{
    logos: { file_path: string; iso_639_1: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTVShow, setIsTVShow] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const carouselRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState<Record<string, boolean>>(
    {},
  );
  const [canScrollRight, setCanScrollRight] = useState<Record<string, boolean>>(
    {},
  );

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function updateScrollButtons(categorySlug: string) {
    const carousel = carouselRefs.current[categorySlug];
    if (carousel) {
      setCanScrollLeft((prev) => ({
        ...prev,
        [categorySlug]: carousel.scrollLeft > 0,
      }));
      setCanScrollRight((prev) => ({
        ...prev,
        [categorySlug]:
          carousel.scrollLeft < carousel.scrollWidth - carousel.clientWidth - 1,
      }));
    }
  }

  useEffect(() => {
    const categorySlug = `episodes-${selectedSeason}`;
    const carousel = carouselRefs.current[categorySlug];
    if (carousel) {
      carousel.addEventListener("scroll", () =>
        updateScrollButtons(categorySlug),
      );
      // Initial check
      updateScrollButtons(categorySlug);
      return () => {
        carousel.removeEventListener("scroll", () =>
          updateScrollButtons(categorySlug),
        );
      };
    }
  }, [selectedSeason]);

  function scrollCarousel(categorySlug: string, direction: string) {
    const carousel = carouselRefs.current[categorySlug];
    if (carousel) {
      const movieElements = carousel.getElementsByTagName("div");
      if (movieElements.length > 0) {
        const elementWidth = movieElements[0].offsetWidth;
        const visibleMovies = Math.floor(carousel.offsetWidth / elementWidth);
        const scrollAmount = elementWidth * visibleMovies * 0.69;

        if (direction === "left") {
          carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        } else {
          carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      }
    }
  }

  const browser = !!window.chrome;
  let isScrolling = false;

  function handleWheel(e: React.WheelEvent, categorySlug: string) {
    if (isScrolling) {
      return;
    }

    isScrolling = true;
    const carousel = carouselRefs.current[categorySlug];
    if (carousel && !e.deltaX) {
      const movieElements = carousel.getElementsByTagName("div");
      if (movieElements.length > 0) {
        if (e.deltaY < 5) {
          scrollCarousel(categorySlug, "left");
        } else {
          scrollCarousel(categorySlug, "right");
        }
      }
    }

    if (browser) {
      setTimeout(() => {
        isScrolling = false;
      }, 345);
    } else {
      isScrolling = false;
    }
  }

  useEffect(() => {
    document.body.style.overflow = isHovered ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isHovered]);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const parts = media?.split("-") || [];
        const type = parts[1];
        const tmdbId = parts[2];
        console.log("Media params:", { type, tmdbId, fullMedia: media });
        if (!tmdbId) {
          console.log("No TMDB ID found");
          return;
        }

        setIsTVShow(type === "tv");

        console.log("Fetching details from:", `/${type}/${tmdbId}`);
        const detailsData = await get<MovieDetails | TVShowDetails>(
          `/${type}/${tmdbId}`,
          {
            language: "en-US",
            append_to_response: "seasons",
          },
        );
        console.log("Details data:", detailsData);

        if (type === "tv") {
          console.log("Fetching images from:", `/${type}/${tmdbId}/images`);
          const imagesData = await get<{
            logos: { file_path: string; iso_639_1: string }[];
          }>(`/${type}/${tmdbId}/images`, {
            language: "en-US",
            include_image_language: "en,null",
          });
          console.log(
            "TMDB Images API Response:",
            JSON.stringify(imagesData, null, 2),
          );
          setImages(imagesData);

          // Fetch episodes for each season
          const tvDetails = detailsData as TVShowDetails;
          const seasonsWithEpisodes = await Promise.all(
            tvDetails.seasons.map(async (season) => {
              const seasonData = await get<{ episodes: Episode[] }>(
                `/tv/${tmdbId}/season/${season.season_number}`,
                {
                  language: "en-US",
                },
              );
              return {
                ...season,
                episodes: seasonData.episodes,
              };
            }),
          );
          setDetails({
            ...tvDetails,
            seasons: seasonsWithEpisodes,
          });
        } else {
          console.log("Fetching images from:", `/${type}/${tmdbId}/images`);
          const imagesData = await get<{
            logos: { file_path: string; iso_639_1: string }[];
          }>(`/${type}/${tmdbId}/images`, {
            language: "en-US",
            include_image_language: "en,null",
          });
          console.log(
            "TMDB Images API Response:",
            JSON.stringify(imagesData, null, 2),
          );
          setImages(imagesData);
          setDetails(detailsData);
        }

        console.log("Fetching credits from:", `/${type}/${tmdbId}/credits`);
        const creditsData = await get<Credits>(`/${type}/${tmdbId}/credits`, {
          language: "en-US",
        });
        console.log("Credits data:", creditsData);

        setCredits(creditsData);
      } catch (error) {
        console.error("Error fetching media details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [media]);

  if (loading) {
    return (
      <SubPageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
        </div>
      </SubPageLayout>
    );
  }

  if (!details) {
    return (
      <SubPageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white text-xl">Media not found</p>
        </div>
      </SubPageLayout>
    );
  }

  const title = isTVShow
    ? (details as TVShowDetails).name
    : (details as MovieDetails).title;
  const releaseDate = isTVShow
    ? (details as TVShowDetails).first_air_date
    : (details as MovieDetails).release_date;
  const runtime = isTVShow
    ? (details as TVShowDetails).episode_run_time[0]
    : (details as MovieDetails).runtime;

  return (
    <SubPageLayout>
      <Helmet>
        <title>
          {title} - {t("global.name")}
        </title>
      </Helmet>
      <div className="relative min-h-screen -mt-20">
        <div className="absolute inset-0">
          <img
            src={`https://image.tmdb.org/t/p/original${details.backdrop_path}`}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background-main/80 to-background-main" />
        </div>

        <ThiccContainer>
          <div className="relative pt-16 pb-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-64 flex-shrink-0">
                <img
                  src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
                  alt={title}
                  className="rounded-xl w-full"
                />
                {credits && credits.cast.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-white/80 text-2xl font-bold mb-4">
                      Cast
                    </h3>
                    <div className="flex flex-col gap-3">
                      {credits.cast.slice(0, 5).map((actor) => (
                        <div key={actor.id} className="flex items-center gap-3">
                          <img
                            src={
                              actor.profile_path
                                ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                                : "/placeholder.png"
                            }
                            alt={actor.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex flex-col">
                            <span className="text-white/90 text-base">
                              {actor.name}
                            </span>
                            <span className="text-white/60 text-sm">
                              {actor.character}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="mb-4">
                  {images?.logos?.find((logo) => logo.iso_639_1 === "en")
                    ?.file_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/original${images.logos.find((logo) => logo.iso_639_1 === "en")?.file_path}`}
                      alt=""
                      className="max-h-48 h-auto w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : (
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                      {isTVShow
                        ? (details as TVShowDetails).name
                        : (details as MovieDetails).title}
                    </h1>
                  )}
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] hidden">
                    {isTVShow
                      ? (details as TVShowDetails).name
                      : (details as MovieDetails).title}
                  </h1>
                </div>
                <div className="flex items-center gap-4 text-white/80 mb-4">
                  <span>{new Date(releaseDate).getFullYear()}</span>
                  <span>•</span>
                  {!isTVShow && (
                    <>
                      <span>{runtime} min</span>
                      <span>•</span>
                    </>
                  )}
                  <span>⭐ {details.vote_average.toFixed(1)}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {details.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="px-3 py-1 bg-white/10 rounded-full text-white/80 text-sm"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                <p className="text-white/90 text-lg mb-4">{details.overview}</p>

                {isTVShow && (details as TVShowDetails).seasons && (
                  <div className="mb-8">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-bold text-white">
                        Episodes
                      </h2>
                      <SeasonSelector
                        seasons={(details as TVShowDetails).seasons.map(
                          (season) => ({
                            id: season.season_number.toString(),
                            name:
                              season.name || `Season ${season.season_number}`,
                          }),
                        )}
                        selectedSeason={{
                          id: selectedSeason.toString(),
                          name:
                            (details as TVShowDetails).seasons.find(
                              (s) => s.season_number === selectedSeason,
                            )?.name || `Season ${selectedSeason}`,
                        }}
                        setSelectedSeason={(opt) =>
                          setSelectedSeason(Number(opt.id))
                        }
                      />
                    </div>
                    <div className="relative overflow-hidden">
                      <div
                        className="flex whitespace-nowrap overflow-auto scrollbar rounded-xl overflow-y-hidden custom-scrollbar"
                        style={{
                          scrollbarWidth: "none",
                          msOverflowStyle: "none",
                        }}
                        ref={(el) => {
                          if (el) {
                            carouselRefs.current[`episodes-${selectedSeason}`] =
                              el;
                          }
                        }}
                        onWheel={(e) =>
                          handleWheel(e, `episodes-${selectedSeason}`)
                        }
                      >
                        {(details as TVShowDetails).seasons
                          .find((s) => s.season_number === selectedSeason)
                          ?.episodes.map((episode) => (
                            <div
                              key={episode.id}
                              onClick={() =>
                                navigate(
                                  `/media/${media}/${selectedSeason}/${episode.id}`,
                                )
                              }
                              className="text-center relative mt-3 mx-[0.285em] mb-3 transition-transform hover:scale-105 duration-[0.45s]"
                              style={{ flex: `0 0 300px` }}
                            >
                              <Flare.Base className="group cursor-pointer rounded-xl relative p-[0.65em] bg-background-main transition-colors duration-300 bg-transparent">
                                <Flare.Light
                                  flareSize={300}
                                  cssColorVar="--colors-mediaCard-hoverAccent"
                                  backgroundClass="bg-mediaCard-hoverBackground duration-200"
                                  className="rounded-xl bg-background-main group-hover:opacity-100"
                                />
                                <img
                                  src={
                                    episode.still_path
                                      ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
                                      : "/placeholder.png"
                                  }
                                  alt={episode.name}
                                  className="rounded-xl relative aspect-video object-cover"
                                />
                                <div className="absolute top-4 left-4 bg-black/50 px-2 py-1 rounded-md">
                                  <span className="text-white font-semibold text-sm">
                                    Episode {episode.episode_number}
                                  </span>
                                </div>
                                <div className="absolute top-4 right-4 bg-black/50 px-2 py-1 rounded-md">
                                  <span className="text-white font-semibold text-sm">
                                    {" "}
                                    ⭐
                                    {episode.vote_average?.toFixed(1) || "N/A"}
                                  </span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                  <h1 className="text-white font-semibold drop-shadow-[0_4px_12px_rgba(0,0,0,1)] relative z-20 transition-[margin] duration-300 group-hover:mb-16">
                                    {episode.name}
                                  </h1>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl z-10">
                                  <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <div className="transition-transform duration-300">
                                      <p className="text-white/80 text-sm whitespace-normal break-words line-clamp-3 max-w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        {episode.overview ||
                                          "No description available"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </Flare.Base>
                            </div>
                          ))}
                      </div>

                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          title="Back"
                          className={`absolute left-5 top-1/2 transform -translate-y-1/2 z-10 transition-opacity duration-200 ${
                            canScrollLeft[`episodes-${selectedSeason}`]
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                          onClick={() =>
                            scrollCarousel(`episodes-${selectedSeason}`, "left")
                          }
                        >
                          <div className="cursor-pointer text-white flex justify-center items-center h-10 w-10 rounded-full bg-search-hoverBackground active:scale-110 transition-[transform,background-color] duration-200">
                            <Icon icon={Icons.ARROW_LEFT} />
                          </div>
                        </button>
                        <button
                          type="button"
                          title="Next"
                          className={`absolute right-5 top-1/2 transform -translate-y-1/2 z-10 transition-opacity duration-200 ${
                            canScrollRight[`episodes-${selectedSeason}`]
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                          onClick={() =>
                            scrollCarousel(
                              `episodes-${selectedSeason}`,
                              "right",
                            )
                          }
                        >
                          <div className="cursor-pointer text-white flex justify-center items-center h-10 w-10 rounded-full bg-search-hoverBackground active:scale-110 transition-[transform,background-color] duration-200">
                            <Icon icon={Icons.ARROW_RIGHT} />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!isTVShow && (
                  <Flare.Base className="group cursor-pointer rounded-xl relative p-[0.65em] bg-background-main/50 transition-colors duration-300 inline-block">
                    <Flare.Light
                      flareSize={300}
                      cssColorVar="--colors-mediaCard-hoverAccent"
                      backgroundClass="bg-mediaCard-hoverBackground duration-200"
                      className="rounded-xl bg-background-main group-hover:opacity-100"
                    />
                    <button
                      type="button"
                      onClick={() => navigate(`/media/${media}`)}
                      className="flex items-center gap-2 px-6 py-3 text-white font-semibold transition-colors relative z-10"
                    >
                      <Icon icon={Icons.PLAY} />
                      Watch Now
                    </button>
                  </Flare.Base>
                )}
              </div>
            </div>
          </div>
        </ThiccContainer>
      </div>
    </SubPageLayout>
  );
}
