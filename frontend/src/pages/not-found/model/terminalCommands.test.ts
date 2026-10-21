import { describe, expect, it } from 'vitest'
import { MAX_COMMAND_LENGTH, autocompleteTerminalCommand, resolveTerminalCommand } from './terminalCommands'

describe('resolveTerminalCommand', () => {
  it('returns noop for empty or whitespace-only input', () => {
    expect(resolveTerminalCommand('')).toEqual({ kind: 'noop' })
    expect(resolveTerminalCommand('   ')).toEqual({ kind: 'noop' })
  })

  it('resolves clear, cls, and reset to the clear action', () => {
    expect(resolveTerminalCommand('clear')).toEqual({ kind: 'clear' })
    expect(resolveTerminalCommand('CLS')).toEqual({ kind: 'clear' })
    expect(resolveTerminalCommand('reset')).toEqual({ kind: 'clear' })
  })

  it('resolves inspection commands (help, ?, ls, pwd, whoami)', () => {
    expect(resolveTerminalCommand('help')).toEqual({ kind: 'output', outputType: 'help' })
    expect(resolveTerminalCommand('?')).toEqual({ kind: 'output', outputType: 'help' })
    expect(resolveTerminalCommand('--help')).toEqual({ kind: 'output', outputType: 'help' })
    expect(resolveTerminalCommand('ls -la')).toEqual({ kind: 'output', outputType: 'ls' })
    expect(resolveTerminalCommand('pwd')).toEqual({ kind: 'output', outputType: 'pwd' })
    expect(resolveTerminalCommand('whoami')).toEqual({ kind: 'output', outputType: 'whoami' })
  })

  it('resolves cd, open, goto, and direct route shortcuts to portfolio routes', () => {
    expect(resolveTerminalCommand('cd')).toEqual({ kind: 'navigate', routePath: '/' })
    expect(resolveTerminalCommand('cd ~')).toEqual({ kind: 'navigate', routePath: '/' })
    expect(resolveTerminalCommand('cd /')).toEqual({ kind: 'navigate', routePath: '/' })
    expect(resolveTerminalCommand('cd ..')).toEqual({ kind: 'navigate', routePath: '/' })
    expect(resolveTerminalCommand('home')).toEqual({ kind: 'navigate', routePath: '/' })
    expect(resolveTerminalCommand('inicio')).toEqual({ kind: 'navigate', routePath: '/' })
    expect(resolveTerminalCommand('cd projects')).toEqual({ kind: 'navigate', routePath: '/projects' })
    expect(resolveTerminalCommand('cd ~/projects/')).toEqual({ kind: 'navigate', routePath: '/projects' })
    expect(resolveTerminalCommand('cd home/projects')).toEqual({ kind: 'navigate', routePath: '/projects' })
    expect(resolveTerminalCommand('open projects')).toEqual({ kind: 'navigate', routePath: '/projects' })
    expect(resolveTerminalCommand('/projects')).toEqual({ kind: 'navigate', routePath: '/projects' })
    expect(resolveTerminalCommand('proyectos')).toEqual({ kind: 'navigate', routePath: '/projects' })
    expect(resolveTerminalCommand('cd about')).toEqual({ kind: 'navigate', routePath: '/about' })
    expect(resolveTerminalCommand('cd skills')).toEqual({ kind: 'navigate', routePath: '/skills' })
    expect(resolveTerminalCommand('cd experience')).toEqual({ kind: 'navigate', routePath: '/experience' })
    expect(resolveTerminalCommand('cd contact')).toEqual({ kind: 'navigate', routePath: '/contact' })
  })

  it('returns cdNotFound for unknown cd directories and unknown for unrecognized commands, bounding input length', () => {
    expect(resolveTerminalCommand('cd /nowhere')).toEqual({
      kind: 'output',
      outputType: 'cdNotFound',
      detail: '/nowhere',
    })
    expect(resolveTerminalCommand('sudo rm -rf /')).toEqual({
      kind: 'output',
      outputType: 'unknown',
      detail: 'sudo',
    })
    const overlong = 'x'.repeat(MAX_COMMAND_LENGTH + 40)
    expect(resolveTerminalCommand(overlong)).toEqual({
      kind: 'output',
      outputType: 'unknown',
      detail: 'x'.repeat(MAX_COMMAND_LENGTH),
    })
  })

  it('autocompletes partial commands and cd targets on Tab', () => {
    expect(autocompleteTerminalCommand('')).toBeNull()
    expect(autocompleteTerminalCommand('he')).toBe('help')
    expect(autocompleteTerminalCommand('help')).toBeNull()
    expect(autocompleteTerminalCommand('cd pr')).toBe('cd projects')
    expect(autocompleteTerminalCommand('cd ab')).toBe('cd about')
    expect(autocompleteTerminalCommand('unknown')).toBeNull()
  })
})
