import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MAX_TERMINAL_HISTORY } from './terminalCommands'
import { useTerminalSession } from './useTerminalSession'

describe('useTerminalSession', () => {
  it('caps terminal history at MAX_TERMINAL_HISTORY entries and supports clear', () => {
    const onNavigate = vi.fn()
    const { result } = renderHook(() => useTerminalSession(onNavigate))

    act(() => {
      for (let i = 1; i <= MAX_TERMINAL_HISTORY + 5; i += 1) {
        result.current.executeCommand(`cmd-${i}`)
      }
    })

    expect(result.current.history).toHaveLength(MAX_TERMINAL_HISTORY)
    expect(result.current.history[0]?.command).toBe('cmd-6')
    expect(result.current.history[MAX_TERMINAL_HISTORY - 1]?.command).toBe(`cmd-${MAX_TERMINAL_HISTORY + 5}`)

    act(() => {
      result.current.executeCommand('clear')
    })

    expect(result.current.history).toHaveLength(0)
    expect(result.current.initialBannerCleared).toBe(true)
  })

  it('cycles through command history with ArrowUp/ArrowDown and autocompletes on Tab', () => {
    const onNavigate = vi.fn()
    const { result } = renderHook(() => useTerminalSession(onNavigate))

    act(() => {
      result.current.executeCommand('ls')
      result.current.executeCommand('pwd')
    })

    const preventDefault = vi.fn()
    act(() => {
      result.current.handleInputKeyDown({ key: 'ArrowUp', preventDefault })
    })
    expect(result.current.commandInput).toBe('pwd')

    act(() => {
      result.current.handleInputKeyDown({ key: 'ArrowUp', preventDefault })
    })
    expect(result.current.commandInput).toBe('ls')

    act(() => {
      result.current.handleInputKeyDown({ key: 'ArrowDown', preventDefault })
    })
    expect(result.current.commandInput).toBe('pwd')

    act(() => {
      result.current.handleInputKeyDown({ key: 'ArrowDown', preventDefault })
    })
    expect(result.current.commandInput).toBe('')

    act(() => {
      result.current.setCommandInput('cd pr')
    })
    act(() => {
      result.current.handleInputKeyDown({ key: 'Tab', preventDefault })
    })
    expect(result.current.commandInput).toBe('cd projects')
  })
})
