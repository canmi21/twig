import type { ThemeRegistration } from 'shiki/core'

// Palette mirrors src/styles/codes.css custom properties.
// Keep both in sync when adjusting colors.
const fg = '#b1b4b8' // --code-fg
const fgMuted = '#7f8a90' // --code-fg-muted
const dim = '#6e6a86' // --code-ui-dim
const deep = '#26233a' // --code-ui-deep
const rose = '#eb6f92' // --code-rose
const pine = '#31748f' // --code-pine
const gold = '#f6c177' // --code-gold
const foam = '#9ccfd8' // --code-foam
const iris = '#c4a7e7' // --code-iris

export const takiCodeTheme: ThemeRegistration = {
	name: 'taki-code',
	type: 'dark',
	colors: {
		'editor.background': deep,
		'editor.foreground': fg,
	},
	tokenColors: [
		// ── Comments ──────────────────────────────────────────────
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: dim, fontStyle: 'italic' },
		},

		// ── Keywords & storage ────────────────────────────────────
		{
			scope: [
				'keyword',
				'storage',
				'storage.type',
				'storage.modifier',
				'variable.language.this',
				'variable.language.super',
				'variable.language.self',
			],
			settings: { foreground: iris, fontStyle: 'italic' },
		},
		// Import / export — distinguished from general keywords
		{
			scope: [
				'keyword.control.import',
				'keyword.control.export',
				'keyword.control.from',
				'keyword.control.default',
				'keyword.control.as',
			],
			settings: { foreground: foam, fontStyle: 'italic' },
		},
		// Operators — neutral, reset italic inherited from keyword
		{
			scope: ['keyword.operator', 'punctuation.accessor'],
			settings: { foreground: fgMuted, fontStyle: '' },
		},

		// ── Functions ─────────────────────────────────────────────
		{
			scope: ['entity.name.function', 'support.function'],
			settings: { foreground: iris, fontStyle: 'italic' },
		},

		// ── Strings & numbers ─────────────────────────────────────
		{
			scope: ['string', 'punctuation.definition.string', 'constant.numeric'],
			settings: { foreground: gold },
		},
		// Template expression punctuation (${...}) — keep distinct
		{
			scope: ['punctuation.definition.template-expression'],
			settings: { foreground: iris },
		},

		// ── Escape sequences ──────────────────────────────────────
		{
			scope: ['constant.character.escape'],
			settings: { foreground: foam },
		},

		// ── Constants ─────────────────────────────────────────────
		{
			scope: ['constant.language', 'constant.other', 'variable.other.constant'],
			settings: { foreground: pine },
		},

		// ── Types, classes, interfaces ────────────────────────────
		{
			scope: [
				'entity.name.type',
				'entity.name.class',
				'support.type',
				'support.class',
				'entity.other.inherited-class',
			],
			settings: { foreground: rose },
		},

		// ── HTML / JSX ────────────────────────────────────────────
		{
			scope: ['entity.name.tag'],
			settings: { foreground: foam },
		},
		{
			scope: ['punctuation.definition.tag'],
			settings: { foreground: dim },
		},
		{
			scope: ['entity.other.attribute-name'],
			settings: { foreground: iris, fontStyle: 'italic' },
		},

		// ── Variables & parameters ────────────────────────────────
		{
			scope: ['variable', 'variable.other', 'variable.language', 'variable.function'],
			settings: { foreground: fg },
		},
		{
			scope: ['variable.parameter'],
			settings: { foreground: iris },
		},

		// ── Object / JSON / YAML / TOML keys ─────────────────────
		{
			scope: [
				'meta.object-literal.key',
				'support.type.property-name.json',
				'punctuation.support.type.property-name.json',
				'support.type.property-name.toml',
				'punctuation.support.type.property-name.toml',
				'entity.name.tag.yaml',
				'support.type.property-name.yaml',
			],
			settings: { foreground: foam },
		},

		// ── Punctuation ───────────────────────────────────────────
		{
			scope: ['punctuation', 'meta.brace'],
			settings: { foreground: fgMuted },
		},

		// ── Regular expressions ───────────────────────────────────
		{
			scope: ['string.regexp'],
			settings: { foreground: foam },
		},

		// ── CSS ───────────────────────────────────────────────────
		{
			scope: ['meta.property-name.css', 'support.type.property-name.css'],
			settings: { foreground: foam },
		},
		{
			scope: ['meta.property-value.css', 'support.constant.property-value.css'],
			settings: { foreground: gold },
		},
		{
			scope: ['entity.other.attribute-name.class.css', 'entity.other.attribute-name.id.css'],
			settings: { foreground: iris },
		},

		// ── Support ───────────────────────────────────────────────
		{
			scope: ['support'],
			settings: { foreground: foam },
		},
		{
			scope: ['support.constant'],
			settings: { foreground: gold },
		},

		// ── Markdown / markup ─────────────────────────────────────
		{
			scope: ['markup.heading', 'entity.name.section'],
			settings: { foreground: rose, fontStyle: 'bold' },
		},
		{
			scope: ['markup.bold'],
			settings: { fontStyle: 'bold' },
		},
		{
			scope: ['markup.italic'],
			settings: { fontStyle: 'italic' },
		},
		{
			scope: ['markup.underline.link'],
			settings: { foreground: foam },
		},
		{
			scope: ['markup.inline.raw'],
			settings: { foreground: gold },
		},
		{
			scope: ['markup.inserted.diff'],
			settings: { foreground: foam },
		},
		{
			scope: ['markup.deleted.diff'],
			settings: { foreground: rose },
		},
		{
			scope: ['meta.diff.range'],
			settings: { foreground: iris },
		},

		// ── Invalid ───────────────────────────────────────────────
		{
			scope: ['invalid'],
			settings: { foreground: rose },
		},
		{
			scope: ['invalid.deprecated'],
			settings: { foreground: fgMuted },
		},

		// ── Shell ─────────────────────────────────────────────────
		{
			scope: ['variable.other.normal.shell', 'punctuation.definition.variable.shell'],
			settings: { foreground: foam },
		},

		// ── SQL ───────────────────────────────────────────────────
		{
			scope: ['keyword.other.DML.sql', 'keyword.other.DDL.sql'],
			settings: { foreground: iris, fontStyle: 'italic' },
		},

		// ── TOML table headers ────────────────────────────────────
		{
			scope: ['entity.name.table.toml', 'support.type.property-name.table.toml'],
			settings: { foreground: iris },
		},

		// ── Meta (tag wrappers, imports) ──────────────────────────
		{
			scope: ['meta.import', 'meta.export'],
			settings: { foreground: pine },
		},
	],
}
