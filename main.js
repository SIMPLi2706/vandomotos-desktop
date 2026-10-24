const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');

const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbMain = require('./src/db-main.js');

let mainWindow;

// Configuração do Auto-Updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function configurarAutoUpdate() {
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Checando atualizações no GitHub...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`🔄 Nova atualização v${info.version} encontrada! Baixando...`);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log(`✅ O sistema já está na versão mais recente (v${info.version}).`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Atualização baixada com sucesso! Exibindo caixa de diálogo...');
    dialog.showMessageBox({
      type: 'info',
      title: 'Atualização do Vando Motos ERP',
      message: `Uma nova versão (v${info.version}) do sistema foi baixada!`,
      detail: 'O aplicativo será reiniciado para aplicar as melhorias.',
      buttons: ['Reiniciar e Atualizar Agora', 'Lembrar Depois']
    }).then((res) => {
      if (res.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('⚠️ Erro no auto-updater:', err ? err.message : err);
  });

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('⚠️ Erro ao buscar atualizações na inicialização:', err.message);
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Vando Motos | ERP Enterprise',
    icon: path.join(__dirname, 'src/assets/img/logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  // Menu de Contexto (Botão Direito -> Desfazer, Refazer, Recortar, Copiar, Colar, Selecionar Tudo)
  mainWindow.webContents.on('context-menu', (e, props) => {
    const { selectionText, isEditable } = props;
    const menuTemplate = [];

    if (isEditable) {
      menuTemplate.push(
        { label: 'Desfazer', role: 'undo' },
        { label: 'Refazer', role: 'redo' },
        { type: 'separator' },
        { label: 'Recortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Colar', role: 'paste' },
        { type: 'separator' },
        { label: 'Selecionar Tudo', role: 'selectAll' }
      );
    } else if (selectionText && selectionText.trim() !== '') {
      menuTemplate.push(
        { label: 'Copiar', role: 'copy' },
        { type: 'separator' },
        { label: 'Selecionar Tudo', role: 'selectAll' }
      );
    } else {
      menuTemplate.push(
        { label: 'Copiar', role: 'copy' },
        { label: 'Colar', role: 'paste' },
        { type: 'separator' },
        { label: 'Selecionar Tudo', role: 'selectAll' }
      );
    }

    if (menuTemplate.length > 0) {
      Menu.buildFromTemplate(menuTemplate).popup({ window: mainWindow });
    }
  });

  // Suporte a Menu de Contexto para Webviews (WhatsApp Web, etc)
  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    webContents.on('context-menu', (e, props) => {
      const { selectionText, isEditable } = props;
      const menuTemplate = [];
      if (isEditable) {
        menuTemplate.push(
          { label: 'Desfazer', role: 'undo' },
          { label: 'Refazer', role: 'redo' },
          { type: 'separator' },
          { label: 'Recortar', role: 'cut' },
          { label: 'Copiar', role: 'copy' },
          { label: 'Colar', role: 'paste' },
          { type: 'separator' },
          { label: 'Selecionar Tudo', role: 'selectAll' }
        );
      } else if (selectionText && selectionText.trim() !== '') {
        menuTemplate.push(
          { label: 'Copiar', role: 'copy' },
          { type: 'separator' },
          { label: 'Selecionar Tudo', role: 'selectAll' }
        );
      } else {
        menuTemplate.push(
          { label: 'Copiar', role: 'copy' },
          { label: 'Colar', role: 'paste' },
          { type: 'separator' },
          { label: 'Selecionar Tudo', role: 'selectAll' }
        );
      }
      if (menuTemplate.length > 0) {
        Menu.buildFromTemplate(menuTemplate).popup();
      }
    });
  });
}

function realizarBackupAutomatico() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'vandomotos.db');
    if (!fs.existsSync(dbPath)) return;

    const backupDir = path.join(app.getPath('userData'), 'backups_automaticos');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const backupFileName = `vandomotos-auto-backup-${today}.db`;
    const targetPath = path.join(backupDir, backupFileName);

    if (!fs.existsSync(targetPath)) {
      const db = dbMain.getDb();
      if (db) {
        try { db.pragma('wal_checkpoint(FULL)'); } catch (e) {}
      }
      fs.copyFileSync(dbPath, targetPath);
      console.log('✅ Backup automático diário criado em:', targetPath);
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('vandomotos-auto-backup-') && f.endsWith('.db'))
      .sort();

    if (files.length > 30) {
      const toDelete = files.slice(0, files.length - 30);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(backupDir, file));
        console.log('🧹 Backup automático antigo removido:', file);
      }
    }
  } catch (err) {
    console.error('⚠️ Erro ao realizar backup automático:', err.message);
  }
}

