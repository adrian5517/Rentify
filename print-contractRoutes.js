const fs = require('fs');
const p = './routes/contractRoutes.js';
const lines = fs.readFileSync(p,'utf8').split(/\r?\n/);
for (let i=0;i<lines.length;i++) console.log((i+1).toString().padStart(3,' ')+': '+lines[i]);
