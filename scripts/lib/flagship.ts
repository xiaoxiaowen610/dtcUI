import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import type { GeneratedProject } from '@forge-ui/contracts'
import input from '../../presets/saas/input.json'
import registry from '../../presets/saas/registry.json'
import { generateDesign } from '../../apps/engine/src/pipeline'

export function generateFlagship(createdAt?: string) {
  return generateDesign({ input, registry }, createdAt)
}

export async function materializeProject(project: GeneratedProject, outputDirectory: string) {
  const resolvedRoot = resolve(outputDirectory)

  for (const generatedFile of project.files) {
    const destination = resolve(resolvedRoot, generatedFile.path)
    if (!destination.startsWith(`${resolvedRoot}${sep}`)) {
      throw new Error(`Generated path escaped output directory: ${generatedFile.path}`)
    }

    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, generatedFile.content, 'utf8')
  }
}
