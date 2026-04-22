// R2 key shape is a private implementation detail — URLs stay flat at
// `/api/media/image/{sha}.{ext}`. Sharding here is purely hygienic for the
// case where the bucket is ever inspected via S3 tooling (65536 leaf dirs
// at 2+2 hex is plenty for any realistic single-author corpus). Don't leak
// this layout into any client-visible path.

export function imageR2Key(sha256: string): string {
	return `image/${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}`;
}
