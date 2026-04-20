// Bump this whenever the v1 / v2 / vN module being re-exported below changes
// shape. Stored on each post row as `schema_version`; migrations under
// `$lib/content/migrations` run when a stored doc lags this number.
export const CURRENT_SCHEMA_VERSION = 1;

export { docSchema, validateDoc } from './v1';
export type { BlockV1, DocV1, InlineV1, MarkV1 } from './v1';
