// Script temporário para limpar o banco de dados GOATCINE
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'goatcine.db');

async function clearDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('Banco de dados não existe ou já foi apagado!');
    return;
  }

  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  // Limpar tabelas
  db.run('DELETE FROM users;');
  db.run('DELETE FROM sessions;');
  db.run('DELETE FROM verification_codes;');
  
  // Salvar alterações
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  console.log('✅ Todas as contas cadastradas e sessões foram excluídas do banco com sucesso!');
}

clearDatabase().catch(err => {
  console.error('Erro ao limpar o banco:', err);
});
