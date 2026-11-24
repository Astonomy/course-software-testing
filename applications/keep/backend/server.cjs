
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../frontend');
const stateFile = process.env.LINGCORE_STATE_FILE || path.join(__dirname, 'state.json');
let sharedState = {};
try { sharedState = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}
let writeQueue = Promise.resolve();
async function persist(nextState) {
  const temporary = stateFile + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.mkdirSync(path.dirname(stateFile), {recursive:true});
    fs.writeFileSync(temporary, JSON.stringify(nextState));
    for(let attempt=0; ; attempt++) {
      try { fs.renameSync(temporary, stateFile); break; }
      catch(error) {
        if(attempt >= 4 || !['EPERM','EACCES','EBUSY'].includes(error.code)) throw error;
        await new Promise(resolve => setTimeout(resolve, 10 * (2 ** attempt)));
      }
    }
  } finally {
    try { fs.unlinkSync(temporary); } catch {}
  }
}
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png',
  '.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'};
http.createServer((req,res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad URL'); }
  if(name === '/healthz'){res.writeHead(200); return res.end('ok');}
  if(name.startsWith('/api/state/')) {
    const key = name.slice('/api/state/'.length);
    if(!key || key.length > 180 || ['__proto__','constructor','prototype'].includes(key)) {
      res.writeHead(400); return res.end('Invalid key');
    }
    const send = (status, value) => {res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store'}); res.end(JSON.stringify(value));};
    if(req.method === 'GET') return send(200, {value: Object.hasOwn(sharedState,key) ? sharedState[key] : null});
    if(req.method !== 'PUT') return send(405, {error:'Method not allowed'});
    let body = ''; let excessive = false;
    req.on('data', chunk => {body += chunk; if(body.length > 5000000 && !excessive){excessive=true;send(413,{error:'State too large'});}});
    req.on('end', () => {
      if(excessive) return;
      let value;
      try {
        ({value} = JSON.parse(body));
        if(typeof value !== 'string' && value !== null) return send(400,{error:'Expected string or null'});
      } catch {return send(400,{error:'Invalid state'});}
      writeQueue = writeQueue.then(async () => {
        const nextState = {...sharedState, [key]: value};
        try {
          await persist(nextState);
          sharedState = nextState;
          send(200,{ok:true});
        } catch(error) {
          console.error('State persistence failed:', error.code || error.name);
          send(500,{error:'State persistence failed'});
        }
      });
    });
    return;
  }
  let file = path.resolve(root, '.' + name);
  if(file !== root && !file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if(!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root,'index.html');
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404); return res.end('Not found');}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream',
      'Cache-Control':'no-store'}); res.end(data);
  });
}).listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log('Listening on '+(process.env.PORT||3000)));
