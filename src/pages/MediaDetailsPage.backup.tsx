import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { get } from "@/backend/metadata/tmdb";
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
        }

        console.log("Fetching credits from:", `/${type}/${tmdbId}/credits`);
        const creditsData = await get<Credits>(`/${type}/${tmdbId}/credits`, {
          language: "en-US",
        });
        console.log("Credits data:", creditsData);

        setDetails(detailsData);
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
                <Flare.Base className="group cursor-pointer rounded-xl relative p-[0.65em] bg-background-main transition-colors duration-300 bg-transparent">
                  <Flare.Light
                    flareSize={300}
                    cssColorVar="--colors-mediaCard-hoverAccent"
                    backgroundClass="bg-mediaCard-hoverBackground duration-200"
                    className="rounded-xl bg-background-main group-hover:opacity-100"
                  />
                  <img
                    src={`https://image.tmdb.org/t/p/w500${details.poster_path}`}
                    alt={title}
                    className="rounded-xl relative"
                  />
                </Flare.Base>
              </div>

              <div className="flex-1">
                <div className="mb-4">
                  {images?.logos?.find((logo) => logo.iso_639_1 === "en")
                    ?.file_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/original${images.logos.find((logo) => logo.iso_639_1 === "en")?.file_path}`}
                      alt=""
                      className="h-24 sm:h-32 md:h-40 lg:h-48 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]"
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

                <p className="text-white/90 text-lg mb-8">{details.overview}</p>

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
              </div>
            </div>

            {credits && credits.cast.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-bold text-white mb-6">Cast</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {credits.cast.slice(0, 8).map((actor) => (
                    <div key={actor.id} className="flex items-center gap-3">
                      <img
                        src={
                          actor.profile_path
                            ? `https://image.tmdb.org/t/p/w92${actor.profile_path}`
                            : "/placeholder.png"
                        }
                        alt={actor.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-white font-medium">{actor.name}</p>
                        <p className="text-white/60 text-sm">
                          {actor.character}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ThiccContainer>
      </div>
    </SubPageLayout>
  );
}
