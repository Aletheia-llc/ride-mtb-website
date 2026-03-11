import { readFileSync } from 'fs'

const [,, buildOutputPath, maxKB] = process.argv
const maxBytes = parseInt(maxKB, 10) * 1024

if (!buildOutputPath || !maxKB) {
  console.error('Usage: npx tsx scripts/check-bundle-size.ts <build-output-file> <max-kb>')
  process.exit(1)
}

const output = readFileSync(buildOutputPath, 'utf-8')

// Parse Next.js build output for "First Load JS" sizes
const sizePattern = /○|●|λ|ƒ.*?(\d+(?:\.\d+)?)\s*kB/g
let maxFound = 0
const violations: string[] = []

for (const match of output.matchAll(sizePattern)) {
  const sizeKB = parseFloat(match[1])
  if (sizeKB > maxFound) maxFound = sizeKB
  if (sizeKB * 1024 > maxBytes) {
    violations.push(match[0].trim())
  }
}

if (violations.length > 0) {
  console.error(`❌ Bundle size violations (>${maxKB}KB):`)
  violations.forEach((v) => console.error(`  ${v}`))
  process.exit(1)
} else {
  console.log(`✅ All routes under ${maxKB}KB budget (largest: ${maxFound.toFixed(1)}KB)`)
}
