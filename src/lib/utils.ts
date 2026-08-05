import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Semantic font sizes from tailwind.config.ts `extend.fontSize` must be registered
 * so they conflict with text-sm/text-base/etc. Otherwise `cn("text-sm", "text-caption")`
 * keeps both classes and the wrong size can win in CSS.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-h4",
        "text-body",
        "text-body-dense",
        "text-caption",
        "text-label",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
