const { execSync } = require('child_process');
const https = require('https');
require('dotenv').config();

// Carrega o token das variáveis de ambiente ou .env
const token = process.env.GH_TOKEN;
if (!token) {
  console.error('❌ ERRO: GH_TOKEN não encontrado no ambiente ou no arquivo .env.');
  process.exit(1);
}
process.env.GH_TOKEN = token;

console.log('🚀 Iniciando publicação automática para GitHub Releases (SIMPLi2706/vandomotos-desktop)...');

try {
  execSync('./node_modules/.bin/electron-builder --win --x64 --ia32 -p always', {
    stdio: 'inherit',
    env: process.env
  });
  
  // Publicar rascunhos automaticamente na API do GitHub
  publishDrafts();
} catch (err) {
  console.error('⚠️ Nota: A compilação cruzada para Windows 7 em Linux exige o pacote "wine".');
  console.error('Instale executando: sudo apt update && sudo apt install -y wine');
}

function publishDrafts() {
  const req = https.request({
    hostname: 'api.github.com',
    path: '/repos/SIMPLi2706/vandomotos-desktop/releases',
    method: 'GET',
    headers: {
      'User-Agent': 'VandoMotos-App',
      'Authorization': 'token ' + token
    }
  }, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const releases = JSON.parse(data);
        releases.filter(r => r.draft).forEach(r => {
          const patchData = JSON.stringify({ draft: false, target_commitish: 'main' });
          const patchReq = https.request({
            hostname: 'api.github.com',
            path: `/repos/SIMPLi2706/vandomotos-desktop/releases/${r.id}`,
            method: 'PATCH',
            headers: {
              'User-Agent': 'VandoMotos-App',
              'Authorization': 'token ' + token,
              'Content-Type': 'application/json',
              'Content-Length': patchData.length
            }
          }, pRes => console.log(`✅ Release ${r.tag_name} publicada oficialmente!`));
          patchReq.write(patchData);
          patchReq.end();
        });
      } catch (e) {}
    });
  });
  req.end();
}
