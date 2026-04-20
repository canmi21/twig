import { dev } from '$app/environment';
import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit';
import { installConsoleRelay, relayHandledError } from '$lib/client/console-relay';

Sentry.init({
	dsn: 'https://e554a978139c602f117d1a310fb4a8e2@o4511131162116096.ingest.us.sentry.io/4511131164868608',
	enabled: !dev,
	environment: dev ? 'development' : 'production'
});

installConsoleRelay();

const relayError: HandleClientError = ({ error, event, status }) => {
	relayHandledError(error, `${event.url.pathname} (${status})`);
};

export const handleError = handleErrorWithSentry(relayError);
