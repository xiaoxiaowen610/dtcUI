import {
  componentRegistryManifestSchema,
  type ComponentMatchResult,
  type ComponentRegistryManifest,
  type DesignDocument,
  type GenerationDiagnostic,
  type RegisteredComponent
} from '@forge-ui/contracts'
import { walkDesignNodes } from '@forge-ui/design-ir'

export class RegistryError extends Error {
  constructor(readonly diagnostics: GenerationDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join('; '))
    this.name = 'RegistryError'
  }
}

export function validateRegistry(input: unknown): ComponentRegistryManifest {
  const parsed = componentRegistryManifestSchema.safeParse(input)
  if (!parsed.success) {
    throw new RegistryError([
      {
        code: 'REGISTRY_INVALID',
        stage: 'registry',
        severity: 'error',
        message: parsed.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
        blocking: true,
        suggestedActions: ['Fix the Registry Manifest and retry.']
      }
    ])
  }

  const manifest = parsed.data
  const diagnostics: GenerationDiagnostic[] = []
  const sourceKeys = new Set<string>()

  for (const component of manifest.components) {
    const importAllowed = manifest.package.allowedImportRoots.some(
      (root) => component.import.path === root || component.import.path.startsWith(`${root}/`)
    )

    if (!importAllowed) {
      diagnostics.push({
        code: 'REGISTRY_IMPORT_NOT_ALLOWED',
        stage: 'registry',
        severity: 'error',
        message: `${component.displayName} imports from non-allowlisted path ${component.import.path}.`,
        blocking: true,
        suggestedActions: ['Use a declared allowedImportRoots entry.']
      })
    }

    for (const sourceKey of component.sourceKeys ?? []) {
      if (sourceKeys.has(sourceKey)) {
        diagnostics.push({
          code: 'REGISTRY_DUPLICATE_SOURCE_KEY',
          stage: 'registry',
          severity: 'error',
          message: `Source key ${sourceKey} is registered more than once.`,
          blocking: true,
          suggestedActions: ['Keep each Source Key unique inside one Registry version.']
        })
      }
      sourceKeys.add(sourceKey)
    }
  }

  if (diagnostics.length > 0) {
    throw new RegistryError(diagnostics)
  }

  return manifest
}

function missingRequiredProps(
  component: RegisteredComponent,
  props: Record<string, unknown>
): string[] {
  return component.props
    .filter((definition) => definition.required && props[definition.name] === undefined)
    .map((definition) => definition.name)
}

export function matchComponents(
  document: DesignDocument,
  registry: ComponentRegistryManifest
): ComponentMatchResult[] {
  const componentsBySourceKey = new Map<string, RegisteredComponent>()
  for (const component of registry.components) {
    for (const key of component.sourceKeys ?? []) {
      componentsBySourceKey.set(key, component)
    }
  }

  return walkDesignNodes(document.root)
    .filter((node) => node.type === 'component')
    .map((node): ComponentMatchResult => {
      const sourceKey = node.component?.sourceKey
      const component = sourceKey ? componentsBySourceKey.get(sourceKey) : undefined

      if (!component) {
        return {
          nodeId: node.id,
          strategy: 'manual-review',
          confidence: 'low',
          reasons: sourceKey
            ? [`No component registered for ${sourceKey}.`]
            : ['No Source Key supplied.'],
          incompatibilities: [],
          warnings: ['Phase 1 does not perform semantic candidate scoring.']
        }
      }

      const missing = missingRequiredProps(component, node.component?.props ?? {})
      if (missing.length > 0) {
        return {
          nodeId: node.id,
          componentId: component.id,
          strategy: 'manual-review',
          confidence: 'low',
          reasons: [`Source Key matched ${component.displayName}.`],
          incompatibilities: [`Missing required props: ${missing.join(', ')}.`],
          warnings: []
        }
      }

      return {
        nodeId: node.id,
        componentId: component.id,
        strategy: 'exact-component',
        confidence: 'high',
        reasons: [`Source Key ${sourceKey} exactly matched ${component.displayName}.`],
        incompatibilities: [],
        warnings: []
      }
    })
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId))
}
