import { dev } from '$app/environment';
import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry, SDK_VERSION } from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit';
import { installConsoleRelay, relayHandledError } from '$lib/client/console-relay';

Sentry.init({
	dsn: 'https://e554a978139c602f117d1a310fb4a8e2@o4511131162116096.ingest.us.sentry.io/4511131164868608',
	enabled: !dev,
	environment: dev ? 'development' : 'production'
});

// Sentry's npm build intentionally leaves `window.Sentry` unset — that's a
// CDN-loader affordance. Publishing it ourselves lets Wappalyzer pick up
// `Sentry.SDK_VERSION` the way it does on CDN-installed sites. SDK_VERSION
// is a const from @sentry/core, inlined at bundle time.
(window as unknown as { Sentry?: Record<string, unknown> }).Sentry = {
	...(window as unknown as { Sentry?: Record<string, unknown> }).Sentry,
	SDK_VERSION
};

installConsoleRelay();

const relayError: HandleClientError = ({ error, event, status }) => {
	relayHandledError(error, `${event.url.pathname} (${status})`);
};

export const handleError = handleErrorWithSentry(relayError);
