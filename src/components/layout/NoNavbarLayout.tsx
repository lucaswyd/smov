import { ReactNode } from "react";

interface NoNavbarLayoutProps {
  children: ReactNode;
}

export function NoNavbarLayout({ children }: NoNavbarLayoutProps) {
  return <div className="min-h-screen flex flex-col">{children}</div>;
}
