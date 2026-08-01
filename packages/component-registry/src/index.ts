import {
  componentRegistryManifestSchema,
  type ComponentMatchResult,
  type ComponentRegistryManifest,
  type DesignDocument,
  type GenerationDiagnostic,
  type RegisteredComponent
} from '@forge-ui/contracts'
import { walkDesignNodes } from '@forge-ui/design-ir'

const reservedBindingNames = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield'
])

function isSafeBindingIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) && !reservedBindingNames.has(value)
}

function isSafeJsxAttributeName(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) || /^(?:aria|data)-[a-z][a-z0-9-]*$/.test(value)
}

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
  const componentIds = new Set<string>()
  const defaultBindingsByPath = new Map<string, string>()
  const bindingOwners = new Map<string, { path: string; style: 'named' | 'default' }>()

  for (const component of manifest.components) {
    if (componentIds.has(component.id)) {
      diagnostics.push({
        code: 'REGISTRY_DUPLICATE_COMPONENT_ID',
        stage: 'registry',
        severity: 'error',
        message: `Component ID ${component.id} is registered more than once.`,
        blocking: true,
        suggestedActions: ['Keep each component ID unique inside one Registry version.']
      })
    }
    componentIds.add(component.id)

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

    if (!isSafeBindingIdentifier(component.import.exportName)) {
      diagnostics.push({
        code: 'REGISTRY_EXPORT_NAME_INVALID',
        stage: 'registry',
        severity: 'error',
        message: `${component.displayName} export ${component.import.exportName} is not a valid JavaScript identifier.`,
        blocking: true,
        suggestedActions: ['Use a non-reserved JavaScript binding identifier.']
      })
    }

    const bindingOwner = bindingOwners.get(component.import.exportName)
    if (
      bindingOwner &&
      (bindingOwner.path !== component.import.path || bindingOwner.style !== component.import.style)
    ) {
      diagnostics.push({
        code: 'REGISTRY_IMPORT_BINDING_COLLISION',
        stage: 'registry',
        severity: 'error',
        message: `${component.import.path} reuses local binding ${component.import.exportName} already declared by ${bindingOwner.path}.`,
        blocking: true,
        suggestedActions: [
          'Use unique export binding names or add alias support before registration.'
        ]
      })
    } else {
      bindingOwners.set(component.import.exportName, {
        path: component.import.path,
        style: component.import.style
      })
    }

    if (component.import.style === 'default') {
      const existingBinding = defaultBindingsByPath.get(component.import.path)
      if (existingBinding && existingBinding !== component.import.exportName) {
        diagnostics.push({
          code: 'REGISTRY_DEFAULT_IMPORT_CONFLICT',
          stage: 'registry',
          severity: 'error',
          message: `${component.import.path} declares conflicting default bindings ${existingBinding} and ${component.import.exportName}.`,
          blocking: true,
          suggestedActions: ['Keep one default binding name per module path.']
        })
      } else {
        defaultBindingsByPath.set(component.import.path, component.import.exportName)
      }
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

    const propNames = new Set<string>()
    for (const definition of component.props) {
      if (!isSafeJsxAttributeName(definition.name)) {
        diagnostics.push({
          code: 'REGISTRY_PROP_NAME_INVALID',
          stage: 'registry',
          severity: 'error',
          message: `${component.displayName}.${definition.name} is not a safe JSX attribute name.`,
          blocking: true,
          suggestedActions: ['Use a JavaScript identifier or a lowercase aria-/data- attribute.']
        })
      }

      if (propNames.has(definition.name)) {
        diagnostics.push({
          code: 'REGISTRY_DUPLICATE_PROP',
          stage: 'registry',
          severity: 'error',
          message: `${component.displayName} declares prop ${definition.name} more than once.`,
          blocking: true,
          suggestedActions: ['Keep each prop definition unique inside one component.']
        })
      }
      propNames.add(definition.name)

      if (definition.type === 'enum' && (!definition.values || definition.values.length === 0)) {
        diagnostics.push({
          code: 'REGISTRY_ENUM_VALUES_REQUIRED',
          stage: 'registry',
          severity: 'error',
          message: `${component.displayName}.${definition.name} is an enum without allowed values.`,
          blocking: true,
          suggestedActions: ['Declare at least one allowed enum value.']
        })
      }
    }
  }

  if (diagnostics.length > 0) {
    throw new RegistryError(diagnostics)
  }

  return manifest
}

function propIncompatibilities(
  component: RegisteredComponent,
  props: Record<string, unknown>
): string[] {
  const incompatibilities = component.props
    .filter((definition) => definition.required && props[definition.name] === undefined)
    .map((definition) => `Missing required prop: ${definition.name}.`)

  const definitions = new Map(component.props.map((definition) => [definition.name, definition]))
  const unknownProps = Object.keys(props)
    .filter((name) => !definitions.has(name))
    .sort()

  if (unknownProps.length > 0) {
    incompatibilities.push(`Unknown props: ${unknownProps.join(', ')}.`)
  }

  for (const definition of component.props) {
    const value = props[definition.name]
    if (value === undefined) continue

    if (definition.type === 'enum') {
      if (!definition.values?.some((allowedValue) => Object.is(allowedValue, value))) {
        incompatibilities.push(
          `Prop ${definition.name} must be one of ${definition.values?.map(String).join(', ') ?? 'no declared values'}.`
        )
      }
      continue
    }

    const typeMatches =
      typeof value === definition.type &&
      (definition.type !== 'number' || (typeof value === 'number' && Number.isFinite(value)))

    if (!typeMatches) {
      incompatibilities.push(
        `Prop ${definition.name} expected ${definition.type} but received ${
          typeof value === 'number' && !Number.isFinite(value) ? 'non-finite number' : typeof value
        }.`
      )
    }
  }

  return incompatibilities
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

      const incompatibilities = propIncompatibilities(component, node.component?.props ?? {})
      if (incompatibilities.length > 0) {
        return {
          nodeId: node.id,
          componentId: component.id,
          strategy: 'manual-review',
          confidence: 'low',
          reasons: [`Source Key matched ${component.displayName}.`],
          incompatibilities,
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
