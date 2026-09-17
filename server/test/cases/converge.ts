// Child of a test: two clients through one module, A writes, B converges.
// Runs in its own process because the client tests mock TinyBase's ws client
// module for the life of the test process (bun's mock.module is permanent),
// and a harness must dial the real one.
//   bun test/cases/converge.ts <ws-base> <module>
import {client, same, until} from '../clients';

const [ws, m] = [process.argv[2]!, process.argv[3]!];
const a = await client(ws, m);
const b = await client(ws, m);
a.store.setRow('todos', '0', {text: 'buy milk', completed: false});
const sync_ms = await until('B equals A', () => same(a.store, b.store));
const text = b.store.getCell('todos', '0', 'text');
await a.sync.destroy();
await b.sync.destroy();
console.log(JSON.stringify({sync_ms, text}));
process.exit(text === 'buy milk' ? 0 : 1);
