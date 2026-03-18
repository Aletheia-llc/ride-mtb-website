import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMapLayers } from './useMapLayers'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useMapLayers', () => {
  beforeEach(() => localStorageMock.clear())

  it('uses defaultLayers when no stored state', () => {
    const { result } = renderHook(() =>
      useMapLayers(['trails'], ['trails', 'events', 'coaching'])
    )
    expect(result.current.activeLayers.has('trails')).toBe(true)
    expect(result.current.activeLayers.has('events')).toBe(false)
  })

  it('restores persisted layers from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(['events', 'coaching']))
    const { result } = renderHook(() =>
      useMapLayers(['trails'], ['trails', 'events', 'coaching'])
    )
    expect(result.current.activeLayers.has('events')).toBe(true)
    expect(result.current.activeLayers.has('trails')).toBe(false)
  })

  it('toggles a layer and persists to localStorage', () => {
    const { result } = renderHook(() =>
      useMapLayers(['trails'], ['trails', 'events', 'coaching'])
    )
    act(() => result.current.toggleLayer('events'))
    expect(result.current.activeLayers.has('events')).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'ride-mtb-map-layers',
      expect.stringContaining('events')
    )
  })
})
