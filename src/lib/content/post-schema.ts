/* src/lib/content/post-schema.ts */

import { z } from 'zod/v4'

export const postSchema = z.object({
  slug: z
    .string()
    .min(1, 'slug must not be empty')
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      'slug must be lowercase alphanumeric with hyphens, cannot start or end with a hyphen',
    ),
  category: z
    .string()
    .min(1, 'category must not be empty')
    .regex(/^[a-z0-9]+$/, 'category must be lowercase alphanumeric only'),
  title: z
    .string()
    .min(1, 'title must not be empty')
    .max(200, 'title must be at most 200 characters'),
  description: z
    .string()
    .max(500, 'description must be at most 500 characters')
    .optional(),
  tags: z
    .array(
      z
        .string()
        .regex(
          /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
          'each tag must be lowercase alphanumeric with hyphens',
        ),
    )
    .max(5, 'at most 5 tags allowed')
    .optional(),
  content: z.string().min(1, 'content must not be empty'),
})

export type PostInput = z.infer<typeof postSchema>
