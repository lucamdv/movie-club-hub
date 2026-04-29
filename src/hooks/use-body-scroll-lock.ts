import { useEffect } from "react";

/**
 * Locks body scroll while a modal/sheet is open.
 * - Uses overflow:hidden (NOT position:fixed) so fixed children of <body>
 *   keep their normal viewport-anchored coordinates. This avoids the modal
 *   panel being pushed off the top of the screen on mobile.
 * - Compensates for the disappearing scrollbar to prevent layout shift.
 * - Adds the `modal-open` class so global CSS can react (e.g. hide bottom-nav).
 *
 * Pass `active = true` while the modal is mounted/open.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const body = document.body;
    const html = document.documentElement;
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.classList.add("modal-open");

    return () => {
      body.style.overflow = prev.bodyOverflow;
      body.style.paddingRight = prev.bodyPaddingRight;
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.classList.remove("modal-open");
    };
  }, [active]);
}
