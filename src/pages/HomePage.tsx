import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { To, useNavigate } from "react-router-dom";

import { get } from "@/backend/metadata/tmdb";
import { Icon, Icons } from "@/components/Icon";
import { WideContainer } from "@/components/layout/WideContainer";
import { Flare } from "@/components/utils/Flare";
import { useDebounce } from "@/hooks/useDebounce";
import { useRandomTranslation } from "@/hooks/useRandomTranslation";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { Button } from "@/pages/About";
import { HomeLayout } from "@/pages/layouts/HomeLayout";
import { BookmarksPart } from "@/pages/parts/home/BookmarksPart";
import { HeroPart } from "@/pages/parts/home/HeroPart";
import { WatchingPart } from "@/pages/parts/home/WatchingPart";
import { SearchListPart } from "@/pages/parts/search/SearchListPart";
import { SearchLoadingPart } from "@/pages/parts/search/SearchLoadingPart";
import { conf } from "@/setup/config";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

interface TMDBResponse {
  results: Movie[];
}

function useSearch(search: string) {
  const [searching, setSearching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const debouncedSearch = useDebounce<string>(search, 500);
  useEffect(() => {
    setSearching(search !== "");
    setLoading(search !== "");
  }, [search]);
  useEffect(() => {
    setLoading(false);
  }, [debouncedSearch]);

  return {
    loading,
    searching,
  };
}

export function HomePage() {
  const { t } = useTranslation();
  const { t: randomT } = useRandomTranslation();
  const emptyText = randomT(`home.search.empty`);
  const navigate = useNavigate();
  const [showBg, setShowBg] = useState<boolean>(false);
  const searchParams = useSearchQuery();
  const [search] = searchParams;
  const s = useSearch(search);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showWatching, setShowWatching] = useState(false);
  const [inCinemasMovies, setInCinemasMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [movieWidth, setMovieWidth] = useState(
    window.innerWidth < 600 ? "150px" : "200px",
  );
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setMovieWidth(window.innerWidth < 600 ? "150px" : "200px");
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isHovered ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isHovered]);

  useEffect(() => {
    // Fetch In Cinemas movies
    const fetchInCinemas = async () => {
      try {
        const data = await get<TMDBResponse>("/movie/now_playing", {
          api_key: conf().TMDB_READ_API_KEY,
          language: "en-US",
        });
        setInCinemasMovies(data.results);
      } catch (error) {
        console.error("Error fetching in-cinemas movies:", error);
      }
    };

    // Fetch Popular movies
    const fetchPopular = async () => {
      try {
        const data = await get<TMDBResponse>("/movie/popular", {
          api_key: conf().TMDB_READ_API_KEY,
          language: "en-US",
        });
        setPopularMovies(data.results);
      } catch (error) {
        console.error("Error fetching popular movies:", error);
      }
    };

    fetchInCinemas();
    fetchPopular();
  }, []);

  function scrollCarousel(categorySlug: string, direction: string) {
    const carousel = carouselRefs.current[categorySlug];
    if (carousel) {
      const movieElements = carousel.getElementsByTagName("a");
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
      const movieElements = carousel.getElementsByTagName("a");
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

  function renderMovies(medias: Movie[], category: string) {
    const categorySlug = `${category.toLowerCase().replace(/ /g, "-")}${Math.random()}`;
    const displayCategory =
      category === "Now Playing" ? "In Cinemas" : category;

    return (
      <div className="relative overflow-hidden mt-2">
        <h2 className="text-2xl cursor-default font-bold text-white sm:text-3xl md:text-2xl mx-auto pl-5">
          {displayCategory}
        </h2>
        <div
          id={`carousel-${categorySlug}`}
          className="flex whitespace-nowrap pt-4 overflow-auto scrollbar rounded-xl overflow-y-hidden custom-scrollbar"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          ref={(el) => {
            carouselRefs.current[categorySlug] = el;
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onWheel={(e) => handleWheel(e, categorySlug)}
        >
          {medias
            .filter((media, index, self) => {
              return (
                index ===
                self.findIndex(
                  (m) => m.id === media.id && m.title === media.title,
                )
              );
            })
            .slice(0, 20)
            .map((media) => (
              <a
                key={media.id}
                onClick={() =>
                  navigate(
                    `/media/tmdb-movie-${media.id}-${media.title}/details`,
                  )
                }
                className="text-center relative mt-3 mx-[0.285em] mb-3 transition-transform hover:scale-105 duration-[0.45s]"
                style={{ flex: `0 0 ${movieWidth}` }}
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
                      media.poster_path
                        ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
                        : "/placeholder.png"
                    }
                    alt={media.poster_path ? "" : "failed to fetch :("}
                    loading="lazy"
                    className="rounded-xl relative"
                  />
                  <h1 className="group relative pt-2 text-[13.5px] whitespace-normal duration-[0.35s] font-semibold text-white opacity-0 group-hover:opacity-100">
                    {(media.title?.length ?? 0) > 32
                      ? `${media.title?.slice(0, 32)}...`
                      : media.title}
                  </h1>
                </Flare.Base>
              </a>
            ))}
        </div>

        <div className="flex items-center justify-center">
          <button
            type="button"
            title="Back"
            className="absolute left-5 top-1/2 transform -translate-y-3/4 z-10"
            onClick={() => scrollCarousel(categorySlug, "left")}
          >
            <div className="cursor-pointer text-white flex justify-center items-center h-10 w-10 rounded-full bg-search-hoverBackground active:scale-110 transition-[transform,background-color] duration-200">
              <Icon icon={Icons.ARROW_LEFT} />
            </div>
          </button>
          <button
            type="button"
            title="Next"
            className="absolute right-5 top-1/2 transform -translate-y-3/4 z-10"
            onClick={() => scrollCarousel(categorySlug, "right")}
          >
            <div className="cursor-pointer text-white flex justify-center items-center h-10 w-10 rounded-full bg-search-hoverBackground active:scale-110 transition-[transform,background-color] duration-200">
              <Icon icon={Icons.ARROW_RIGHT} />
            </div>
          </button>
        </div>
      </div>
    );
  }

  const handleClick = (path: To) => {
    window.scrollTo(0, 0);
    navigate(path);
  };

  return (
    <HomeLayout showBg={showBg}>
      <div className="mb-16 sm:mb-24">
        <Helmet>
          <style type="text/css">{`
            html, body {
              scrollbar-gutter: stable;
            }
          `}</style>
          <title>{t("global.name")}</title>
        </Helmet>
        <HeroPart searchParams={searchParams} setIsSticky={setShowBg} />
      </div>
      <WideContainer>
        {s.loading ? (
          <SearchLoadingPart />
        ) : s.searching ? (
          <SearchListPart searchQuery={search} />
        ) : (
          <>
            <div className="flex flex-col gap-8">
              <BookmarksPart onItemsChange={setShowBookmarks} />
              <WatchingPart onItemsChange={setShowWatching} />
            </div>
            {!(showBookmarks || showWatching) ? (
              <div className="flex flex-col items-center justify-center">
                <p className="text-[18.5px] pb-3">{emptyText}</p>
                <Button
                  className="px-py p-[0.35em] mt-3 rounded-xl text-type-dimmed box-content text-[18px] bg-largeCard-background text-buttons-secondaryText justify-center items-center"
                  onClick={() => handleClick("/discover")}
                >
                  {t("home.search.discover")}
                </Button>
              </div>
            ) : null}

            {renderMovies(inCinemasMovies, "Now Playing")}
            {renderMovies(popularMovies, "Popular Movies")}
          </>
        )}
      </WideContainer>
    </HomeLayout>
  );
}
