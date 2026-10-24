const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const bcrypt = require('bcryptjs');
const saltRounds = 10;

let db;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'vandomotos.db');
}

function getSqliteBindingPath() {
  const isPackaged = app.isPackaged;
  if (isPackaged) {
    return path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      'better-sqlite3',
      'build',
      'Release',
      'better_sqlite3.node'
    );
  } else {
    return path.join(
      __dirname,
      '../node_modules',
      'better-sqlite3',
      'build',
      'Release',
      'better_sqlite3.node'
    );
  }
}

function initDatabase() {
  const dbPath = getDbPath();
  const bindingPath = getSqliteBindingPath();
  const fs = require('fs');
  if (fs.existsSync(bindingPath)) {
    db = new Database(dbPath, { nativeBinding: bindingPath });
  } else {
    db = new Database(dbPath);
  }
  
  // ===== OTIMIZAÇÕES DE ALTA PERFORMANCE E SEGURANÇA DO SQLITE =====
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // Cache de 64MB em RAM
  db.pragma('temp_store = MEMORY');
  db.pragma('busy_timeout = 5000'); // Evita travamentos por concorrencia (espera 5s)
  db.pragma('foreign_keys = ON');

  // ===== CRIAÇÃO DAS TABELAS =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY,
      codigo TEXT,
      nome TEXT,
      tipo TEXT,
      cpf_cnpj TEXT,
      wpp TEXT,
      email TEXT,
      cep TEXT,
      logradouro TEXT,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      cidade TEXT,
      uf TEXT,
      endereco TEXT,
      ref_nome_1 TEXT,
      ref_fone_1 TEXT,
      ref_nome_2 TEXT,
      ref_fone_2 TEXT,
      ref_nome_3 TEXT,
      ref_fone_3 TEXT,
      img_cnh TEXT,
      img_residencia TEXT,
      num_cnh TEXT,
      rg_identidade TEXT,
      blacklist INTEGER DEFAULT 0,
      blacklist_motivo TEXT
    );

    CREATE TABLE IF NOT EXISTS veiculos (
      id INTEGER PRIMARY KEY,
      placa TEXT,
      modelo TEXT,
      ano TEXT,
      renavam TEXT,
      chassi TEXT,
      fipe REAL,
      status TEXT,
      doc TEXT,
      km_atual INTEGER,
      km_oleo INTEGER,
      combustivel INTEGER,
      img_moto TEXT,
      img_doc TEXT
    );

    CREATE TABLE IF NOT EXISTS contratos (
      id INTEGER PRIMARY KEY,
      cliente_id INTEGER,
      veiculo_id INTEGER,
      data_inicio TEXT,
      data_fim TEXT,
      valor REAL,
      caucao REAL,
      tracos_saida INTEGER,
      status TEXT,
      vencimento TEXT,
      usuario_id INTEGER,
      usuario_nome TEXT,
      tipo_plano TEXT DEFAULT 'simples',
      periodicidade_pagamento TEXT,
      valor_entrada REAL,
      numero_parcelas INTEGER,
      valor_parcela REAL,
      data_proxima_manutencao TEXT,
      data_ultima_manutencao TEXT,
      contrato_original_id INTEGER,
      numero_aditivo INTEGER DEFAULT 0,
      data_devolucao_real TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financeiro (
      id INTEGER PRIMARY KEY,
      data TEXT,
      tipo TEXT,
      categoria TEXT,
      descricao TEXT,
      valor REAL,
      contrato_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS espera (
      id INTEGER PRIMARY KEY,
      nome TEXT,
      telefone TEXT,
      preferencia TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      senha TEXT,
      nome TEXT,
      nivel TEXT CHECK(nivel IN ('admin', 'gerente', 'atendente')) DEFAULT 'atendente'
    );
  `);

  // ===== MIGRAÇÕES =====

  // 1. Clientes: email
  const clientesInfo = db.prepare("PRAGMA table_info(clientes)").all();
  if (!clientesInfo.some(col => col.name === 'email')) {
    db.exec("ALTER TABLE clientes ADD COLUMN email TEXT");
    console.log('✅ Migração: adicionada coluna email em clientes');
  }

  // 2. Contratos: novos campos
  const contratosInfo = db.prepare("PRAGMA table_info(contratos)").all();
  const colunasContratos = contratosInfo.map(c => c.name);
  
  const camposContratos = [
    { nome: 'tipo_plano', tipo: "TEXT DEFAULT 'simples'" },
    { nome: 'periodicidade_pagamento', tipo: 'TEXT' },
    { nome: 'valor_entrada', tipo: 'REAL' },
    { nome: 'numero_parcelas', tipo: 'INTEGER' },
    { nome: 'valor_parcela', tipo: 'REAL' },
    { nome: 'data_proxima_manutencao', tipo: 'TEXT' },
    { nome: 'data_ultima_manutencao', tipo: 'TEXT' },
    { nome: 'contrato_original_id', tipo: 'INTEGER' },
    { nome: 'numero_aditivo', tipo: 'INTEGER DEFAULT 0' },
    { nome: 'data_devolucao_real', tipo: 'TEXT' },
    { nome: 'caucao_tipo', tipo: 'TEXT DEFAULT "dinheiro"' },
    { nome: 'caucao_penhora_detalhes', tipo: 'TEXT' },
    { nome: 'km_saida', tipo: 'INTEGER' },
    { nome: 'km_retorno', tipo: 'INTEGER' },
    { nome: 'valor_integral', tipo: 'REAL' },
    { nome: 'valor_semanal', tipo: 'REAL' },
    { nome: 'ultimo_aditivo', tipo: 'TEXT' },
    { nome: 'historico_aditivos', tipo: 'TEXT' },
  ];

  for (const campo of camposContratos) {
    if (!colunasContratos.includes(campo.nome)) {
      db.exec(`ALTER TABLE contratos ADD COLUMN ${campo.nome} ${campo.tipo}`);
      console.log(`✅ Migração: adicionada coluna ${campo.nome} em contratos`);
    }
  }

  // ===== MIGRAÇÃO USUÁRIOS (email -> username) =====
  const usuariosInfo = db.prepare("PRAGMA table_info(usuarios)").all();
  const hasEmail = usuariosInfo.some(col => col.name === 'email');
  const hasUsername = usuariosInfo.some(col => col.name === 'username');

  if (hasEmail && !hasUsername) {
    console.log('🔄 Migrando tabela usuarios: renomeando coluna email para username...');
    db.exec(`
      BEGIN TRANSACTION;
      CREATE TABLE usuarios_nova (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE,
        senha TEXT,
        nome TEXT,
        nivel TEXT CHECK(nivel IN ('admin', 'gerente', 'atendente')) DEFAULT 'atendente'
      );
      INSERT INTO usuarios_nova (id, username, senha, nome, nivel) 
      SELECT id, email, senha, nome, nivel FROM usuarios;
      DROP TABLE usuarios;
      ALTER TABLE usuarios_nova RENAME TO usuarios;
      COMMIT;
    `);
    console.log('✅ Migração concluída: email → username');
  }

  // ===== MIGRAÇÃO USUÁRIOS (adicionar coluna cpf se não existir) =====
  const usuariosInfoMeta = db.prepare("PRAGMA table_info(usuarios)").all();
  if (!usuariosInfoMeta.some(col => col.name === 'cpf')) {
    db.exec("ALTER TABLE usuarios ADD COLUMN cpf TEXT");
    console.log('✅ Migração: adicionada coluna cpf em usuarios');
  }

  // ===== MIGRAÇÃO CONTRATOS (adicionar colunas semanas_pagas, valor_integral, valor_semanal se não existirem) =====
  const contratosInfoMeta = db.prepare("PRAGMA table_info(contratos)").all();
  if (!contratosInfoMeta.some(col => col.name === 'semanas_pagas')) {
    db.exec("ALTER TABLE contratos ADD COLUMN semanas_pagas INTEGER DEFAULT 0");
    console.log('✅ Migração: adicionada coluna semanas_pagas em contratos');
  }
  if (!contratosInfoMeta.some(col => col.name === 'valor_integral')) {
    db.exec("ALTER TABLE contratos ADD COLUMN valor_integral REAL");
    console.log('✅ Migração: adicionada coluna valor_integral em contratos');
  }
  if (!contratosInfoMeta.some(col => col.name === 'valor_semanal')) {
    db.exec("ALTER TABLE contratos ADD COLUMN valor_semanal REAL");
    console.log('✅ Migração: adicionada coluna valor_semanal em contratos');
  }

  // ===== MIGRAÇÃO VEÍCULOS (adicionar coluna manutencoes e categoria se não existirem) =====
  const veiculosInfoMeta = db.prepare("PRAGMA table_info(veiculos)").all();
  if (!veiculosInfoMeta.some(col => col.name === 'manutencoes')) {
    db.exec("ALTER TABLE veiculos ADD COLUMN manutencoes TEXT DEFAULT '[]'");
    console.log('✅ Migração: adicionada coluna manutencoes em veiculos');
  }
  if (!veiculosInfoMeta.some(col => col.name === 'categoria')) {
    db.exec("ALTER TABLE veiculos ADD COLUMN categoria TEXT DEFAULT 'moto'");
    console.log('✅ Migração: adicionada coluna categoria (moto/carro) em veiculos');
  }

  // ===== MIGRAÇÃO CLIENTES (adicionar colunas galeria_fotos, num_cnh e rg_identidade se não existirem) =====
  const clientesInfoMeta = db.prepare("PRAGMA table_info(clientes)").all();
  if (!clientesInfoMeta.some(col => col.name === 'galeria_fotos')) {
    db.exec("ALTER TABLE clientes ADD COLUMN galeria_fotos TEXT DEFAULT '[]'");
    console.log('✅ Migração: adicionada coluna galeria_fotos em clientes');
  }
  if (!clientesInfoMeta.some(col => col.name === 'num_cnh')) {
    db.exec("ALTER TABLE clientes ADD COLUMN num_cnh TEXT");
    console.log('✅ Migração: adicionada coluna num_cnh em clientes');
  }
  if (!clientesInfoMeta.some(col => col.name === 'rg_identidade')) {
    db.exec("ALTER TABLE clientes ADD COLUMN rg_identidade TEXT");
    console.log('✅ Migração: adicionada coluna rg_identidade em clientes');
  }

  if (!contratosInfoMeta.some(col => col.name === 'observacoes')) {
    db.exec("ALTER TABLE contratos ADD COLUMN observacoes TEXT");
    console.log('✅ Migração: adicionada coluna observacoes em contratos');
  }

  // ===== ÍNDICES DE DESEMPENHO =====
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf_cnpj);
    CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
    CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
    CREATE INDEX IF NOT EXISTS idx_veiculos_status ON veiculos(status);
    CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON contratos(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_contratos_veiculo ON contratos(veiculo_id);
    CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status);
    CREATE INDEX IF NOT EXISTS idx_financeiro_data ON financeiro(data);
  `);

  // ===== MIGRAÇÃO DE SENHAS PARA BCRYPT =====
  console.log('🔐 Verificando senhas para migração a bcrypt...');
  const usuarios = db.prepare("SELECT id, senha FROM usuarios").all();
  let updated = 0;
  for (const user of usuarios) {
    // Se a senha não começa com '$2b$', '$2a$' ou '$2y$', significa que está em texto puro
    if (!user.senha.startsWith('$2b$') && !user.senha.startsWith('$2a$') && !user.senha.startsWith('$2y$')) {
      const hashed = bcrypt.hashSync(user.senha, saltRounds);
      db.prepare("UPDATE usuarios SET senha = ? WHERE id = ?").run(hashed, user.id);
      updated++;
    }
  }
  if (updated > 0) {
    console.log(`✅ ${updated} senhas migradas para bcrypt.`);
  } else {
    console.log('✅ Todas as senhas já estão hasheadas com bcrypt.');
  }

  // ===== INSERIR USUÁRIOS PADRÃO (se não existirem) =====
  const usuariosPadrao = [
    { username: 'vando', senha: 'vando1234', nome: 'Vando', nivel: 'admin', cpf: '000.000.000-00' }
  ];

  const insertUser = db.prepare("INSERT OR IGNORE INTO usuarios (username, senha, nome, nivel, cpf) VALUES (?, ?, ?, ?, ?)");
  for (const u of usuariosPadrao) {
    // Verificar se já existe um usuário com esse username
    const exists = db.prepare("SELECT id FROM usuarios WHERE username = ?").get(u.username);
    if (!exists) {
      const hashed = bcrypt.hashSync(u.senha, saltRounds);
      insertUser.run(u.username, hashed, u.nome, u.nivel, u.cpf);
    }
  }

  console.log('✅ Banco de dados SQLite inicializado em:', dbPath);
  return db;
}

