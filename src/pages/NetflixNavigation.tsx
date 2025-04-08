import classNames from "classnames";
import { Link, To, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { NoUserAvatar, UserAvatar } from "@/components/Avatar";
import { IconPatch } from "@/components/buttons/IconPatch";
import { Icons } from "@/components/Icon";
import { LinksDropdown } from "@/components/LinksDropdown";
import { Lightbar } from "@/components/utils/Lightbar";
import { useAuth } from "@/hooks/auth/useAuth";
import { BlurEllipsis } from "@/pages/layouts/SubPageLayout";
import { conf } from "@/setup/config";
import { useBannerSize } from "@/stores/banner";

import { BrandPill } from "@/components/layout/BrandPill";

export interface NavigationProps {
  bg?: boolean;
  noLightbar?: boolean;
  doBackground?: boolean;
  children?: React.ReactNode;
}

export function NetflixNavigation(props: NavigationProps) {
  const bannerHeight = useBannerSize();
  const navigate = useNavigate();
  const { loggedIn } = useAuth();

  const handleClick = (path: To) => {
    window.scrollTo(0, 0);
    navigate(path);
  };

  // Separate hero and regular content by checking for className
  const childrenArray = Array.isArray(props.children)
    ? props.children
    : [props.children];

  const heroChildren = childrenArray.filter(
    (child: any) =>
      child?.props?.className?.includes("full-width-hero")
  );

  const normalChildren = childrenArray.filter(
    (child: any) =>
      !child?.props?.className?.includes("full-width-hero")
  );

  // Add observer state
  const [heroSpacing, setHeroSpacing] = useState(0);

  useEffect(() => {
    const heroElement = document.querySelector('.full-width-hero');
    if (!heroElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeroSpacing(0);
        } else {
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

  return (
    <>
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-28 z-[60]">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-lg" />
        <div className="relative h-full flex flex-col">
          <Link
            to="/"
            className="flex items-center justify-center h-16"
            onClick={() => window.scrollTo(0, 0)}
          >
            <BrandPill clickable header />
          </Link>

          <nav className="flex-1 flex flex-col items-center justify-center space-y-6">
            <a
              onClick={() => handleClick("/discover")}
              className="text-2xl text-white tabbable rounded-full p-2 backdrop-blur-sm bg-black/50"
            >
              <IconPatch icon={Icons.SEARCH} clickable downsized />
            </a>
            <a
              onClick={() => handleClick("/my-list")}
              className="text-2xl text-white tabbable rounded-full p-2 backdrop-blur-sm bg-black/50"
            >
              <IconPatch icon={Icons.BOOKMARK} clickable downsized />
            </a>
            <a
              onClick={() => handleClick("/history")}
              className="text-2xl text-white tabbable rounded-full p-2 backdrop-blur-sm bg-black/50"
            >
              <IconPatch icon={Icons.CLOCK} clickable downsized />
            </a>
          </nav>

          <div className="absolute bottom-0 w-full p-4">
            <div className="flex items-center justify-end w-full">
              <LinksDropdown>
                {loggedIn ? <UserAvatar withName /> : <NoUserAvatar />}
              </LinksDropdown>
            </div>
          </div>
        </div>
      </div>

      {/* Hero (full-width) */}
      {heroChildren.length > 0 && (
        <div className="w-full relative z-0">
          {heroChildren}
        </div>
      )}

      {/* Main content wrapper (offset by sidebar) */}
      <div className="ml-28 flex-1">
        <div className="pl-4 pt-[600px]">
          {normalChildren}
        </div>
      </div>
    </>
  );
}