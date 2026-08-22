'use client';

import { useEffect, useRef, useState } from 'react';

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** The slice of Cloudflare's widget API this uses. */
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'auto' | 'light' | 'dark';
          callback: () => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/** One script tag per page, however many times this mounts. */
function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later mount try again rather than caching the failure.
      scriptPromise = null;
      reject(new Error('Could not load the Turnstile script'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * The 'I am human' check on the public coverage form.
 *
 * Rendered explicitly rather than by Cloudflare's automatic scan, so the
 * widget is torn down cleanly on unmount and does not depend on a script
 * happening to run after this markup exists.
 *
 * The widget puts the token in a hidden `cf-turnstile-response` field of its
 * own, inside the container and therefore inside the form, which is what both
 * the submit button and the server action read. Adding a second field of that
 * name — the obvious thing to do, to hold the token in React state — is what
 * you must not do: two form controls sharing a name make `form.elements`
 * return a RadioNodeList whose `value` is always empty, so the guard on the
 * submit button would refuse every submission.
 *
 * Nothing else needs to know this component exists. With no site key
 * configured the widget is absent, the field with it, and the form behaves
 * exactly as it did before.
 */
export function Turnstile({ siteKey }: { siteKey: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          theme: 'auto',
          // A token is good for a few minutes. Cloudflare clears its own
          // field when one expires and fetches another, so a form filled in
          // slowly is stopped by the submit button rather than rejected at
          // the far end.
          callback: () => setFailed(false),
          'error-callback': () => setFailed(true),
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey]);

  return (
    <div className="grid gap-2">
      <div ref={container} />
      {failed ? (
        <p className="text-sm text-muted-foreground">
          The bot check could not load — an ad blocker or a strict network can
          stop it. Refresh the page, or email us and we will take the request
          that way.
        </p>
      ) : null}
    </div>
  );
}