function loadTable(tableName) {
  const stmt = db.prepare(`SELECT * FROM ${tableName}`);
  return stmt.all();
}

function loadTablePaginated(tableName, limit, offset, orderBy = 'id DESC') {
  const stmt = db.prepare(`SELECT * FROM ${tableName} ORDER BY ${orderBy} LIMIT ? OFFSET ?`);
  return stmt.all(limit, offset);
}

function countTable(tableName) {
  const stmt = db.prepare(`SELECT COUNT(*) as total FROM ${tableName}`);
  return stmt.get().total;
}

function sanitizeValue(value) {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (value === null) return null;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

function saveTable(tableName, dataArray) {
  if (dataArray.length === 0) return;

  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const allColumns = tableInfo.map(col => col.name);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const columns = allColumns.filter(col => item.hasOwnProperty(col) && item[col] !== undefined);
      if (columns.length === 0) continue;

      const placeholders = columns.map(() => '?').join(', ');
      const updateClause = columns
        .filter(k => k !== 'id')
        .map(k => `${k} = excluded.${k}`)
        .join(', ');

      const stmt = db.prepare(`
        INSERT INTO ${tableName} (${columns.join(', ')}) 
        VALUES (${placeholders}) 
        ON CONFLICT(id) DO UPDATE SET ${updateClause}
      `);

      const values = columns.map(col => sanitizeValue(item[col]));
      stmt.run(values);
    }
  });

  insertMany(dataArray);
}

function deleteFromTable(tableName, ids) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM ${tableName} WHERE id IN (${placeholders})`);
  stmt.run(ids);
}

function getUserByUsername(username) {
  const stmt = db.prepare("SELECT * FROM usuarios WHERE username = ?");
  return stmt.get(username);
}

function hashPassword(senha) {
  return bcrypt.hashSync(senha, saltRounds);
}

module.exports = {
  initDatabase,
  getDb: () => db,
  loadTable,
  loadTablePaginated,
  countTable,
  saveTable,
  deleteFromTable,
  getUserByUsername,
  hashPassword
};
