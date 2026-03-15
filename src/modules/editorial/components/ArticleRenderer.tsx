import type { JSONContent } from '@tiptap/react'

interface ArticleRendererProps {
  content: JSONContent
}

export function ArticleRenderer({ content }: ArticleRendererProps) {
  if (!content?.content) return null

  return (
    <div className="prose prose-lg max-w-none text-[var(--color-text)]">
      {content.content.map((node, i) => (
        <RenderNode key={i} node={node} />
      ))}
    </div>
  )
}

function RenderNode({ node }: { node: JSONContent }) {
  if (node.type === 'paragraph') {
    return (
      <p>
        {node.content?.map((child, i) => <RenderInline key={i} node={child} />)}
      </p>
    )
  }
  if (node.type === 'heading') {
    const level = node.attrs?.level ?? 2
    const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'
    return (
      <Tag>
        {node.content?.map((child, i) => <RenderInline key={i} node={child} />)}
      </Tag>
    )
  }
  if (node.type === 'bulletList') {
    return (
      <ul>
        {node.content?.map((item, i) => <RenderNode key={i} node={item} />)}
      </ul>
    )
  }
  if (node.type === 'orderedList') {
    return (
      <ol>
        {node.content?.map((item, i) => <RenderNode key={i} node={item} />)}
      </ol>
    )
  }
  if (node.type === 'listItem') {
    return (
      <li>
        {node.content?.map((child, i) => <RenderNode key={i} node={child} />)}
      </li>
    )
  }
  if (node.type === 'blockquote') {
    return (
      <blockquote>
        {node.content?.map((child, i) => <RenderNode key={i} node={child} />)}
      </blockquote>
    )
  }
  if (node.type === 'codeBlock') {
    const code = node.content?.map((c) => c.text ?? '').join('') ?? ''
    return <pre><code>{code}</code></pre>
  }
  if (node.type === 'horizontalRule') {
    return <hr />
  }
  return null
}

function RenderInline({ node }: { node: JSONContent }) {
  if (node.type === 'text') {
    let text: React.ReactNode = node.text
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = <strong>{text}</strong>
        if (mark.type === 'italic') text = <em>{text}</em>
        if (mark.type === 'code') text = <code>{text}</code>
        if (mark.type === 'link') {
          text = (
            <a
              href={mark.attrs?.href}
              target={mark.attrs?.target ?? '_blank'}
              rel="noopener noreferrer"
            >
              {text}
            </a>
          )
        }
      }
    }
    return <>{text}</>
  }
  return null
}
