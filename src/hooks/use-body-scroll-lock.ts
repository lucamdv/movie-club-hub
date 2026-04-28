import { useEffect } from "react";

/**
 * Locks body scroll while a modal/sheet is open.
 * - Prevents the "double scrollbar" feel on mobile (body scrolling under the modal).
 * - Preserves the current scroll position and restores it on close.
 * - Adds the `modal-open` class so global CSS can react (e.g. hide bottom-nav).
 *
 * Pass `active = true` while the modal is mounted/open.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const prev = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.classList.add("modal-open");

    return () => {
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.overflow = prev.bodyOverflow;
      html.style.overflow = prev.htmlOverflow;
      body.classList.remove("modal-open");
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
