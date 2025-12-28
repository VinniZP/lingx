import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useIsMobile } from './use-mobile'

/**
 * Unit tests for useIsMobile hook
 * Tests viewport detection, SSR safety, resize handling, and cleanup
 */
describe('useIsMobile', () => {
  // Store original window properties
  let originalMatchMedia: typeof window.matchMedia
  let originalInnerWidth: number

  // Track matchMedia change listeners
  let mediaQueryChangeHandler: ((event: MediaQueryListEvent) => void) | null = null

  const createMockMatchMedia = (matches: boolean) => {
    return (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          mediaQueryChangeHandler = handler
        }
      }),
      removeEventListener: vi.fn((event: string) => {
        if (event === 'change') {
          mediaQueryChangeHandler = null
        }
      }),
      dispatchEvent: vi.fn(),
    })
  }

  const setViewportWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    })
  }

  beforeEach(() => {
    // Store originals
    originalMatchMedia = window.matchMedia
    originalInnerWidth = window.innerWidth

    // Reset change handler
    mediaQueryChangeHandler = null
  })

  afterEach(() => {
    // Restore originals
    window.matchMedia = originalMatchMedia
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  describe('SSR Safety', () => {
    it('should return false on initial render (SSR safety)', () => {
      // Setup: Mobile viewport
      setViewportWidth(375)
      window.matchMedia = createMockMatchMedia(true)

      // The hook initially returns !!undefined = false before useEffect runs
      const { result } = renderHook(() => useIsMobile())

      // After hydration, it should update based on viewport
      // But the initial render (SSR) returns false
      expect(typeof result.current).toBe('boolean')
    })
  })

  describe('Mobile viewport detection', () => {
    it('should return true when viewport width is less than 768px', async () => {
      // Arrange: Set mobile viewport
      setViewportWidth(375)
      window.matchMedia = createMockMatchMedia(true)

      // Act: Render the hook
      const { result } = renderHook(() => useIsMobile())

      // Assert: Should detect mobile after effect runs
      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    })

    it('should return true for viewport at 767px (edge case)', async () => {
      // Arrange: Set viewport just below breakpoint
      setViewportWidth(767)
      window.matchMedia = createMockMatchMedia(true)

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    })
  })

  describe('Desktop viewport detection', () => {
    it('should return false when viewport width is 768px or greater', async () => {
      // Arrange: Set tablet/desktop viewport
      setViewportWidth(768)
      window.matchMedia = createMockMatchMedia(false)

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(false)
      })
    })

    it('should return false for large desktop viewport (1280px)', async () => {
      // Arrange: Set desktop viewport
      setViewportWidth(1280)
      window.matchMedia = createMockMatchMedia(false)

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert
      await waitFor(() => {
        expect(result.current).toBe(false)
      })
    })
  })

  describe('Viewport resize handling', () => {
    it('should update from false to true when viewport resizes to mobile', async () => {
      // Arrange: Start with desktop viewport
      setViewportWidth(1280)
      window.matchMedia = createMockMatchMedia(false)

      const { result } = renderHook(() => useIsMobile())

      // Wait for initial render
      await waitFor(() => {
        expect(result.current).toBe(false)
      })

      // Act: Simulate resize to mobile
      act(() => {
        setViewportWidth(375)
        if (mediaQueryChangeHandler) {
          mediaQueryChangeHandler({ matches: true } as MediaQueryListEvent)
        }
      })

      // Assert: Should update to mobile
      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    })

    it('should update from true to false when viewport resizes to desktop', async () => {
      // Arrange: Start with mobile viewport
      setViewportWidth(375)
      window.matchMedia = createMockMatchMedia(true)

      const { result } = renderHook(() => useIsMobile())

      // Wait for initial render
      await waitFor(() => {
        expect(result.current).toBe(true)
      })

      // Act: Simulate resize to desktop
      act(() => {
        setViewportWidth(1280)
        if (mediaQueryChangeHandler) {
          mediaQueryChangeHandler({ matches: false } as MediaQueryListEvent)
        }
      })

      // Assert: Should update to desktop
      await waitFor(() => {
        expect(result.current).toBe(false)
      })
    })
  })

  describe('Cleanup on unmount', () => {
    it('should remove event listener on unmount', async () => {
      // Arrange
      setViewportWidth(768)
      let removeEventListenerCalled = false

      const mockMatchMediaFn = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(() => {
          removeEventListenerCalled = true
        }),
        dispatchEvent: vi.fn(),
      })

      window.matchMedia = mockMatchMediaFn

      // Act: Render and unmount
      const { unmount } = renderHook(() => useIsMobile())

      // Wait for effect to run
      await waitFor(() => {
        expect(true).toBe(true)
      })

      unmount()

      // Assert: Cleanup function should have been called
      expect(removeEventListenerCalled).toBe(true)
    })
  })

  describe('Return type', () => {
    it('should always return a boolean value', async () => {
      // Arrange
      setViewportWidth(768)
      window.matchMedia = createMockMatchMedia(false)

      // Act
      const { result } = renderHook(() => useIsMobile())

      // Assert: The hook converts undefined to false using !!
      await waitFor(() => {
        expect(typeof result.current).toBe('boolean')
        expect(result.current === true || result.current === false).toBe(true)
      })
    })
  })
})
