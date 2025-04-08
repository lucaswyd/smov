import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

import { Icon, Icons } from "@/components/Icon";
import { WideContainer } from "@/components/layout/WideContainer";
import { Button } from "@/components/buttons/Button";
import { searchForMedia } from "@/backend/metadata/search";
import { get } from "@/backend/metadata/tmdb";
import { conf } from "@/setup/config";
import { NoNavbarLayout } from "@/components/layout/NoNavbarLayout";
import { useProgressStore } from "@/stores/progress";
import { useBookmarkStore } from "@/stores/bookmarks";
import { WatchingPart } from "@/pages/parts/home/WatchingPart";
import { NetflixNavigation } from "./NetflixNavigation";
import { Flare } from "@/components/utils/Flare";
import "../styles/global.css";

interface Movie {
  id: number;
  title: string;
  name: string;
  overview: string;
  poster_path?: string;
  backdrop_path: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  release_date: string;
  first_air_date: string;
  media_type: 'movie' | 'tv';
  runtime?: number;
  popularity: number;
}

interface Category {
  name: string;
  movies: Movie[];
  path: string;
}

interface TMDBResponse {
  results: Movie[];
}

export function Netflix() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<{
    logos: { file_path: string; iso_639_1: string }[];
  } | null>(null);
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [movieWidth, setMovieWidth] = useState(
    window.innerWidth < 600 ? "150px" : "200px",
  );
  const [isHovered, setIsHovered] = useState(false);
  const [trendingTVShows, setTrendingTVShows] = useState<Movie[]>([]);
  // Get history and bookmarks
  const progressItems = useProgressStore((s) => s.items);
  const bookmarkItems = useBookmarkStore((s) => s.bookmarks);

  // Helper function to convert store items to Movie format
  const convertToMovie = (item: any): Movie => ({
    id: item.tmdbId,
    title: item.title,
    name: item.title,
    overview: "",
    poster_path: item.poster,
    backdrop_path: "",
    vote_average: 0,
    genres: [],
    release_date: item.year ? item.year.toString() : "",
    first_air_date: "",
    media_type: "movie",
    runtime: item.runtime,
    popularity: 0,
  });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setMovieWidth(window.innerWidth < 600 ? "150px" : "200px");
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle body overflow
  useEffect(() => {
    document.body.style.overflow = isHovered ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isHovered]);

  useEffect(() => {
    const fetchImages = async () => {
      if (featuredMovie) {
        try {
          const imagesData = await get<{
            logos: { file_path: string; iso_639_1: string }[];
          }>(`/movie/${featuredMovie.id}/images`, {
            language: "en-US",
            include_image_language: "en,null",
          });
          setImages(imagesData);
        } catch (error) {
          console.error("Error fetching movie images:", error);
        }
      }
    };
    fetchImages();
  }, [featuredMovie]);

  // Fetch content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Helper function to filter US content
        const filterUSContent = (items: any[]) => {
          return items.filter((item: any) => 
            item.origin_country?.includes("US") || 
            item.production_countries?.some((country: any) => country.iso_3166_1 === "US")
          );
        };

        // Fetch movies from TMDB
        const [featured, popularMovies, trendingTV] = await Promise.all([
          // Featured content (most popular from both movies and TV)
          Promise.all([
            get<TMDBResponse>("/trending/movie/day", {
              api_key: conf().TMDB_READ_API_KEY,
              language: "en-US",
            }),
            get<TMDBResponse>("/trending/tv/day", {
              api_key: conf().TMDB_READ_API_KEY,
              language: "en-US",
            })
          ]).then(([movies, tv]) => {
            // Combine movies and TV shows and sort by popularity
            const allContent = [...movies.results, ...tv.results];
            const mostPopular = allContent.sort((a, b) => b.popularity - a.popularity)[0];
            return mostPopular;
          }),

          // Popular Movies
          get<TMDBResponse>("/trending/movie/week", {
            api_key: conf().TMDB_READ_API_KEY,
            language: "en-US",
            page: 1,
          }).then(data => {
            return data.results.slice(0, 10);
          }),

          // Trending TV Shows
          get<TMDBResponse>("/trending/tv/week", {
            api_key: conf().TMDB_READ_API_KEY,
            language: "en-US",
          }).then(data => {
            return data.results.slice(0, 10);
          }),
        ]);

        // Convert history and bookmark items
        const continueWatchingMovies = Object.values(progressItems)
          .map(convertToMovie)
          .slice(0, 10);

        const myListMovies = Object.values(bookmarkItems)
          .map(convertToMovie)
          .slice(0, 10);

        // Ensure we have at least 10 items in popular movies
        if (popularMovies.length < 10) {
          const additionalMovies = await get<TMDBResponse>("/movie/popular", {
            api_key: conf().TMDB_READ_API_KEY,
            language: "en-US",
            page: 2,
          }).then(data => {
            const usMovies = filterUSContent(data.results);
            return usMovies.length > 0 ? usMovies : data.results;
          });
          popularMovies.push(...additionalMovies.slice(0, 10 - popularMovies.length));
        }

        setFeaturedMovie(featured);
        setCategories([
          ...(Object.values(bookmarkItems).length > 0 
            ? [{ name: "My List", movies: myListMovies, path: "" }]
            : []),
          { name: "Trending Movies", movies: popularMovies, path: "movie/popular" },
          { name: "Trending TV", movies: trendingTV, path: "tv/trending" }
        ]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching content:", error);
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  // Fetch trending TV shows
  useEffect(() => {
    const fetchTrendingTV = async () => {
      try {
        const trendingTV = await get<TMDBResponse>("/trending/tv/day", {
          api_key: conf().TMDB_READ_API_KEY,
          language: "en-US",
          origin_country: "US",
        });
        
        // Filter for US shows and take top 10
        const usShows = trendingTV.results
          .filter((show: any) => show.origin_country.includes("US"))
          .slice(0, 10);

        setTrendingTVShows(usShows);
      } catch (error) {
        console.error("Error fetching trending TV shows:", error);
      }
    };

    fetchTrendingTV();
  }, []);

  // Scroll carousel
  const scrollCarousel = (categorySlug: string, direction: string) => {
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
  };

  // Handle wheel
  let isScrolling = false;
  const handleWheel = (e: React.WheelEvent, categorySlug: string) => {
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

    setTimeout(() => {
      isScrolling = false;
    }, 345);
  };

  const handleWatchNow = () => {
    if (featuredMovie) {
      const type = featuredMovie.first_air_date ? "tv" : "movie";
      const mediaPath = `tmdb-${type}-${featuredMovie.id}-${featuredMovie.title || featuredMovie.name}`;
      navigate(`/media/${mediaPath}`);
    }
  };

  const formatTitle = (title: string) => {
    if (!title) return "Loading...";
    return title.length > 32 ? `${title.slice(0, 32)}...` : title;
  };

  // const [searchQuery, setSearchQuery] = useState("");
  // const [searchResults, setSearchResults] = useState<Movie[]>([]);
  // const [showSearchResults, setShowSearchResults] = useState(false);

  // const handleSearch = async (query: string) => {
  //   if (!query) {
  //     setSearchResults([]);
  //     setShowSearchResults(false);
  //     return;
  //   }

  //   try {
  //     const results = await searchForMedia({ searchQuery: query });
  //     const mappedResults = results.map((result) => convertToMovie(result));
  //     setSearchResults(mappedResults);
  //     setShowSearchResults(true);
  //   } catch (error) {
  //     console.error("Error searching:", error);
  //     setSearchResults([]);
  //   }
  // };

  // const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  //   if (e.key === "Escape") {
  //     // Handle search submission
  //     setShowSearchResults(false);
  //   }
  // };

  // const handleSearchBlur = () => {
  //   setShowSearchResults(false);
  // };

  // const handleResultClick = (result: Movie) => {
  //   const mediaType = result.media_type === 'movie' ? 'movie' : 'tv';
  //   const mediaPath = `tmdb-${mediaType}-${result.id}-${encodeURIComponent(result.title)}`;
  //   navigate(`/media/${mediaPath}/details`);
  //   setSearchQuery("");
  //   setShowSearchResults(false);
  // };

  // Add observer state
  const [heroSpacing, setHeroSpacing] = useState(0);

  // Add observer effect
  useEffect(() => {
    const heroElement = document.querySelector('.hero-section');
    if (!heroElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeroSpacing(0);
        } else {
          // Add spacing equal to hero height
          setHeroSpacing(heroElement.getBoundingClientRect().height);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(heroElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-black text-white min-h-screen">
        <Helmet>
          <title>Netflix Clone - Watch Movies Online</title>
        </Helmet>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
        </div>
      </div>
    );
  }

  // Render movies
  const renderMovies = (movies: Movie[], category: string) => {
    const categorySlug = `${category.toLowerCase().replace(/ /g, "-")}${Math.random()}`;

    return (
      <div className="relative overflow-hidden">
        <h2 className="text-3xl cursor-default font-bold text-white sm:text-4xl md:text-3xl mb-2.5 ml-5" style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)" }}>
          {category}
        </h2>
        <div
          id={`carousel-${categorySlug}`}
          className="flex whitespace-nowrap pt-3 overflow-auto scrollbar rounded-xl overflow-y-hidden custom-scrollbar"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          ref={(el) => {
            carouselRefs.current[categorySlug] = el;
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onWheel={(e) => {
            const carousel = carouselRefs.current[categorySlug];
            if (!carousel) return;
            
            if (e.deltaY > 0) {
              carousel.scrollLeft += 100;
            } else {
              carousel.scrollLeft -= 100;
            }
            e.preventDefault();
          }}
        >
          {movies.map((media) => (
            <a
              key={media.id}
              onClick={() => navigate(`/media/tmdb-${media.media_type}-${media.id}-${media.title || media.name}/details`)}
              className="text-center relative mt-2 mx-4 mb-3 transition-transform hover:scale-105 duration-[0.45s]"
              style={{ flex: `0 0 ${movieWidth}` }}
            >
              <img
                src={
                  media.poster_path
                    ? `https://image.tmdb.org/t/p/w300${media.poster_path}`
                    : "/placeholder.png"
                }
                alt={media.poster_path ? "" : "failed to fetch :("}
                loading="lazy"
                className="rounded-xl relative w-48 h-auto"
              />
              <h1 className="group relative pt-2 text-[13.5px] whitespace-normal duration-[0.35s] font-semibold text-white">
                {(media.title?.length ?? 0) > 32
                  ? `${media.title?.slice(0, 32)}...`
                  : media.title || media.name}
              </h1>
            </a>
          ))}
        </div>
        <div className="flex items-center justify-center">
          <button
            type="button"
            title="Back"
            className="absolute left-2 top-1/2 transform -translate-y-3/4 z-10"
            onClick={() => scrollCarousel(categorySlug, "left")}
          >
            <div className="cursor-pointer text-white flex justify-center items-center h-10 w-10 rounded-full bg-search-hoverBackground active:scale-110 transition-[transform,background-color] duration-200">
              <Icon icon={Icons.ARROW_LEFT} />
            </div>
          </button>
          <button
            type="button"
            title="Next"
            className="absolute right-2 top-1/2 transform -translate-y-3/4 z-10"
            onClick={() => scrollCarousel(categorySlug, "right")}
          >
            <div className="cursor-pointer text-white flex justify-center items-center h-10 w-10 rounded-full bg-search-hoverBackground active:scale-110 transition-[transform,background-color] duration-200">
              <Icon icon={Icons.ARROW_RIGHT} />
            </div>
          </button>
        </div>
      </div>
    );
  };

  return (
    <NoNavbarLayout>
      <NetflixNavigation>
        <Helmet>
          <title>Netflix</title>
        </Helmet>
        <div className="fixed top-0 left-0 right-0 z-50 bg-background-main/90 backdrop-blur-sm">
          <div className="px-2">
            {/* <div className="flex items-center justify-between h-16">
              <div className="flex-1">
                <div className="flex items-center justify-center h-full">
                  <div className="w-[600px] mt-2 pl-2">
                    <img
                      src={
                        featuredMovie.poster_path
                          ? `https://image.tmdb.org/t/p/w500${featuredMovie.poster_path}`
                          : "/placeholder.png"
                      }
                      alt={featuredMovie.poster_path ? "" : "failed to fetch :("}
                      loading="lazy"
                      className="rounded-xl relative"
                    />
                    <h1 className="group relative pt-2 text-[13.5px] whitespace-normal duration-[0.35s] font-semibold text-white opacity-0 group-hover:opacity-100">
                      {(featuredMovie.title?.length ?? 0) > 32
                        ? `${featuredMovie.title?.slice(0, 32)}...`
                        : featuredMovie.title}
                    </h1>
                  </div>
                </div>
              </div>
            </div> */}
          </div>
        </div>

        {/* Hero Section */}
        <div
          className="full-width-hero absolute inset-0 z-0 h-screen flex items-center overflow-hidden hero-section"
          style={{
            backgroundImage: featuredMovie
              ? `url(https://image.tmdb.org/t/p/original${featuredMovie.backdrop_path})`
              : "url(/images/hero-pattern.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
        >
          {/* Bottom gradient overlay */}
          {/* <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent z-20"></div> */}
          
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-4xl mx-auto px-2 relative z-20 ml-[8.6rem]">
              {featuredMovie && (
                <div className="relative">
                  {images?.logos?.find((logo) => logo.iso_639_1 === "en")?.file_path ? (
                    <div className="flex flex-col">
                      <img
                        src={`https://image.tmdb.org/t/p/w500${images.logos.find((logo) => logo.iso_639_1 === "en")?.file_path}`}
                        alt=""
                        className="h-192 w-96 object-contain mb-6"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-background-main/50 rounded-full">
                          <img src="/lightbar-images/star.png" alt="Star" className="w-4 h-4" />
                          <span className="text-sm font-medium text-white/90">
                            {featuredMovie?.vote_average?.toFixed(1) || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center px-2 py-1 bg-background-main/50 rounded-full">
                          <span className="text-sm font-medium text-white/90">
                            {featuredMovie?.release_date ? featuredMovie.release_date.slice(0, 4) : featuredMovie?.first_air_date?.slice(0, 4) || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={
                        featuredMovie.poster_path
                          ? `https://image.tmdb.org/t/p/w500${featuredMovie.poster_path}`
                          : "/placeholder.png"
                      }
                      alt={featuredMovie.poster_path ? "" : "failed to fetch :("}
                      loading="lazy"
                      className="rounded-xl relative"
                    />
                  )}
                </div>
              )}
              <p className="mt-4 max-w-[50ch] text-base font-medium leading-normal text-shadow-sm mb-5" style={{ color: "rgba(232, 230, 227, 0.8)", textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)" }}>
                {featuredMovie?.overview || "Movie description loading..."}
              </p>
              <div className="flex space-x-4">
                <Flare.Base className="group cursor-pointer rounded-xl relative p-[0.35em] bg-background-main/50 transition-colors duration-300 inline-block">
                  <Flare.Light
                    flareSize={200}
                    cssColorVar="--colors-mediaCard-hoverAccent"
                    backgroundClass="bg-mediaCard-hoverBackground duration-200"
                    className="rounded-xl bg-background-main group-hover:opacity-100"
                  />
                  <button
                    type="button"
                    onClick={handleWatchNow}
                    className="flex items-center gap-1 px-4 py-1.5 text-white font-medium transition-colors relative z-10"
                  >
                    <Icon icon={Icons.PLAY} className="w-4 h-4" />
                      Watch Now
                  </button>
                </Flare.Base>
                <Flare.Base className="group cursor-pointer rounded-full relative p-[0.35em] bg-background-main/50 transition-colors duration-300 inline-block">
                  <Flare.Light
                    flareSize={200}
                    cssColorVar="--colors-mediaCard-hoverAccent"
                    backgroundClass="bg-mediaCard-hoverBackground duration-200"
                    className="rounded-full bg-background-main group-hover:opacity-100"
                  />
                  <button
                    type="button"
                    className="flex items-center justify-center w-[2.5rem] h-[2.5rem] text-white font-medium transition-colors relative z-10"
                  >
                    <Icon icon={Icons.BOOKMARK} className="w-4 h-4" />
                  </button>
                </Flare.Base>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="px-2 mt-8">
          <div className="relative overflow-hidden pt-8">
            <div
              id={`carousel-continue-watching`}
              className="flex whitespace-nowrap overflow-auto scrollbar rounded-xl overflow-y-hidden custom-scrollbar"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <WatchingPart onItemsChange={() => {}} />
            </div>
          </div>
          {categories.map((category) => (
            <div key={category.name} className="pt-2">
              {renderMovies(category.movies, category.name)}
            </div>
          ))}
        </div>
      </NetflixNavigation>
    </NoNavbarLayout>
  );
}