app.whenReady().then(() => {
  dbMain.initDatabase();
  realizarBackupAutomatico();
  createWindow();
  configurarAutoUpdate();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  realizarBackupAutomatico();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// ===== HANDLERS IPC =====

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  try {
    const res = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: res ? res.updateInfo : null };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Autenticação & Perfis de Login
ipcMain.handle('get-login-users', async () => {
  const db = dbMain.getDb();
  return db.prepare('SELECT id, username, nome, nivel FROM usuarios').all();
});

ipcMain.handle('get-users', async () => {
  const db = dbMain.getDb();
  return db.prepare('SELECT id, username, nome, nivel, cpf FROM usuarios').all();
});

ipcMain.handle('save-user', async (event, user) => {
  const db = dbMain.getDb();
  if (user.id) {
    if (user.senha && user.senha.trim() !== '') {
      const hashed = dbMain.hashPassword(user.senha.trim());
      db.prepare('UPDATE usuarios SET username = ?, nome = ?, nivel = ?, cpf = ?, senha = ? WHERE id = ?')
        .run(user.username, user.nome, user.nivel, user.cpf || null, hashed, user.id);
    } else {
      db.prepare('UPDATE usuarios SET username = ?, nome = ?, nivel = ?, cpf = ? WHERE id = ?')
        .run(user.username, user.nome, user.nivel, user.cpf || null, user.id);
    }
  } else {
    const hashed = dbMain.hashPassword(user.senha ? user.senha.trim() : '123456');
    db.prepare('INSERT INTO usuarios (username, senha, nome, nivel, cpf) VALUES (?, ?, ?, ?, ?)')
      .run(user.username, hashed, user.nome, user.nivel, user.cpf || null);
  }
  return true;
});

ipcMain.handle('delete-user', async (event, userId) => {
  dbMain.deleteFromTable('usuarios', [userId]);
  return true;
});

ipcMain.handle('login', async (event, { username, senha }) => {
  const user = dbMain.getUserByUsername(username);
  if (!user) {
    throw new Error('Usuário não encontrado');
  }
  const match = bcrypt.compareSync(senha, user.senha);
  if (!match) {
    throw new Error('Senha incorreta');
  }
  return {
    success: true,
    user: { id: user.id, username: user.username, nome: user.nome, nivel: user.nivel }
  };
});

ipcMain.handle('logout', async () => {
  return true;
});

ipcMain.handle('verify-admin-password', async (event, senha) => {
  const db = dbMain.getDb();
  const admins = db.prepare("SELECT senha FROM usuarios WHERE nivel = 'admin'").all();
  for (const admin of admins) {
    if (bcrypt.compareSync(senha, admin.senha)) {
      return true;
    }
  }
  return false;
});

// Manipulação Genérica de Tabelas
ipcMain.handle('load-data', async (event, table) => {
  if (table && typeof table === 'string') {
    return dbMain.loadTable(table);
  }
  // Se nenhuma tabela for informada (ex: app.js no startup), carrega o estado completo do banco
  return {
    clientes: dbMain.loadTable('clientes'),
    veiculos: dbMain.loadTable('veiculos'),
    contratos: dbMain.loadTable('contratos'),
    financeiro: dbMain.loadTable('financeiro'),
    espera: dbMain.loadTable('espera')
  };
});

ipcMain.handle('save-data', async (event, { table, data }) => {
  dbMain.saveTable(table, Array.isArray(data) ? data : [data]);
  return true;
});

ipcMain.handle('delete-data', async (event, { table, ids }) => {
  dbMain.deleteFromTable(table, ids);
  return true;
});

// Utilitários do Sistema de Arquivos & Pastas
ipcMain.handle('get-user-data-path', async () => {
  return app.getPath('userData');
});

ipcMain.handle('create-folder', async (event, folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return true;
});

ipcMain.handle('save-file', async (event, { filePath, base64Data }) => {
  const folder = path.dirname(filePath);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(base64Clean, 'base64'));
  return true;
});

ipcMain.handle('read-file', async (event, filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  let mime = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
  else if (ext === '.pdf') mime = 'application/pdf';
  return `data:${mime};base64,${buffer.toString('base64')}`;
});

ipcMain.handle('open-path', async (event, filePath) => {
  if (fs.existsSync(filePath)) {
    await shell.openPath(filePath);
    return true;
  }
  return false;
});

let cachedLogoBase64 = null;
ipcMain.handle('get-logo-base64', async () => {
  if (cachedLogoBase64) return cachedLogoBase64;
  const logoPath = path.join(__dirname, 'src/assets/img/logo.png');
  if (fs.existsSync(logoPath)) {
    const buffer = fs.readFileSync(logoPath);
    cachedLogoBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
    return cachedLogoBase64;
  }
  return '';
});

// Backup do Banco de Dados SQLite
ipcMain.handle('backup', async () => {
  try {
    const db = dbMain.getDb();
    db.pragma('wal_checkpoint(FULL)');
    
    const dbPath = path.join(app.getPath('userData'), 'vandomotos.db');
    const now = new Date().toISOString().split('T')[0];
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Salvar Backup do Banco de Dados',
      defaultPath: `vandomotos-backup-${now}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (filePath) {
      fs.copyFileSync(dbPath, filePath);
      return { success: true, path: filePath };
    }
    return { success: false, error: 'Operação cancelada pelo usuário' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
