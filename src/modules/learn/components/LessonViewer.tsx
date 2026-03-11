import type { JSONContent } from '@tiptap/react'

interface LessonViewerProps {
  content: unknown
}

export function LessonViewer({ content }: LessonViewerProps) {
  if (!content) {
    return (
      <div className="rounded-lg bg-[var(--color-bg-secondary)] p-8 text-center text-[var(--color-text-muted)]">
        Lesson content will appear here.
      </div>
    )
  }

  // If content is a Tiptap JSON document, render it safely
  if (typeof content === 'object' && content !== null && 'type' in content) {
    return (
      <div className="prose max-w-none">
        <TiptapRenderer content={content as JSONContent} />
      </div>
    )
  }

  // If content is a plain string, render as text paragraphs
  if (typeof content === 'string') {
    return (
      <div className="prose max-w-none">
        {content.split('\n\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    )
  }

  return null
}

function TiptapRenderer({ content }: { content: JSONContent }) {
  if (!content.content) return null

  return (
    <>
      {content.content.map((node, i) => (
        <TiptapNode key={i} node={node} />
      ))}
    </>
  )
}

function TiptapNode({ node }: { node: JSONContent }) {
  if (node.type === 'paragraph') {
    return (
      <p>
        {node.content?.map((child, i) => (
          <TiptapInline key={i} node={child} />
        ))}
      </p>
    )
  }

  if (node.type === 'heading') {
    const Tag = `h${node.attrs?.level || 2}` as keyof React.JSX.IntrinsicElements
    return (
      <Tag>
        {node.content?.map((child, i) => (
          <TiptapInline key={i} node={child} />
        ))}
      </Tag>
    )
  }

  if (node.type === 'bulletList') {
    return (
      <ul>
        {node.content?.map((item, i) => (
          <TiptapNode key={i} node={item} />
        ))}
      </ul>
    )
  }

  if (node.type === 'orderedList') {
    return (
      <ol>
        {node.content?.map((item, i) => (
          <TiptapNode key={i} node={item} />
        ))}
      </ol>
    )
  }

  if (node.type === 'listItem') {
    return (
      <li>
        {node.content?.map((child, i) => (
          <TiptapNode key={i} node={child} />
        ))}
      </li>
    )
  }

  if (node.type === 'blockquote') {
    return (
      <blockquote>
        {node.content?.map((child, i) => (
          <TiptapNode key={i} node={child} />
        ))}
      </blockquote>
    )
  }

  if (node.type === 'image' && node.attrs?.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={node.attrs.src} alt={node.attrs?.alt || ''} />
  }

  if (node.type === 'youtube' && node.attrs?.src) {
    return (
      <div className="aspect-video overflow-hidden rounded-lg">
        <iframe
          src={`https://www.youtube.com/embed/${node.attrs.src}`}
          allowFullScreen
          className="h-full w-full"
          title="Video"
        />
      </div>
    )
  }

  return null
}

function TiptapInline({ node }: { node: JSONContent }) {
  if (node.type === 'text') {
    let text: React.ReactNode = node.text
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = <strong>{text}</strong>
        if (mark.type === 'italic') text = <em>{text}</em>
        if (mark.type === 'link') text = <a href={mark.attrs?.href}>{text}</a>
        if (mark.type === 'code') text = <code>{text}</code>
      }
    }
    return <>{text}</>
  }
  return null
}
