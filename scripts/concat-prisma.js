const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', 'prisma', 'schema.base.prisma');
const modelsDir = path.join(__dirname, '..', 'prisma', 'models');
const outPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function build() {
  if (!fs.existsSync(basePath)) {
    console.error('Base schema not found:', basePath);
    process.exit(1);
  }

  let output = fs.readFileSync(basePath, 'utf8').trim() + '\n\n';

  if (!fs.existsSync(modelsDir)) {
    console.warn('No models directory found at', modelsDir);
  } else {
    const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.prisma')).sort();
    for (const f of files) {
      const p = path.join(modelsDir, f);
      const content = fs.readFileSync(p, 'utf8').trim();
      output += `\n// ----- ${f} -----\n\n` + content + '\n';
    }
  }

  fs.writeFileSync(outPath, output, 'utf8');
  console.log('Wrote', outPath);
}

if (require.main === module) build();

module.exports = { build };
