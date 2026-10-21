import { useRef, useState } from 'react'
import {
  MAX_COMMAND_LENGTH,
  MAX_TERMINAL_HISTORY,
  autocompleteTerminalCommand,
  resolveTerminalCommand,
  type TerminalOutputType,
  type TerminalRoutePath,
} from './terminalCommands'

export interface TerminalHistoryEntry {
  readonly id: number
  readonly command: string
  readonly outputType: TerminalOutputType
  readonly detail?: string
}

export interface TerminalKeyEventLike {
  readonly key: string
  readonly preventDefault: () => void
}

export interface UseTerminalSessionResult {
  readonly commandInput: string
  readonly history: readonly TerminalHistoryEntry[]
  readonly initialBannerCleared: boolean
  readonly setCommandInput: (value: string) => void
  readonly executeCommand: (rawCommand: string) => void
  readonly handleInputKeyDown: (event: TerminalKeyEventLike) => void
}

export const useTerminalSession = (onNavigate: (routePath: TerminalRoutePath) => void): UseTerminalSessionResult => {
  const nextEntryId = useRef(1)
  const [commandInput, setCommandInputState] = useState('')
  const [history, setHistory] = useState<readonly TerminalHistoryEntry[]>([])
  const [commandHistory, setCommandHistory] = useState<readonly string[]>([])
  const [historyCursor, setHistoryCursor] = useState<number | null>(null)
  const [initialBannerCleared, setInitialBannerCleared] = useState(false)

  const setCommandInput = (value: string) => {
    setCommandInputState(value.slice(0, MAX_COMMAND_LENGTH))
  }

  const executeCommand = (rawCommand: string) => {
    const trimmed = rawCommand.slice(0, MAX_COMMAND_LENGTH).trim()
    if (trimmed.length > 0) {
      setCommandHistory((prev) => [...prev.slice(-(MAX_TERMINAL_HISTORY - 1)), trimmed])
    }
    setHistoryCursor(null)
    setCommandInputState('')

    const result = resolveTerminalCommand(trimmed)
    if (result.kind === 'noop') {
      return
    }
    if (result.kind === 'clear') {
      setHistory([])
      setInitialBannerCleared(true)
      return
    }
    if (result.kind === 'navigate') {
      onNavigate(result.routePath)
      return
    }

    const entryId = nextEntryId.current
    nextEntryId.current += 1
    setHistory((prev) => [
      ...prev.slice(-(MAX_TERMINAL_HISTORY - 1)),
      {
        id: entryId,
        command: trimmed,
        outputType: result.outputType,
        detail: result.detail,
      },
    ])
  }

  const handleInputKeyDown = (event: TerminalKeyEventLike) => {
    if (event.key === 'Tab') {
      const completed = autocompleteTerminalCommand(commandInput)
      if (completed !== null) {
        event.preventDefault()
        setCommandInputState(completed)
      }
      return
    }

    if (commandHistory.length === 0) return

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const nextIndex = historyCursor === null ? commandHistory.length - 1 : Math.max(0, historyCursor - 1)
      setHistoryCursor(nextIndex)
      setCommandInputState(commandHistory[nextIndex] ?? '')
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (historyCursor === null) return
      const nextIndex = historyCursor + 1
      if (nextIndex >= commandHistory.length) {
        setHistoryCursor(null)
        setCommandInputState('')
      } else {
        setHistoryCursor(nextIndex)
        setCommandInputState(commandHistory[nextIndex] ?? '')
      }
    }
  }

  return {
    commandInput,
    history,
    initialBannerCleared,
    setCommandInput,
    executeCommand,
    handleInputKeyDown,
  }
}
