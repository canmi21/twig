/* src/lib/compiler/__tests__/compiler.test.ts */

import { describe, expect, test } from 'vitest'
import { compile } from '../index'

const fixture = `---
title: Hello World
description: A test post
category: dev
tags:
  - typescript
  - markdown
---

This is a paragraph with a [link](https://example.com).

## Getting Started

Some intro text.

## Installation

Run the following command.

### Prerequisites

You need Node.js installed.
`

describe('compile', () => {
  test('extracts frontmatter correctly', async () => {
    const result = await compile(fixture)

    expect(result.frontmatter.title).toBe('Hello World')
    expect(result.frontmatter.description).toBe('A test post')
    expect(result.frontmatter.category).toBe('dev')
    expect(result.frontmatter.tags).toEqual(['typescript', 'markdown'])
  })

  test('renders html without frontmatter', async () => {
    const result = await compile(fixture)

    expect(result.html).toContain('<a href="https://example.com">link</a>')
    expect(result.html).toContain(
      '<h2 id="getting-started"><a href="#getting-started" class="heading-link" aria-label="Link to section" data-heading-link="true" data-heading-id="getting-started"></a>Getting Started</h2>',
    )
    expect(result.html).not.toContain('title: Hello World')
    expect(result.html).not.toContain('---')
  })

  test('generates toc from headings', async () => {
    const result = await compile(fixture)

    expect(result.toc).toEqual([
      { depth: 2, text: 'Getting Started', id: 'getting-started' },
      { depth: 2, text: 'Installation', id: 'installation' },
      { depth: 3, text: 'Prerequisites', id: 'prerequisites' },
    ])
  })

  test('handles markdown without frontmatter', async () => {
    const result = await compile('## Just a heading\n\nSome text.')

    expect(result.frontmatter.title).toBe('')
    expect(result.html).toContain(
      '<h2 id="just-a-heading"><a href="#just-a-heading" class="heading-link" aria-label="Link to section" data-heading-link="true" data-heading-id="just-a-heading"></a>Just a heading</h2>',
    )
    expect(result.toc).toHaveLength(1)
    expect(result.components).toEqual([])
  })

  test('extracts directives as component placeholders', async () => {
    const md = `## Photos

::image{src="abc123.webp" alt="A photo"}

Some text between.

::video{src="def456.mp4"}

## End
`

    const result = await compile(md)

    expect(result.components).toEqual([
      {
        type: 'image',
        props: { src: 'abc123.webp', alt: 'A photo' },
        index: 0,
      },
      { type: 'video', props: { src: 'def456.mp4' }, index: 1 },
    ])

    expect(result.html).toContain('<!--component:0-->')
    expect(result.html).toContain('<!--component:1-->')
    expect(result.html).not.toContain('abc123.webp')
    expect(result.html).not.toContain('def456.mp4')
  })

  test('ignores unknown directives', async () => {
    const md = `::unknown{foo="bar"}

Some text.
`

    const result = await compile(md)

    expect(result.components).toEqual([])
  })

  test('handles mixed content with directives', async () => {
    const md = `## Title

A paragraph.

::image{src="photo.png" alt="test"}

Another paragraph with a [link](https://example.com).

::audio{src="track.mp3"}

Final text.
`

    const result = await compile(md)

    expect(result.toc).toEqual([{ depth: 2, text: 'Title', id: 'title' }])
    expect(result.components).toHaveLength(2)
    expect(result.components[0].type).toBe('image')
    expect(result.components[1].type).toBe('audio')
    expect(result.html).toContain('<p>A paragraph.</p>')
    expect(result.html).toContain('<a href="https://example.com">link</a>')
    expect(result.html).toContain('<!--component:0-->')
    expect(result.html).toContain('<!--component:1-->')
  })
})
