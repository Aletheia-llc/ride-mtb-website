import { readFileSync } from 'fs'

const [, , buildOutputFile, maxKB] = process.argv
const budgetKB = parseInt(maxKB || '250', 10)

if (!buildOutputFile) {
  console.error('Usage: tsx scripts/check-bundle-size.ts <build-output.txt> <max-kb>')
  process.exit(1)
}

const output = readFileSync(buildOutputFile, 'utf-8')

// Parse Next.js build output for route sizes
// Next.js outputs lines like: "○ /route    X kB" with first-load JS as the last size column
const routePattern = /[○●λƒ]\s+(\/\S+)\s+[\d.]+\s+[kKmM]?B\s+([\d.]+)\s+kB/g
let failed = false

let match: RegExpExecArray | null
while ((match = routePattern.exec(output)) !== null) {
  const route = match[1]
  const sizeKB = parseFloat(match[2])

  if (sizeKB > budgetKB) {
    console.error(`FAIL: ${route} (${sizeKB} kB > ${budgetKB} kB budget)`)
    failed = true
  }
}

if (failed) {
  console.error(`\nBundle budget exceeded! Max: ${budgetKB} kB uncompressed first-load JS per route.`)
  process.exit(1)
}

console.log(`All routes within ${budgetKB} kB budget.`)
