"use client";

import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes } from "react";

// The shared site's routes live on its own domain. Preserve the original
// components' Link interface while adapting navigation to this separate app.
export function Link({ to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return <a href={new URL(to, "https://globaltriplog.com").href} {...props} />;
}

export function useLocation() {
  return { pathname: usePathname() };
}
