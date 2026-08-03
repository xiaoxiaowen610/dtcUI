import { generate } from '@babel/generator'
import * as t from '@babel/types'
import {
  ENGINE_VERSION,
  GENERATOR_VERSION,
  type ComponentMatchResult,
  type ComponentRegistryManifest,
  type GeneratedFile,
  type GeneratedProject,
  type GenerationDiagnostic,
  type GenerationPlan
} from '@forge-ui/contracts'
import { stableHash, stableStringify } from '@forge-ui/shared'

interface GenerateProjectOptions {
  createdAt?: string
  nodeCount: number
  matches: ComponentMatchResult[]
}

function expressionText(value: string): t.JSXExpressionContainer {
  return t.jsxExpressionContainer(t.stringLiteral(value))
}

function jsxAttribute(name: string, value: unknown): t.JSXAttribute | undefined {
  const attributeName = t.jsxIdentifier(name)

  if (typeof value === 'string') {
    return t.jsxAttribute(attributeName, t.stringLiteral(value))
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return t.jsxAttribute(attributeName, t.jsxExpressionContainer(t.valueToNode(value)))
  }

  return undefined
}

function stylesAttribute(name: string): t.JSXAttribute {
  return t.jsxAttribute(
    t.jsxIdentifier('className'),
    t.jsxExpressionContainer(t.memberExpression(t.identifier('styles'), t.identifier(name)))
  )
}

function element(
  name: string,
  attributes: Array<t.JSXAttribute | undefined>,
  children: Array<t.JSXText | t.JSXExpressionContainer | t.JSXElement>,
  selfClosing = false
): t.JSXElement {
  const filteredAttributes = attributes.filter(
    (attribute): attribute is t.JSXAttribute => attribute !== undefined
  )
  const identifier = t.jsxIdentifier(name)

  return t.jsxElement(
    t.jsxOpeningElement(identifier, filteredAttributes, selfClosing),
    selfClosing ? null : t.jsxClosingElement(identifier),
    selfClosing ? [] : children,
    selfClosing
  )
}

function buildHeroProgram(plan: GenerationPlan): t.File {
  const registryImports = plan.imports.map((entry) =>
    t.importDeclaration(
      [
        ...(entry.defaultName ? [t.importDefaultSpecifier(t.identifier(entry.defaultName))] : []),
        ...entry.names.map((name) => t.importSpecifier(t.identifier(name), t.identifier(name)))
      ],
      t.stringLiteral(entry.path)
    )
  )

  const styleImport = t.importDeclaration(
    [t.importDefaultSpecifier(t.identifier('styles'))],
    t.stringLiteral('./Hero.module.css')
  )

  const actionElements = plan.hero.actions.map((action) =>
    element(
      action.exportName,
      [
        jsxAttribute('data-forge-node-id', action.nodeId),
        ...Object.entries(action.props)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, value]) => jsxAttribute(name, value))
      ],
      [expressionText(action.label)]
    )
  )

  const copy = element(
    'div',
    [stylesAttribute('copy')],
    [
      element('p', [stylesAttribute('eyebrow')], [expressionText(plan.hero.eyebrow)]),
      element('h1', [stylesAttribute('title')], [expressionText(plan.hero.title)]),
      element('p', [stylesAttribute('description')], [expressionText(plan.hero.description)]),
      element('div', [stylesAttribute('actions')], actionElements)
    ]
  )

  const visual = plan.hero.visual
    ? element(
        'div',
        [stylesAttribute('visual')],
        [
          element(
            plan.hero.visual.exportName,
            [jsxAttribute('data-forge-node-id', plan.hero.visual.nodeId)],
            [],
            true
          )
        ]
      )
    : element('div', [stylesAttribute('visualPlaceholder'), jsxAttribute('aria-hidden', true)], [])

  const heroElement = element(
    'section',
    [jsxAttribute('data-forge-node-id', plan.hero.id), stylesAttribute('hero')],
    [element('div', [stylesAttribute('shell')], [copy, visual])]
  )

  const heroFunction = t.exportNamedDeclaration(
    t.functionDeclaration(
      t.identifier('Hero'),
      [],
      t.blockStatement([t.returnStatement(heroElement)])
    )
  )

  return t.file(t.program([...registryImports, styleImport, heroFunction]))
}

function printTsx(file: t.File): string {
  return `${
    generate(file, {
      comments: false,
      jsescOption: { minimal: true },
      retainLines: false
    }).code
  }\n`
}

