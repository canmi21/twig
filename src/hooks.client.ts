import { dev } from '$app/environment';
import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry } from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://e554a978139c602f117d1a310fb4a8e2@o4511131162116096.ingest.us.sentry.io/4511131164868608',
	enabled: !dev,
	environment: dev ? 'development' : 'production'
});

export const handleError = handleErrorWithSentry();
