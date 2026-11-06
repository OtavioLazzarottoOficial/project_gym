import { loadEnvFile } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { PrismaService } from '../dist/infra/database/prisma/prisma.service.js';
import { BcryptHasher } from '../dist/infra/cryptography/bcrypt-hasher.js';
import { createFirstAdministrator } from '../dist/infra/setup/create-first-administrator.js';

loadEnvFile(new URL('../.env', import.meta.url));

if (!process.stdin.isTTY) {
  console.error(
    'Execute este comando em um terminal interativo para informar a senha sem exibi-la.',
  );
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
const prisma = new PrismaService({ get: () => url.toString() });
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const terminal = createInterface({
  input: process.stdin,
  output,
  terminal: true,
});

async function readPassword(label) {
  process.stdout.write(label);
  muted = true;

  try {
    return await terminal.question('');
  } finally {
    muted = false;
    process.stdout.write('\n');
  }
}

try {
  await prisma.$connect();
  console.log(`Banco: ${url.hostname}:${url.port || '5432'}${url.pathname}`);

  if (
    await prisma.user.findFirst({
      where: { is_platform_admin: true },
      select: { id: true },
    })
  ) {
    console.error(
      'Já existe um administrador da plataforma. Nenhuma conta foi alterada.',
    );
    process.exitCode = 1;
  } else {
    const name = await terminal.question('Nome: ');
    const email = await terminal.question('Email: ');
    const password = await readPassword('Senha: ');
    const confirmation = await readPassword('Confirme a senha: ');

    if (password !== confirmation) {
      console.error('As senhas não coincidem. Nenhuma conta foi criada.');
      process.exitCode = 1;
    } else {
      const result = await createFirstAdministrator(
        prisma,
        new BcryptHasher(),
        { name, email, password },
        new BcryptHasher(),
      );

      if (result.isLeft()) {
        console.error(result.value.message);
        process.exitCode = 1;
      } else {
        console.log(
          'Primeiro administrador da plataforma preparado. Você já pode entrar pela página de login.',
        );
      }
    }
  }
} catch {
  console.error(
    'Não foi possível preparar o administrador. Confira a conexão e as migrations do banco.',
  );
  process.exitCode = 1;
} finally {
  terminal.close();
  await prisma.$disconnect();
}
