import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync } from 'node:crypto';
const root = new URL('../', import.meta.url);
const envPath = fileURLToPath(new URL('.env', root));
const exists = existsSync(envPath);
let text = readFileSync(
  exists ? envPath : new URL('.env.example', root),
  'utf8',
);
function value(key) {
  const line = text.split(/\r?\n/).find((line) => line.startsWith(key + '='));
  return line?.slice(key.length + 1).trim();
}
const privateKey = value('JWT_PRIVATE_KEY');
const publicKey = value('JWT_PUBLIC_KEY');
const missing = (value) => !value || value === 'GENERATE_LOCALLY';
if (missing(privateKey) !== missing(publicKey)) {
  throw new Error(
    'JWT_PRIVATE_KEY e JWT_PUBLIC_KEY devem ser configuradas como um par. Nenhuma chave foi alterada.',
  );
}
if (missing(privateKey)) {
  const pair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  for (const [key, raw] of [
    ['JWT_PRIVATE_KEY', pair.privateKey],
    ['JWT_PUBLIC_KEY', pair.publicKey],
  ]) {
    const encoded = Buffer.from(raw).toString('base64');
    const pattern = new RegExp('^' + key + '=.*$', 'm');
    text = pattern.test(text)
      ? text.replace(pattern, key + '=' + encoded)
      : text.trimEnd() + '\n' + key + '=' + encoded + '\n';
  }
}
if (!exists)
  writeFileSync(envPath, text, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
else if (text !== readFileSync(envPath, 'utf8'))
  writeFileSync(envPath, text, { encoding: 'utf8', mode: 0o600 });
console.log(
  exists
    ? 'Ambiente local preservado.'
    : 'Ambiente local preparado com par RSA exclusivo.',
);
