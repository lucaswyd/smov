import { ReactNode } from "react";
import { Icon, Icons } from "@/components/Icon";

interface SectionHeadingProps {
  icon?: Icons;
  children?: ReactNode;
  className?: string;
}

export function SectionHeading({ icon, children, className }: SectionHeadingProps) {
  return (
    <div className={className}>
      <h2 className="text-2xl cursor-default font-bold text-white sm:text-3xl md:text-2xl mx-auto pl-5">
        {icon ? (
          <span className="inline-flex items-center gap-2">
            <Icon icon={icon} className="text-xl text-gray-400" />
            {children}
          </span>
        ) : (
          children
        )}
      </h2>
    </div>
  );
}
