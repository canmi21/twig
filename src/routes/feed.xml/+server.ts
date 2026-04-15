import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const prerender = false;

export const GET: RequestHandler = () => {
	redirect(301, '/feed');
};
