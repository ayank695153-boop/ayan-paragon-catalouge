const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'CHANGE_THIS_ADMIN_TOKEN';
const DATA_DIR = path.join(__dirname, 'data');
const LICENSE_FILE = path.join(DATA_DIR, 'licenses.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LICENSE_FILE)) fs.writeFileSync(LICENSE_FILE, '{}');

app.use(express.json({limit:'64kb'}));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

function readLicenses(){ try { return JSON.parse(fs.readFileSync(LICENSE_FILE,'utf8')); } catch { return {}; } }
function writeLicenses(x){ fs.writeFileSync(LICENSE_FILE, JSON.stringify(x,null,2)); }
function normalizeKey(k){ return String(k||'').trim().toUpperCase(); }
function now(){ return Date.now(); }
function auth(req){ return String(req.headers['x-admin-token']||req.headers.authorization||'').replace(/^Bearer\s+/i,'') === ADMIN_TOKEN; }
function deviceHash(deviceId){ return crypto.createHash('sha256').update(String(deviceId||'')).digest('hex'); }
function publicLicense(l){ return {key:l.key, note:l.note||'', blocked:!!l.blocked, expiresAt:l.expiresAt||null, deviceBound:!!l.deviceHash}; }

app.get('/api/health', (req,res)=>res.json({ok:true}));

app.post('/api/license/activate', (req,res)=>{
  const key=normalizeKey(req.body.key), deviceId=String(req.body.deviceId||'');
  const db=readLicenses(), l=db[key];
  if(!key || !deviceId) return res.status(400).json({ok:false,error:'KEY_OR_DEVICE_MISSING'});
  if(!l) return res.status(404).json({ok:false,error:'INVALID_KEY'});
  if(l.blocked) return res.status(403).json({ok:false,error:'LICENSE_BLOCKED'});
  if(l.expiresAt && now()>l.expiresAt) return res.status(403).json({ok:false,error:'LICENSE_EXPIRED'});
  const dh=deviceHash(deviceId);
  if(l.deviceHash && l.deviceHash!==dh) return res.status(403).json({ok:false,error:'DEVICE_MISMATCH'});
  if(!l.deviceHash){ l.deviceHash=dh; l.activatedAt=now(); writeLicenses(db); }
  return res.json({ok:true, license:publicLicense(l)});
});

app.post('/api/license/validate', (req,res)=>{
  const key=normalizeKey(req.body.key), deviceId=String(req.body.deviceId||'');
  const db=readLicenses(), l=db[key];
  if(!l) return res.status(404).json({ok:false,error:'INVALID_KEY'});
  if(l.blocked) return res.status(403).json({ok:false,error:'LICENSE_BLOCKED'});
  if(l.expiresAt && now()>l.expiresAt) return res.status(403).json({ok:false,error:'LICENSE_EXPIRED'});
  if(!l.deviceHash || l.deviceHash!==deviceHash(deviceId)) return res.status(403).json({ok:false,error:'DEVICE_MISMATCH'});
  res.json({ok:true,license:publicLicense(l)});
});

app.get('/api/admin/licenses',(req,res)=>{
  if(!auth(req)) return res.status(401).json({ok:false,error:'UNAUTHORIZED'});
  const db=readLicenses(); res.json({ok:true,licenses:Object.values(db).map(publicLicense)});
});

app.post('/api/admin/licenses',(req,res)=>{
  if(!auth(req)) return res.status(401).json({ok:false,error:'UNAUTHORIZED'});
  const db=readLicenses();
  let key=normalizeKey(req.body.key);
  if(!key) key='AYAN-'+crypto.randomBytes(5).toString('hex').toUpperCase();
  if(db[key]) return res.status(409).json({ok:false,error:'KEY_EXISTS'});
  const days=Math.max(1, Number(req.body.days||30));
  db[key]={key,note:String(req.body.note||''),blocked:false,expiresAt:Date.now()+days*86400000,deviceHash:null,createdAt:Date.now()};
  writeLicenses(db); res.json({ok:true,license:publicLicense(db[key])});
});

app.post('/api/admin/licenses/:key/block',(req,res)=>{
  if(!auth(req)) return res.status(401).json({ok:false,error:'UNAUTHORIZED'});
  const db=readLicenses(), key=normalizeKey(req.params.key); if(!db[key]) return res.status(404).json({ok:false,error:'NOT_FOUND'});
  db[key].blocked=true; writeLicenses(db); res.json({ok:true,license:publicLicense(db[key])});
});
app.post('/api/admin/licenses/:key/unblock',(req,res)=>{
  if(!auth(req)) return res.status(401).json({ok:false,error:'UNAUTHORIZED'});
  const db=readLicenses(), key=normalizeKey(req.params.key); if(!db[key]) return res.status(404).json({ok:false,error:'NOT_FOUND'});
  db[key].blocked=false; writeLicenses(db); res.json({ok:true,license:publicLicense(db[key])});
});
app.post('/api/admin/licenses/:key/reset-device',(req,res)=>{
  if(!auth(req)) return res.status(401).json({ok:false,error:'UNAUTHORIZED'});
  const db=readLicenses(), key=normalizeKey(req.params.key); if(!db[key]) return res.status(404).json({ok:false,error:'NOT_FOUND'});
  db[key].deviceHash=null; writeLicenses(db); res.json({ok:true,license:publicLicense(db[key])});
});

app.get('/admin', (req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`Ayan Paragon Catalogue running on port ${PORT}`));
