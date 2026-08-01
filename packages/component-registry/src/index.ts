import {
  componentRegistryManifestSchema,
  type CompositionRecipe,
  type ComponentMatchResult,
  type ComponentRegistryManifest,
  type DesignDocument,
  type DesignNode,
  type GenerationDiagnostic,
  type PropAdapter,
  type RegisteredComponent,
  type TokenResolution
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

function isSafeImportPath(value: string): boolean {
  return (
    !value.includes('\\') &&
    !value.includes('\0') &&
    value.split('/').every((segment) => segment !== '.' && segment !== '..')
  )
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

    if (!importAllowed || !isSafeImportPath(component.import.path)) {
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

    const slotNames = new Set<string>()
    for (const slot of component.slots ?? []) {
      if (slotNames.has(slot.name)) {
        diagnostics.push({
          code: 'REGISTRY_DUPLICATE_SLOT',
          stage: 'registry',
          severity: 'error',
          message: `${component.displayName} declares slot ${slot.name} more than once.`,
          blocking: true,
          suggestedActions: ['Keep each slot name unique inside one component.']
        })
      }
      slotNames.add(slot.name)
    }

    const requiredTokens = new Set<string>()
    for (const path of component.requiredTokens ?? []) {
      if (requiredTokens.has(path)) {
        diagnostics.push({
          code: 'REGISTRY_DUPLICATE_REQUIRED_TOKEN',
          stage: 'registry',
          severity: 'error',
          message: `${component.displayName} requires token ${path} more than once.`,
          blocking: true,
          suggestedActions: ['Keep required token paths unique.']
        })
      }
      requiredTokens.add(path)
    }
  }

  const componentsById = new Map(manifest.components.map((component) => [component.id, component]))
  const adapterIds = new Set<string>()
  const adapterSemantics = new Set<string>()
  for (const adapter of manifest.adapters ?? []) {
    if (adapterIds.has(adapter.id)) {
      diagnostics.push({
        code: 'REGISTRY_DUPLICATE_ADAPTER_ID',
        stage: 'registry',
        severity: 'error',
        message: `Adapter ID ${adapter.id} is registered more than once.`,
        blocking: true,
        suggestedActions: ['Keep each Adapter ID unique inside one Registry version.']
      })
    }
    adapterIds.add(adapter.id)

    for (const semantic of adapter.semantics ?? []) {
      const normalized = semantic.toLowerCase()
      if (adapterSemantics.has(normalized)) {
        diagnostics.push({
          code: 'REGISTRY_ADAPTER_SEMANTIC_AMBIGUOUS',
          stage: 'registry',
          severity: 'error',
          message: `Adapter semantic ${semantic} is registered more than once.`,
          blocking: true,
          suggestedActions: ['Keep one deterministic Adapter per semantic.']
        })
      }
      adapterSemantics.add(normalized)
    }

    const target = componentsById.get(adapter.targetComponentId)
    if (!target) {
      diagnostics.push({
        code: 'REGISTRY_ADAPTER_TARGET_MISSING',
        stage: 'registry',
        severity: 'error',
        message: `Adapter ${adapter.id} targets unknown component ${adapter.targetComponentId}.`,
        blocking: true,
        suggestedActions: ['Register the target component or remove the Adapter.']
      })
      continue
    }

    for (const sourceKey of adapter.sourceKeys ?? []) {
      if (sourceKeys.has(sourceKey)) {
        diagnostics.push({
          code: 'REGISTRY_DUPLICATE_SOURCE_KEY',
          stage: 'registry',
          severity: 'error',
          message: `Source key ${sourceKey} is registered more than once.`,
          blocking: true,
          suggestedActions: ['Keep component and Adapter Source Keys unique.']
        })
      }
      sourceKeys.add(sourceKey)
    }

    const targetProps = new Map(target.props.map((definition) => [definition.name, definition]))
    const mappedTargets = new Set<string>()
    for (const targetName of Object.values(adapter.propMap)) {
      if (!targetProps.has(targetName)) {
        diagnostics.push({
          code: 'REGISTRY_ADAPTER_PROP_INVALID',
          stage: 'registry',
          severity: 'error',
          message: `Adapter ${adapter.id} maps to unknown prop ${targetName}.`,
          blocking: true,
          suggestedActions: ['Map only to props declared by the target component.']
        })
      }
      if (mappedTargets.has(targetName)) {
        diagnostics.push({
          code: 'REGISTRY_ADAPTER_PROP_COLLISION',
          stage: 'registry',
          severity: 'error',
          message: `Adapter ${adapter.id} maps multiple source props to ${targetName}.`,
          blocking: true,
          suggestedActions: ['Map at most one source prop to each target prop.']
        })
      }
      mappedTargets.add(targetName)
    }

    for (const [targetName, value] of Object.entries(adapter.defaults ?? {})) {
      const definition = targetProps.get(targetName)
      if (!definition) {
        diagnostics.push({
          code: 'REGISTRY_ADAPTER_DEFAULT_INVALID',
          stage: 'registry',
          severity: 'error',
          message: `Adapter ${adapter.id} supplies unknown default prop ${targetName}.`,
          blocking: true,
          suggestedActions: ['Declare defaults only for target component props.']
        })
      } else {
        const incompatibilities = propIncompatibilities(
          { ...target, props: [{ ...definition, required: false }] },
          { [targetName]: value }
        )
        if (incompatibilities.length > 0) {
          diagnostics.push({
            code: 'REGISTRY_ADAPTER_DEFAULT_INVALID',
            stage: 'registry',
            severity: 'error',
            message: `Adapter ${adapter.id} default for ${targetName} is incompatible.`,
            blocking: true,
            suggestedActions: incompatibilities
          })
        }
      }
    }

    for (const [sourceName, mapping] of Object.entries(adapter.enumMap ?? {})) {
      const targetName = adapter.propMap[sourceName] ?? sourceName
      const definition = targetProps.get(targetName)
      if (!definition || definition.type !== 'enum') {
        diagnostics.push({
          code: 'REGISTRY_ADAPTER_ENUM_INVALID',
          stage: 'registry',
          severity: 'error',
          message: `Adapter ${adapter.id} enum map ${sourceName} does not target an enum prop.`,
          blocking: true,
          suggestedActions: ['Map enum values only into a declared target enum prop.']
        })
        continue
      }

      for (const value of Object.values(mapping)) {
        if (!definition.values?.some((allowed) => Object.is(allowed, value))) {
          diagnostics.push({
            code: 'REGISTRY_ADAPTER_ENUM_INVALID',
            stage: 'registry',
            severity: 'error',
            message: `Adapter ${adapter.id} emits unsupported ${targetName} value ${String(value)}.`,
            blocking: true,
            suggestedActions: ['Use one of the target prop enum values.']
          })
        }
      }
    }
  }

  const recipeIds = new Set<string>()
  const recipeSemantics = new Set<string>()
  for (const recipe of manifest.recipes ?? []) {
    if (recipeIds.has(recipe.id)) {
      diagnostics.push({
        code: 'REGISTRY_DUPLICATE_RECIPE_ID',
        stage: 'registry',
        severity: 'error',
        message: `Recipe ID ${recipe.id} is registered more than once.`,
        blocking: true,
        suggestedActions: ['Keep each Recipe ID unique.']
      })
    }
    recipeIds.add(recipe.id)

    const memberIds = new Set<string>()
    for (const componentId of recipe.componentIds) {
      if (!componentsById.has(componentId)) {
        diagnostics.push({
          code: 'REGISTRY_RECIPE_MEMBER_MISSING',
          stage: 'registry',
          severity: 'error',
          message: `Recipe ${recipe.id} references unknown component ${componentId}.`,
          blocking: true,
          suggestedActions: ['Register every Recipe member component.']
        })
      }
      if (memberIds.has(componentId)) {
        diagnostics.push({
          code: 'REGISTRY_RECIPE_MEMBER_DUPLICATE',
          stage: 'registry',
          severity: 'error',
          message: `Recipe ${recipe.id} repeats component ${componentId}.`,
          blocking: true,
          suggestedActions: ['List each Recipe member once.']
        })
      }
      memberIds.add(componentId)
    }

    for (const semantic of recipe.semantics) {
      if (recipeSemantics.has(semantic)) {
        diagnostics.push({
          code: 'REGISTRY_RECIPE_SEMANTIC_AMBIGUOUS',
          stage: 'registry',
          severity: 'error',
          message: `Recipe semantic ${semantic} is registered more than once.`,
          blocking: true,
          suggestedActions: ['Keep one deterministic Recipe per semantic.']
        })
      }
      recipeSemantics.add(semantic)
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

function requiredCapabilities(node: DesignNode): Set<RegisteredComponent['capabilities'][number]> {
  const capabilities = new Set<RegisteredComponent['capabilities'][number]>()
  const semantic = node.semantic?.toLowerCase() ?? ''
  if (/(?:action|button|cta)/.test(semantic)) capabilities.add('action')
  if (semantic.includes('link')) capabilities.add('link')
  if (/(?:visual|preview|image|icon|logo)/.test(semantic)) capabilities.add('visual')
  if (node.responsive) capabilities.add('responsive')
  if (node.content) capabilities.add('content')
  if (node.children.length > 0) capabilities.add('children')
  return capabilities
}

function availableMaterial(
  node: DesignNode
): Set<'text' | 'icon' | 'image' | 'component' | 'node-list'> {
  const material = new Set<'text' | 'icon' | 'image' | 'component' | 'node-list'>()
  if (node.content?.kind === 'text') material.add('text')
  if (node.content?.kind === 'asset') material.add('image')
  if (node.children.some((child) => child.type === 'icon')) material.add('icon')
  if (node.children.some((child) => child.type === 'component')) material.add('component')
  if (node.children.length > 0) material.add('node-list')
  return material
}

function hardIncompatibilities(
  node: DesignNode,
  component: RegisteredComponent,
  props: Record<string, unknown>,
  tokenPaths: Set<string>
): string[] {
  const incompatibilities = propIncompatibilities(component, props)
  const capabilities = new Set(component.capabilities)

  for (const capability of requiredCapabilities(node)) {
    if (!capabilities.has(capability)) {
      incompatibilities.push(`Missing required capability: ${capability}.`)
    }
  }

  const material = availableMaterial(node)
  for (const slot of component.slots ?? []) {
    if (slot.required && !slot.accepts.some((accepted) => material.has(accepted))) {
      incompatibilities.push(`Required slot ${slot.name} cannot be satisfied.`)
    }
  }

  for (const tokenPath of component.requiredTokens ?? []) {
    if (!tokenPaths.has(tokenPath)) {
      incompatibilities.push(`Missing required token: ${tokenPath}.`)
    }
  }

  return incompatibilities
}

function applyAdapter(
  adapter: PropAdapter,
  props: Record<string, unknown>
): Record<string, unknown> {
  const adapted: Record<string, unknown> = { ...(adapter.defaults ?? {}) }

  for (const [sourceName, value] of Object.entries(props).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const targetName = adapter.propMap[sourceName] ?? sourceName
    const mappedValue = adapter.enumMap?.[sourceName]?.[String(value)] ?? value
    adapted[targetName] = mappedValue
  }

  return adapted
}

function semanticScore(node: DesignNode, component: RegisteredComponent): number {
  const semantic = node.semantic?.toLowerCase()
  if (!semantic) return 0
  if (component.semantics.some((candidate) => candidate.toLowerCase() === semantic)) return 35

  const nodeTerms = new Set(semantic.split(/[^a-z0-9]+/).filter(Boolean))
  const overlaps = component.semantics.some((candidate) =>
    candidate
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .some((term) => nodeTerms.has(term))
  )
  return overlaps ? 15 : 0
}

function candidateScore(node: DesignNode, component: RegisteredComponent): number {
  // Candidates reach scoring only after props, slots, capabilities, and tokens pass hard constraints.
  return semanticScore(node, component) + 25 + 20 + 15 + 5
}

function recipeForNode(
  node: DesignNode,
  recipes: CompositionRecipe[],
  componentsById: Map<string, RegisteredComponent>
): CompositionRecipe | undefined {
  const semantic = node.semantic?.toLowerCase()
  if (!semantic) return undefined

  return [...recipes]
    .filter((recipe) => recipe.semantics.some((candidate) => candidate.toLowerCase() === semantic))
    .filter((recipe) => {
      const capabilities = new Set(
        recipe.componentIds.flatMap((id) => componentsById.get(id)?.capabilities ?? [])
      )
      return (recipe.requiredCapabilities ?? []).every((capability) => capabilities.has(capability))
    })
    .sort((left, right) => left.id.localeCompare(right.id))[0]
}

const nativeBySemantic: Record<string, NonNullable<ComponentMatchResult['nativeElement']>> = {
  action: 'button',
  button: 'button',
  'primary-action': 'button',
  'secondary-action': 'button',
  link: 'a',
  heading: 'h2',
  title: 'h2',
  text: 'p',
  image: 'img',
  section: 'section'
}

export function matchComponents(
  document: DesignDocument,
  registry: ComponentRegistryManifest,
  tokenResolution?: TokenResolution
): ComponentMatchResult[] {
  const componentsBySourceKey = new Map<string, RegisteredComponent>()
  const componentsById = new Map(registry.components.map((component) => [component.id, component]))
  const adaptersBySourceKey = new Map<string, PropAdapter>()
  const adaptersBySemantic = new Map<string, PropAdapter>()
  const tokenPaths = new Set(
    tokenResolution?.tokens.map((token) => token.path) ?? document.tokens.map((token) => token.path)
  )
  for (const component of registry.components) {
    for (const key of component.sourceKeys ?? []) {
      componentsBySourceKey.set(key, component)
    }
  }
  for (const adapter of registry.adapters ?? []) {
    for (const key of adapter.sourceKeys ?? []) adaptersBySourceKey.set(key, adapter)
    for (const semantic of adapter.semantics ?? []) {
      adaptersBySemantic.set(semantic.toLowerCase(), adapter)
    }
  }

  return walkDesignNodes(document.root)
    .filter((node) => node.type === 'component')
    .map((node): ComponentMatchResult => {
      const sourceKey = node.component?.sourceKey
      const component = sourceKey ? componentsBySourceKey.get(sourceKey) : undefined
      const props = node.component?.props ?? {}

      if (component) {
        const incompatibilities = hardIncompatibilities(node, component, props, tokenPaths)
        if (incompatibilities.length > 0) {
          return {
            nodeId: node.id,
            componentId: component.id,
            strategy: 'manual-review',
            confidence: 'low',
            reasons: [`Source Key matched ${component.displayName}, then failed hard constraints.`],
            incompatibilities,
            warnings: ['Hard constraints cannot be overridden by semantic score.']
          }
        }

        return {
          nodeId: node.id,
          componentId: component.id,
          strategy: 'exact-component',
          ruleScore: 100,
          confidence: 'high',
          reasons: [`Source Key ${sourceKey} exactly matched ${component.displayName}.`],
          incompatibilities: [],
          warnings: []
        }
      }

      const sourceAdapter = sourceKey ? adaptersBySourceKey.get(sourceKey) : undefined
      const adapter =
        sourceAdapter ??
        (node.semantic ? adaptersBySemantic.get(node.semantic.toLowerCase()) : undefined)
      if (adapter) {
        const target = componentsById.get(adapter.targetComponentId)!
        const adaptedProps = applyAdapter(adapter, props)
        const incompatibilities = hardIncompatibilities(node, target, adaptedProps, tokenPaths)
        if (incompatibilities.length === 0) {
          return {
            nodeId: node.id,
            componentId: target.id,
            strategy: 'adapted-component',
            ruleScore: 100,
            confidence: 'high',
            reasons: [
              `Adapter ${adapter.id} mapped ${sourceAdapter ? sourceKey : `semantic ${node.semantic}`} to ${target.displayName}.`
            ],
            incompatibilities: [],
            warnings: [],
            adaptedProps
          }
        }

        return {
          nodeId: node.id,
          componentId: target.id,
          strategy: 'manual-review',
          confidence: 'low',
          reasons: [
            `Adapter ${adapter.id} selected ${target.displayName}, then failed hard constraints.`
          ],
          incompatibilities,
          warnings: ['Adapter output was rejected before generation.']
        }
      }

      const evaluatedCandidates = registry.components.map((candidate) => ({
        component: candidate,
        incompatibilities: hardIncompatibilities(node, candidate, props, tokenPaths),
        score: candidateScore(node, candidate)
      }))
      const candidates = evaluatedCandidates
        .filter((candidate) => candidate.incompatibilities.length === 0)
        .sort(
          (left, right) =>
            right.score - left.score || left.component.id.localeCompare(right.component.id)
        )
      const best = candidates[0]
      const bestRejected = evaluatedCandidates
        .filter((candidate) => candidate.incompatibilities.length > 0)
        .sort(
          (left, right) =>
            right.score - left.score || left.component.id.localeCompare(right.component.id)
        )[0]
      const rejectionWarnings = bestRejected
        ? [
            `Rejected ${bestRejected.component.displayName}: ${bestRejected.incompatibilities.join(' ')}`
          ]
        : []

      if (best && best.score >= 85) {
        return {
          nodeId: node.id,
          componentId: best.component.id,
          strategy: 'adapted-component',
          ruleScore: best.score,
          confidence: 'high',
          reasons: [
            `Semantic rules selected ${best.component.displayName} with score ${best.score}.`
          ],
          incompatibilities: [],
          warnings: sourceKey ? [`No exact component registered for ${sourceKey}.`] : [],
          adaptedProps: props
        }
      }

      if (best && best.score >= 70) {
        return {
          nodeId: node.id,
          componentId: best.component.id,
          strategy: 'manual-review',
          ruleScore: best.score,
          confidence: 'medium',
          reasons: [`${best.component.displayName} is the highest compatible candidate.`],
          incompatibilities: [],
          warnings: ['Rule score requires explicit user confirmation.']
        }
      }

      const recipe = recipeForNode(node, registry.recipes ?? [], componentsById)
      if (recipe) {
        return {
          nodeId: node.id,
          recipeId: recipe.id,
          strategy: 'registered-recipe',
          ruleScore: 65,
          confidence: 'medium',
          reasons: [`Registered Recipe ${recipe.displayName} matches semantic ${node.semantic}.`],
          incompatibilities: [],
          warnings: [
            'Recipe composition is limited to its registered member list.',
            ...rejectionWarnings
          ]
        }
      }

      const nativeElement = node.semantic
        ? nativeBySemantic[node.semantic.toLowerCase()]
        : undefined
      if (nativeElement) {
        return {
          nodeId: node.id,
          nativeElement,
          strategy: 'native-element',
          ruleScore: 60,
          confidence: 'medium',
          reasons: [`Semantic ${node.semantic} has a safe native ${nativeElement} fallback.`],
          incompatibilities: [],
          warnings: [
            ...(sourceKey ? [`No compatible registered component for ${sourceKey}.`] : []),
            ...rejectionWarnings
          ]
        }
      }

      return {
        nodeId: node.id,
        strategy: 'manual-review',
        confidence: 'low',
        reasons: sourceKey
          ? [`No compatible component, Adapter, Recipe, or native fallback for ${sourceKey}.`]
          : ['No compatible component, Recipe, or safe native fallback.'],
        incompatibilities: bestRejected?.incompatibilities ?? [],
        warnings: [
          'Select a registered component explicitly before generation.',
          ...rejectionWarnings
        ]
      }
    })
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId))
}
