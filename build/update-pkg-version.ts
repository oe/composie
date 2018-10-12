import path from 'path'
import fs from 'fs'

export function increaseVersion (version) {
  const max = 20
  const vs = version.split('.').map(i => +i)
  let len = vs.length
  while (len--) {
    if (++vs[len] < max) {
      break
    }
    vs[len] = 0
  }
  return vs.join('.')
}

function updatePkg () {
  const pkgPath = path.join(__dirname, '../package.json')
  const pkg = require(pkgPath)
  pkg.version = increaseVersion(pkg.version)
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8')
  console.log(`  ✔ pakage version has been updated to ${pkg.version}`)
}
if (!module.parent) {
  updatePkg()
}

