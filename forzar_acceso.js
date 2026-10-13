const fs = require('fs');
try {
  let db = fs.existsSync('./db.json') ? JSON.parse(fs.readFileSync('./db.json', 'utf8')) : {};
  
  // Creamos un perfil maestro invencible con todas las traducciones posibles
  const credenciales = { 
    email: 'fullmoviesec593@gmail.com', 
    correo: 'fullmoviesec593@gmail.com', 
    usuario: 'fullmoviesec593@gmail.com',
    password: 'admin123', 
    clave: 'admin123',
    pass: 'admin123'
  };
  
  // Lo inyectamos en todas las rutas que tu servidor podría estar leyendo
  db.admin = credenciales;
  db.superadmin = credenciales;
  db.superAdmin = credenciales;
  db.config = { ...db.config, ...credenciales };
  
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
  console.log('\n✅ ¡Base de datos parcheada con éxito!');
  console.log('👉 Intenta ingresar con: fullmoviesec593@gmail.com / admin123\n');
} catch(e) {
  console.log('❌ Error:', e.message);
}
