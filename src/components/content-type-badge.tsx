import {
	FileText,
	Flame,
	StickyNote,
	FolderGit2,
	Code2,
	Palette,
	Camera,
	Images,
	BookOpen,
	Flag,
	MessageCircle,
	Repeat2,
} from 'lucide-react'
import type { ContentType } from '~/server/database/constants'

const typeConfig: Record<ContentType, { icon: typeof FileText; label: string }> = {
	post: { icon: FileText, label: 'Post' },
	thought: { icon: Flame, label: 'Thought' },
	note: { icon: StickyNote, label: 'Note' },
	project: { icon: FolderGit2, label: 'Project' },
	snippet: { icon: Code2, label: 'Snippet' },
	design: { icon: Palette, label: 'Design' },
	photo: { icon: Camera, label: 'Photo' },
	album: { icon: Images, label: 'Album' },
	media: { icon: BookOpen, label: 'Media' },
	milestone: { icon: Flag, label: 'Milestone' },
	status: { icon: MessageCircle, label: 'Status' },
	repost: { icon: Repeat2, label: 'Repost' },
}

export function ContentTypeBadge({ type }: { type: ContentType }) {
	const config = typeConfig[type] ?? typeConfig.post
	const Icon = config.icon

	return (
		<span className="text-content-tertiary inline-flex" title={config.label}>
			<Icon className="size-3.5" />
		</span>
	)
}
