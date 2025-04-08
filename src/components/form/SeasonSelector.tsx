import { Fragment, useState } from "react";

import { Icon, Icons } from "@/components/Icon";
import { Flare } from "@/components/utils/Flare";

export interface SeasonOption {
  id: string;
  name: string;
}

interface SeasonSelectorProps {
  seasons: SeasonOption[];
  selectedSeason: SeasonOption;
  setSelectedSeason: (season: SeasonOption) => void;
}

export function SeasonSelector({
  seasons,
  selectedSeason,
  setSelectedSeason,
}: SeasonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-[350px] rounded-lg bg-dropdown-background hover:bg-dropdown-hoverBackground py-3 pl-3 pr-10 text-left text-white shadow-md focus:outline-none tabbable cursor-pointer group"
      >
        <Flare.Light
          enabled={isOpen}
          backgroundClass="bg-dropdown-background hover:bg-dropdown-hoverBackground"
          className="absolute inset-0"
        />
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100">
          <div className="absolute inset-0 bg-background-secondaryHover rounded-lg" />
        </div>
        <div className="relative z-10">
          <span className="flex gap-4 items-center">
            <span className="flex-1 whitespace-nowrap overflow-hidden">
              <span className="text-sm sm:text-base md:text-lg lg:text-xl" style={{
                display: 'block',
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}>{selectedSeason.name}</span>
            </span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <Icon
              icon={Icons.UP_DOWN_ARROW}
              className="transform transition-transform text-xl text-dropdown-secondary"
            />
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-10 z-[100] mt-4 max-h-[calc(100vh-20rem)] overflow-auto rounded-md bg-dropdown-background py-1 text-white shadow-lg ring-1 ring-black ring-opacity-5 scrollbar-thin scrollbar-track-background-secondary scrollbar-thumb-type-secondary focus:outline-none sm:top-10 custom-scrollbar">
          <Flare.Light
            enabled={true}
            backgroundClass="bg-dropdown-background hover:bg-dropdown-hoverBackground"
            className="absolute inset-0"
          />
          <div className="grid grid-cols-5 gap-2 p-2">
            {seasons.map((season) => (
              <button
                key={season.id}
                className={`cursor-pointer relative select-none py-2 px-3 rounded-lg text-center font-bold transition-colors duration-200 ${
                  season.id === selectedSeason.id
                    ? "bg-background-secondaryHover text-type-link"
                    : "text-white"
                } hover:bg-background-secondaryHover hover:text-type-link`}
                onClick={() => {
                  setSelectedSeason(season);
                  setIsOpen(false);
                }}
              >
                <span className="block whitespace-nowrap overflow-hidden">
                  <span className="text-sm sm:text-base md:text-lg lg:text-xl" style={{
                    display: 'block',
                    width: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}>{season.name.toLowerCase().startsWith('season ') 
                    ? season.name.replace(/^season\s*/i, '')
                    : season.name.toLowerCase() === 'specials' 
                      ? '⭐'
                      : season.name}</span>
                </span>
                {season.id === selectedSeason.id && (
                  <span className="absolute inset-0 rounded-lg pointer-events-none" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
