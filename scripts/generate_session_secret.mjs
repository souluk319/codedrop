import crypto from 'crypto';

const args = new Set(process.argv.slice(2));
const raw = args.has('--raw');
const bytesArg = process.argv.find(arg => arg.startsWith('--bytes='));
const bytes = Math.max(32, Math.min(Number(bytesArg?.split('=')[1] || 48), 96));
const secret = crypto.randomBytes(bytes).toString('base64url');

console.log(raw ? secret : `SESSION_SECRET=${secret}`);
