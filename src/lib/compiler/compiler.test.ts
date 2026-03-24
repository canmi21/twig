import { expect, test } from 'bun:test'
import { compile } from './index'

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

test('compile extracts frontmatter correctly', async () => {
  const result = await compile(fixture)

  expect(result.frontmatter.title).toBe('Hello World')
  expect(result.frontmatter.description).toBe('A test post')
  expect(result.frontmatter.category).toBe('dev')
  expect(result.frontmatter.tags).toEqual(['typescript', 'markdown'])
})

test('compile renders html without frontmatter', async () => {
  const result = await compile(fixture)

  expect(result.html).toContain('<a href="https://example.com">link</a>')
  expect(result.html).toContain('<h2 id="getting-started">Getting Started</h2>')
  expect(result.html).not.toContain('title: Hello World')
  expect(result.html).not.toContain('---')
})

test('compile generates toc from headings', async () => {
  const result = await compile(fixture)

  expect(result.toc).toEqual([
    { depth: 2, text: 'Getting Started', id: 'getting-started' },
    { depth: 2, text: 'Installation', id: 'installation' },
    { depth: 3, text: 'Prerequisites', id: 'prerequisites' },
  ])
})

test('compile handles markdown without frontmatter', async () => {
  const result = await compile('## Just a heading\n\nSome text.')

  expect(result.frontmatter.title).toBe('')
  expect(result.html).toContain('<h2 id="just-a-heading">Just a heading</h2>')
  expect(result.toc).toHaveLength(1)
})
