const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getLoginUsers: () => ipcRenderer.invoke('get-login-users'),
  getUsers: () => ipcRenderer.invoke('get-users'),
  saveUser: (user) => ipcRenderer.invoke('save-user', user),
  deleteUser: (userId) => ipcRenderer.invoke('delete-user', userId),
  login: (username, senha) => ipcRenderer.invoke('login', { username, senha }),
  logout: () => ipcRenderer.invoke('logout'),
  verifyAdminPassword: (senha) => ipcRenderer.invoke('verify-admin-password', senha),
  loadData: (table) => ipcRenderer.invoke('load-data', table),
  saveData: (table, data) => ipcRenderer.invoke('save-data', { table, data }),
  deleteData: (table, ids) => ipcRenderer.invoke('delete-data', { table, ids }),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  createFolder: (folderPath) => ipcRenderer.invoke('create-folder', folderPath),
  saveFile: (filePath, base64Data) => ipcRenderer.invoke('save-file', { filePath, base64Data }),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  getLogoBase64: () => ipcRenderer.invoke('get-logo-base64'),
  backup: () => ipcRenderer.invoke('backup'),
  backupDatabase: () => ipcRenderer.invoke('backup'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates')
});
