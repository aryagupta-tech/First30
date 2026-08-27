'use client';

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';

type NativeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children: ReactNode;
};

/**
 * Uses the browser's reliable document navigation instead of the Vinext RSC
 * client router, which can intercept a click without changing routes.
 */
export function NativeLink({ href, children, onClick, target = '_top', ...props }: NativeLinkProps) {
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    const alreadyIntercepted = event.defaultPrevented;
    onClick?.(event);
    if ((!alreadyIntercepted && event.defaultPrevented) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(href);
  }

  return <a href={href} target={target} {...props} onClick={navigate}>{children}</a>;
}
