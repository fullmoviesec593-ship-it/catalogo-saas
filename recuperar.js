const fs = require('fs');
console.log('\n🔍 BUSCANDO TUS CREDENCIALES MAESTRAS...\n');
try {
  let db = fs.existsSync('./db.json') ? JSON.parse(fs.readFileSync('./db.json', 'utf8')) : {};
  if (!db.superadmin) {
      db.superadmin = {};
  }
  db.superadmin.correo = 'fullmoviesec593@gmail.com';
  db.superadmin.password = 'admin123';
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
  console.log('✅ Clave forzada exitosamente en db.json');
  console.log('👉 Correo: fullmoviesec593@gmail.com');
  console.log('👉 Clave: admin123\n');
} catch(e) { 
  console.log('Error:', e.message); 
}