function file(path: string, language: GeneratedFile['language'], content: string): GeneratedFile {
  return { path, language, content, contentHash: stableHash(content) }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function tokensCss(plan: GenerationPlan): string {
  const declarations = plan.tokenResolution.tokens
    .map((token) => `  ${token.cssVariable}: ${token.cssValue};`)
    .join('\n')
  return `:root {
${declarations}
  --forge-generation: "${plan.generationId}";
}
`
}

const heroCss = `.hero {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  padding: var(--space-section-block) var(--space-page-inline);
  background:
    radial-gradient(circle at 75% 15%, color-mix(in srgb, var(--color-brand-primary) 28%, transparent), transparent 35%),
    var(--color-surface-canvas);
}

.shell {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(22rem, 1.08fr);
  align-items: center;
  gap: clamp(3rem, 7vw, 7rem);
  width: min(100%, 80rem);
  min-height: calc(100vh - (2 * var(--space-section-block)));
  margin: 0 auto;
}

.copy {
  position: relative;
  z-index: 1;
}

.eyebrow {
  margin: 0 0 1.25rem;
  color: var(--color-brand-secondary);
  font-size: 0.78rem;
  font-weight: 750;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.title {
  max-width: 12ch;
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(3rem, 7vw, 6.8rem);
  line-height: 0.94;
  letter-spacing: -0.065em;
}

.description {
  max-width: 38rem;
  margin: 1.75rem 0 0;
  color: var(--color-text-secondary);
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  line-height: 1.75;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.875rem;
  margin-top: 2.25rem;
}

.visual {
  filter: drop-shadow(var(--shadow-glow));
}

.visualPlaceholder {
  min-height: 28rem;
  border: 1px dashed var(--color-border-subtle);
  border-radius: var(--radius-card);
}

@media (max-width: 800px) {
  .shell {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .title {
    max-width: 10ch;
  }
}
`

const globalCss = `* {
  box-sizing: border-box;
}

html {
  color-scheme: dark;
  background: var(--color-surface-canvas);
}

body {
  margin: 0;
  min-width: 320px;
  font-family: var(--font-sans);
  background: var(--color-surface-canvas);
}

button,
a {
  font: inherit;
}

:focus-visible {
  outline: 3px solid var(--color-brand-secondary);
  outline-offset: 3px;
}
`

function landingPageSource(): string {
  return `import { Hero } from './sections/Hero'

export default function LandingPage() {
  return (
    <main>
      <Hero />
    </main>
  )
}
`
}

function mainSource(): string {
  return `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LandingPage from './LandingPage'
import './tokens.css'
import './global.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing #root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <LandingPage />
  </StrictMode>
)
`
}

function viteConfigSource(): string {
  return `import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@forge-ui/example-external-ui': fileURLToPath(
        new URL('../../packages/example-external-ui/src/index.tsx', import.meta.url)
      )
    }
  }
})
`
}

export function generateProject(
  plan: GenerationPlan,
  registry: ComponentRegistryManifest,
  options: GenerateProjectOptions
): GeneratedProject {
  const createdAt = options.createdAt ?? new Date().toISOString()
  const exact = options.matches.filter((match) => match.strategy === 'exact-component').length
  const manual = options.matches.filter((match) => match.strategy === 'manual-review').length
  const diagnostics: GenerationDiagnostic[] = [
    ...plan.diagnostics,
    {
      code: 'RUNTIME_VALIDATION_NOT_IMPLEMENTED',
      stage: 'validation',
      severity: 'info',
      message: 'Runtime and visual validation are intentionally deferred beyond Phase 1.',
      blocking: false,
      suggestedActions: ['Run pnpm validate:flagship for TypeScript and Vite build validation.']
    }
  ]

  const manifest = {
    generationId: plan.generationId,
    createdAt,
    inputHash: plan.sourceHash,
    engineVersion: ENGINE_VERSION,
    generatorVersion: GENERATOR_VERSION,
    registry: { id: registry.registryId, version: registry.registryVersion },
    schemaVersions: {
      input: '1.0',
      registry: '1.0',
      generationPlan: '1.0'
    },
    dependencies: {
      '@forge-ui/example-external-ui': registry.package.version,
      react: '19.2.8',
      'react-dom': '19.2.8'
    },
    outputMode: 'standalone' as const
  }

  const report = {
    metadata: { generationId: plan.generationId, inputHash: plan.sourceHash },
    nodes: {
      total: options.nodeCount,
      eligibleForComponentMatch: options.matches.length
    },
    matches: {
      exact,
      adapted: 0,
      recipes: 0,
      native: 0,
      manual
    },
    tokens: plan.tokenResolution.summary,
    validation: {
      schema: 'passed' as const,
      typescript: 'pending' as const,
      build: 'pending' as const,
      runtime: 'skipped' as const,
      visual: 'skipped' as const
    },
    diagnostics
  }

  const generatedFiles: GeneratedFile[] = [
    file(
      'package.json',
      'json',
      `${stableStringify(
        {
          name: 'forge-ui-generated-flagship',
          version: '0.0.0',
          private: true,
          type: 'module',
          scripts: { build: 'vite build', typecheck: 'tsc --noEmit' },
          dependencies: {
            '@forge-ui/example-external-ui': '0.1.0',
            react: '19.2.8',
            'react-dom': '19.2.8'
          },
          devDependencies: {
            '@types/react': '19.2.18',
            '@types/react-dom': '19.2.4',
            '@vitejs/plugin-react': '6.0.5',
            typescript: '7.0.2',
            vite: '8.2.0'
          }
        },
        2
      )}\n`
    ),
    file(
      'tsconfig.json',
      'json',
      `${stableStringify(
        {
          compilerOptions: {
            target: 'ES2022',
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            moduleResolution: 'Bundler',
            jsx: 'react-jsx',
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            paths: {
              '@forge-ui/example-external-ui': ['../../packages/example-external-ui/src/index.tsx']
            },
            types: ['vite/client']
          },
          include: ['src', 'vite.config.ts']
        },
        2
      )}\n`
    ),
    file('vite.config.ts', 'typescript', viteConfigSource()),
    file(
      'index.html',
      'html',
      `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <meta name="description" content="${escapeHtml(plan.page.description)}" />\n    <title>${escapeHtml(plan.page.title)}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`
    ),
    file('src/main.tsx', 'tsx', mainSource()),
    file('src/LandingPage.tsx', 'tsx', landingPageSource()),
    file('src/sections/Hero.tsx', 'tsx', printTsx(buildHeroProgram(plan))),
    file('src/sections/Hero.module.css', 'css', heroCss),
    file('src/tokens.css', 'css', tokensCss(plan)),
    file('src/global.css', 'css', globalCss),
    file('generation-manifest.json', 'json', `${stableStringify(manifest, 2)}\n`),
    file('generation-report.json', 'json', `${stableStringify(report, 2)}\n`)
  ].sort((left, right) => left.path.localeCompare(right.path))

  return { files: generatedFiles, manifest, report, diagnostics }
}
