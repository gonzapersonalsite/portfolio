import fs from 'node:fs'
import path from 'node:path'

// What eslint-plugin-fsd-lint 1.2.1 does not read, held by a rule of this repository:
// none of its rules visits a re-export (export … from), and its forbidden-imports rule
// does not visit a dynamic import(). This rule holds the same boundaries over them, the
// way fsd-lint holds them over an import, and goes away when fsd-lint reads them.

// The public API of a slice: its folder, or its index file, named as fsd-lint names it:
// bare or with .ts, .tsx, .js or .jsx (TypeScript resolves an index.js to the index.ts).
const PUBLIC_INDEX = /^index(\.[jt]sx?)?$/
const isPublicApi = (inside) => inside.length === 0 || (inside.length === 1 && PUBLIC_INDEX.test(inside[0]))

/**
 * Where a path of src/, relative to it and with '/' separators, falls: its layer, its
 * slice when the layer has slices, and the segments below them; null outside the layers.
 */
function placeOf(srcPath, { layers, slicedLayers }) {
  const [layer, ...below] = srcPath.split('/')
  if (!layers.includes(layer)) return null
  if (!slicedLayers.includes(layer)) return { layer, slice: null, inside: below }
  const [slice, ...inside] = below
  return { layer, slice, inside }
}

/**
 * A path with its links and junctions resolved, through its nearest folder that exists
 * when it does not (a file linted from text need not exist).
 */
function realPathOf(file) {
  if (fs.existsSync(file)) return fs.realpathSync(file)
  const folder = path.dirname(file)
  return folder === file ? file : path.join(realPathOf(folder), path.basename(file))
}

const boundaries = {
  meta: {
    type: 'problem',
    docs: { description: 'The boundaries of Feature-Sliced Design over what fsd-lint 1.2.1 does not read.' },
    schema: [
      {
        type: 'object',
        properties: {
          root: { type: 'string', description: 'The absolute path of src/.' },
          alias: { type: 'string', description: "The prefix that stands for src/ in an import, such as '@/'." },
          layers: { type: 'array', items: { type: 'string' }, description: 'The layers, from the top down.' },
          slicedLayers: { type: 'array', items: { type: 'string' }, description: 'The layers split into slices.' },
        },
        required: ['root', 'alias', 'layers', 'slicedLayers'],
        additionalProperties: false,
      },
    ],
    messages: {
      reExportFromAbove:
        "{{layer}} cannot re-export '{{specifier}}', a layer above it: move what both need down to a lower layer.",
      reExportFromSibling:
        "A slice of {{layer}} cannot re-export '{{specifier}}', a sibling slice: move what both need down to a lower layer, or compose the two slices in the layer above.",
      reExportPastPublicApi:
        "'{{specifier}}' enters a slice past its index.ts: export what is needed from that index and re-export the slice itself.",
      reExportOutOfSlice:
        "'{{specifier}}' leaves its slice by a relative path: re-export it through the alias and the public API of its slice.",
      dynamicImportFromAbove:
        "{{layer}} cannot import '{{specifier}}', a layer above it, not even with import(): move what both need down to a lower layer, or pass it down from above.",
    },
  },
  create(context) {
    const options = context.options[0]
    // Node loads eslint.config.js, and so root, by its real path, and ESLint names a file by
    // the path it reached it by: both real, or a project reached through a link or a
    // junction would fall outside root and go unchecked.
    const root = realPathOf(options.root)
    const file = realPathOf(context.filename)
    // Where a full path falls in src/; null outside it and its layers.
    const placeOfPath = (fullPath) => placeOf(path.relative(root, fullPath).split(path.sep).join('/'), options)
    const from = placeOfPath(file)
    if (from === null) return {}
    const rank = (place) => options.layers.indexOf(place.layer)

    // The place a specifier names, and whether it names it by a relative path; null for a package.
    // Both paths are resolved as TypeScript resolves them: '@/./app', '@//app', '@/app/',
    // '@/shared/../app' and '@/../src/app' all name app.
    function targetOf(specifier) {
      if (specifier.startsWith('.')) {
        return { relative: true, to: placeOfPath(path.join(path.dirname(file), specifier)) }
      }
      if (specifier.startsWith(options.alias)) {
        return { relative: false, to: placeOfPath(path.join(root, specifier.slice(options.alias.length))) }
      }
      return null
    }
    const isAbove = (to) => to !== null && rank(to) < rank(from)
    const isSibling = (to) => to !== null && to.layer === from.layer && to.slice !== from.slice
    const isOwnSlice = (to) => to !== null && to.layer === from.layer && to.slice === from.slice
    // app and shared have no slices: shared is entered by segment, by convention.
    const isPastPublicApi = (to) => to !== null && to.slice !== null && !isOwnSlice(to) && !isPublicApi(to.inside)
    const report = (node, messageId, specifier) =>
      context.report({ node, messageId, data: { layer: from.layer, specifier } })

    function checkReExport(node) {
      const specifier = node.source.value
      const target = targetOf(specifier)
      if (target === null) return
      const { relative, to } = target
      if (isAbove(to)) report(node, 'reExportFromAbove', specifier)
      if (isSibling(to)) report(node, 'reExportFromSibling', specifier)
      // A relative path is judged by whether it leaves the slice, as fsd-lint judges a relative import.
      if (!relative && isPastPublicApi(to)) report(node, 'reExportPastPublicApi', specifier)
      if (relative && !isOwnSlice(to)) report(node, 'reExportOutOfSlice', specifier)
    }

    return {
      ExportAllDeclaration: checkReExport,
      ExportNamedDeclaration(node) {
        if (node.source !== null) checkReExport(node)
      },
      ImportExpression(node) {
        const specifier = node.source.value
        // Only a path written as a string literal is read, as every rule of the lint reads one: a template
        // literal, even with nothing to fill in, or a variable is left to convention, and so is a type that
        // imports (typeof import('…')), which reaches no visitor here.
        if (typeof specifier !== 'string') return
        const target = targetOf(specifier)
        if (target !== null && isAbove(target.to)) report(node, 'dynamicImportFromAbove', specifier)
      },
    }
  },
}

export default { meta: { name: 'fsd-gaps' }, rules: { boundaries } }
