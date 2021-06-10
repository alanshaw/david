import * as david from './src/david.js'
import { promises as fs } from 'fs'

async function main () {
  const pkg = JSON.parse(await fs.readFile('package.json'))

  const infos = await david.dependenciesInfo(pkg.dependencies)
  console.log(`\n# Dependencies information for "${pkg.name}":`)
  Object.entries(infos).forEach(printInfo)

  console.log('\n# Newer versions:')
  Object.entries(infos).filter(([_, i]) => david.isUpdated(i)).forEach(printInfo)

  console.log('\n# Newer STABLE versions:')
  Object.entries(infos).filter(([_, i]) => david.isUpdated(i, { stable: true })).forEach(printInfo)
}

function printInfo ([name, info]) {
  const { required, stable, latest } = info
  console.log(`${name} (Required: ${required} Stable: ${stable || 'None'} Latest: ${latest})`)
}

main()
