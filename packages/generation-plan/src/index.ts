import {
  GENERATOR_VERSION,
  type ComponentMatchResult,
  type ComponentRegistryManifest,
  type DesignDocument,
  type DesignNode,
  type GenerationDiagnostic,
  type GenerationPlan,
  type HeroActionPlan,
  type RegisteredComponent
} from '@forge-ui/contracts'
import { findNodeBySemantic, walkDesignNodes } from '@forge-ui/design-ir'
import { stableHash, stableStringify } from '@forge-ui/shared'

export class GenerationPlanError extends Error {
  constructor(readonly diagnostics: GenerationDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join('; '))
    this.name = 'GenerationPlanError'
  }
}

function textForSemantic(hero: DesignNode, semantic: string): string {
  const node = findNodeBySemantic(hero, semantic)
  return node?.content?.kind === 'text' ? node.content.value : ''
}

function componentForMatch(
  match: ComponentMatchResult,
  registry: ComponentRegistryManifest
): RegisteredComponent | undefined {
  return registry.components.find((component) => component.id === match.componentId)
}

export function createGenerationPlan(
  document: DesignDocument,
  registry: ComponentRegistryManifest,
  matches: ComponentMatchResult[]
): GenerationPlan {
  const heroes = walkDesignNodes(document.root).filter((node) => node.semantic === 'hero')
  if (heroes.length === 0) {
    throw new GenerationPlanError([
      {
        code: 'HERO_SECTION_REQUIRED',
        stage: 'generation-plan',
        severity: 'error',
        message: 'Phase 1 requires one section with semantic "hero".',
        blocking: true,
        suggestedActions: ['Add a Hero section or use the AI SaaS preset.']
      }
    ])
  }

  if (heroes.length > 1) {
    throw new GenerationPlanError([
      {
        code: 'HERO_SECTION_AMBIGUOUS',
        stage: 'generation-plan',
        severity: 'error',
        message: 'Phase 1 requires exactly one section with semantic "hero".',
        blocking: true,
        suggestedActions: ['Keep one Hero section and rename the remaining semantics.']
      }
    ])
  }

  const hero = heroes[0]!

  const heroNodeIds = new Set(walkDesignNodes(hero).map((node) => node.id))
  const exactMatches = matches.filter(
    (match) => match.strategy === 'exact-component' && heroNodeIds.has(match.nodeId)
  )
  const nodeById = new Map(walkDesignNodes(hero).map((node) => [node.id, node]))
  const imports = new Map<string, { defaultName?: string; names: Set<string> }>()
  const actions: HeroActionPlan[] = []
  let visual: GenerationPlan['hero']['visual']

  for (const match of exactMatches) {
    const component = componentForMatch(match, registry)
    const node = nodeById.get(match.nodeId)
    if (!component || !node) continue

    const importEntry = imports.get(component.import.path) ?? { names: new Set<string>() }
    if (component.import.style === 'default') {
      importEntry.defaultName = component.import.exportName
    } else {
      importEntry.names.add(component.import.exportName)
    }
    imports.set(component.import.path, importEntry)

    if (component.capabilities.includes('action')) {
      actions.push({
        nodeId: node.id,
        label: node.content?.kind === 'text' ? node.content.value : component.displayName,
        exportName: component.import.exportName,
        importPath: component.import.path,
        props: node.component?.props ?? {}
      })
    }

    if (component.capabilities.includes('visual')) {
      visual = {
        nodeId: node.id,
        exportName: component.import.exportName,
        importPath: component.import.path
      }
    }
  }

  const diagnostics: GenerationDiagnostic[] = matches
    .filter((match) => match.strategy === 'manual-review')
    .map((match) => ({
      code: 'COMPONENT_MANUAL_REVIEW',
      stage: 'generation-plan',
      severity: 'warning',
      message: `Node ${match.nodeId} requires manual component review.`,
      nodeId: match.nodeId,
      blocking: false,
      suggestedActions: ['Select a registered component or a safe native fallback.']
    }))

  const sourceHash = stableHash(stableStringify(document))

  return {
    schemaVersion: '1.0',
    generationId: `generation_${stableHash(
      `${sourceHash}:${registry.registryId}:${registry.registryVersion}:${GENERATOR_VERSION}`
    )}`,
    sourceHash,
    versions: {
      inputSchema: '1.0',
      registry: registry.registryVersion,
      generator: GENERATOR_VERSION
    },
    page: {
      title:
        typeof document.metadata.title === 'string'
          ? document.metadata.title
          : 'ForgeUI Generated Page',
      description:
        typeof document.metadata.description === 'string' ? document.metadata.description : '',
      rootNodeId: document.root.id
    },
    imports: [...imports.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([path, entry]) => ({
        path,
        ...(entry.defaultName ? { defaultName: entry.defaultName } : {}),
        names: [...entry.names].sort()
      })),
    hero: {
      id: hero.id,
      eyebrow: textForSemantic(hero, 'hero-eyebrow'),
      title: textForSemantic(hero, 'hero-title'),
      description: textForSemantic(hero, 'hero-description'),
      actions: actions.sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
      ...(visual ? { visual } : {})
    },
    diagnostics
  }
}
