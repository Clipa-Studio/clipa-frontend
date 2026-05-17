import { defaultSchema } from 'rehype-sanitize'
import type { Options } from 'rehype-sanitize'

export const markdownSanitizeSchema: Options = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    video: [
      'src',
      'poster',
      'controls',
      'playsInline',
      'preload',
      'muted',
      'loop',
      'width',
      'height',
    ],
    source: [
      ...(defaultSchema.attributes?.source || []),
      'src',
      'type',
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    poster: ['https'],
    src: ['https'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'video',
  ],
}
