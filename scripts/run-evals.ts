import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fixedEvalCases } from '../evals/cases'
import { runEvaluation } from './lib/evaluation'

const outputPath = resolve(process.cwd(), process.argv[2] ?? '.forge-output/evaluation-report.json')
const report = runEvaluation(fixedEvalCases)

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

for (const evalCase of report.cases) {
  const symbol = evalCase.status === 'passed' ? 'PASS' : 'FAIL'
  process.stdout.write(`${symbol} ${evalCase.id} (${evalCase.kind})\n`)
  for (const difference of evalCase.differences) {
    process.stdout.write(`  - ${difference}\n`)
  }
}

process.stdout.write(
  `Evaluation: ${report.totals.passed}/${report.totals.cases} passed; report ${outputPath}\n`
)

if (report.totals.failed > 0) {
  process.exitCode = 1
}
