"use client";

const DIALOG_FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function getDialogFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.hasAttribute("disabled") || element.getAttribute("aria-hidden") === "true") {
      return false;
    }

    const computedStyle = getComputedStyle(element);
    if (computedStyle.display === "none" || computedStyle.visibility === "hidden") {
      return false;
    }

    return !(element.offsetParent === null && computedStyle.position !== "fixed");
  });
}

export function trapDialogTabKey(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== "Tab" || !container) {
    return;
  }

  const focusable = getDialogFocusableElements(container);
  const activeElement = document.activeElement as HTMLElement | null;
  const firstElement = focusable[0];
  const lastElement = focusable[focusable.length - 1];

  if (!firstElement || !lastElement) {
    event.preventDefault();
    container.focus();
    return;
  }

  if (activeElement === container) {
    event.preventDefault();
    if (event.shiftKey) {
      lastElement.focus();
    } else {
      firstElement.focus();
    }
    return;
  }

  const isOutsideContainer = !activeElement || !container.contains(activeElement);
  if (isOutsideContainer) {
    event.preventDefault();
    if (event.shiftKey) {
      lastElement.focus();
    } else {
      firstElement.focus();
    }
    return;
  }

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}
