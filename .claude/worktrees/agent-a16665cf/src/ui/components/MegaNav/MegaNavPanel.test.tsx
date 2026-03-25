import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MegaNavPanel } from './MegaNavPanel'
import { MEGA_NAV_CONFIG } from './megaNavConfig'

afterEach(cleanup)

const noop = () => {}

describe('MegaNavPanel', () => {
  it('renders the featured card title', () => {
    render(<MegaNavPanel entry={MEGA_NAV_CONFIG.learn} onMouseEnter={noop} onMouseLeave={noop} />)
    expect(screen.getByText('Level Up Your Skills')).toBeInTheDocument()
  })

  it('renders the CTA link with correct href', () => {
    render(<MegaNavPanel entry={MEGA_NAV_CONFIG.learn} onMouseEnter={noop} onMouseLeave={noop} />)
    const cta = screen.getByRole('link', { name: /browse courses/i })
    expect(cta).toHaveAttribute('href', '/learn/courses')
  })

  it('renders all links from all groups', () => {
    render(<MegaNavPanel entry={MEGA_NAV_CONFIG.forum} onMouseEnter={noop} onMouseLeave={noop} />)
    expect(screen.getByRole('link', { name: /all posts/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /communities/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /bookmarks/i })).toBeInTheDocument()
  })

  it('renders group labels', () => {
    render(<MegaNavPanel entry={MEGA_NAV_CONFIG.forum} onMouseEnter={noop} onMouseLeave={noop} />)
    expect(screen.getByText('Browse')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('calls onMouseEnter and onMouseLeave', () => {
    const onMouseEnter = vi.fn()
    const onMouseLeave = vi.fn()
    const { container } = render(
      <MegaNavPanel entry={MEGA_NAV_CONFIG.learn} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
    )
    const panel = container.firstChild as HTMLElement
    fireEvent.mouseEnter(panel)
    fireEvent.mouseLeave(panel)
    expect(onMouseEnter).toHaveBeenCalledTimes(1)
    expect(onMouseLeave).toHaveBeenCalledTimes(1)
  })
})
