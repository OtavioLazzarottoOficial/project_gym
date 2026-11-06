import { constants, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const frontendExample = new URL('../apps/frontend/.env.example', import.meta.url);
const frontendEnv = new URL('../apps/frontend/.env', import.meta.url);
const backendEnv = new URL('../apps/backend/.env', import.meta.url);
const npmCli = process.env.npm_execpath;
const [major, minor] = process.versions.node.split('.').map(Number);

if (major < 24 || (major === 24 && minor < 15)) {
  console.error('Use Node.js 24.15 ou superior para preparar o projeto.');
  process.exit(1);
}

if (!npmCli) {
  console.error('Execute este script usando npm run setup na raiz do projeto.');
  process.exit(1);
}

function run(command, args, message) {
  console.log(`\n${message}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) {
    console.error('Não foi possível concluir esta etapa. Confira a mensagem acima e tente novamente.');
    process.exit(1);
  }
}

run('docker', ['compose', 'version'], 'Verificando Docker Compose...');
run(process.execPath, [npmCli, 'ci'], 'Instalando as dependências do projeto...');

try {
  copyFileSync(frontendExample, frontendEnv, constants.COPYFILE_EXCL);
  console.log('Ambiente local do frontend criado.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Ambiente local do frontend preservado.');
}

run(process.execPath, [npmCli, 'run', 'env:init', '--workspace', '@repo/backend'], 'Preparando ambiente local do backend...');
loadEnvFile(backendEnv);

let database;
try {
  database = new URL(process.env.DATABASE_URL);
} catch {
  console.error('DATABASE_URL inválida. Confira apps/backend/.env antes de continuar.');
  process.exit(1);
}

const port = process.env.PROJECT_GYM_DB_PORT || '5433';
if (!['postgres:', 'postgresql:'].includes(database.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.port !== port || database.pathname !== '/base_local' || ![null, 'public'].includes(database.searchParams.get('schema'))) {
  console.error('A preparação automática só aplica migrations ao banco local base_local na porta configurada. Para outro banco, revise DATABASE_URL e aplique as migrations manualmente.');
  process.exit(1);
}

run('docker', ['compose', 'up', '-d', '--wait', 'db'], 'Iniciando o banco local...');
run(process.execPath, [npmCli, 'run', 'prisma:deploy', '--workspace', '@repo/backend'], 'Aplicando as migrations no banco local...');
run(process.execPath, [npmCli, 'run', 'build', '--workspace', '@repo/shared'], 'Preparando os contratos compartilhados...');

console.log('\nProjeto preparado. Se ainda não existe administrador da plataforma, execute npm run admin:setup --workspace @repo/backend.');
console.log('Depois execute npm run dev e acesse http://localhost:5173.');
console.log('Para enviar convites, configure o Gmail em apps/backend/.env.');
