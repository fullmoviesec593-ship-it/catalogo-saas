const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(__dirname));

function leerDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialDB = {
            superadmin: {
                correo: "admin@fullmovies.ec",
                clave: "superadmin2026"
            },
            usuarios: {
                "fullmovies": {
                    slug: "fullmovies",
                    nombreTienda: "Full Movies Ec",
                    whatsapp: "593982766054",
                    correo: "admin@fullmovies.ec",
                    clave: "123456",
                    logo: "./logo.png",
                    activo: true,
                    vencimiento: "2099-12-31",
                    servicios: [
                        {
                            nombre: "Netflix Premium",
                            imagen: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80",
                            desc: "Ultra HD 4K, cuentas estables con bot de códigos y soporte 24/7.",
                            precios: [{ item: "1 Perfil", valor: "$3.50" }, { item: "Completa", valor: "$10.00" }]
                        },
                        {
                            nombre: "Flujo TV (v8.7.4)",
                            imagen: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&q=80",
                            desc: "Canales en vivo, eventos deportivos exclusivos y películas.",
                            precios: [{ item: "1 Mes (3 Disp)", valor: "$8.00" }, { item: "3 Meses", valor: "$21.00" }]
                        }
                    ]
                }
            }
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
        return initialDB;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function guardarDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// 1. Obtener catálogo público (?tienda=slug)
app.get('/api/catalogo/:slug', (req, res) => {
    const db = leerDB();
    const slug = req.params.slug.toLowerCase();
    const usuario = db.usuarios[slug];

    if (!usuario) {
        return res.status(404).json({ error: "Tienda no encontrada" });
    }

    const hoy = new Date().toISOString().split('T')[0];
    const estaVencido = usuario.vencimiento && usuario.vencimiento < hoy;

    if (!usuario.activo || estaVencido) {
        return res.json({
            suspendido: true,
            nombreTienda: usuario.nombreTienda,
            whatsapp: usuario.whatsapp
        });
    }

    res.json({
        suspendido: false,
        nombreTienda: usuario.nombreTienda,
        whatsapp: usuario.whatsapp,
        logo: usuario.logo,
        servicios: usuario.servicios
    });
});

// 2. Registro público (Revendedor autogestionado)
app.post('/api/registro', (req, res) => {
    const { nombreTienda, slug, whatsapp, correo, clave } = req.body;
    if (!nombreTienda || !slug || !whatsapp || !correo || !clave) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const db = leerDB();

    if (db.usuarios[cleanSlug]) {
        return res.status(400).json({ error: "Ese identificador ya existe. Elige otro." });
    }

    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + 7);

    db.usuarios[cleanSlug] = {
        slug: cleanSlug,
        nombreTienda,
        whatsapp: whatsapp.replace(/[^0-9]/g, ''),
        correo: correo.toLowerCase(),
        clave,
        logo: "./logo.png",
        activo: true,
        vencimiento: fechaVence.toISOString().split('T')[0],
        servicios: []
    };

    guardarDB(db);
    res.json({ mensaje: "Registro exitoso", slug: cleanSlug });
});

// 3. Login de revendedor
app.post('/api/login', (req, res) => {
    const { correo, clave } = req.body;
    const db = leerDB();
    const cleanEmail = correo.toLowerCase();
    const usuario = Object.values(db.usuarios).find(u => u.correo === cleanEmail && u.clave === clave);

    if (!usuario) {
        return res.status(401).json({ error: "Correo o contraseña incorrectos" });
    }
    res.json({ usuario });
});

// 4. Revendedor: Actualizar datos de tienda, logo y servicios
app.post('/api/actualizar-tienda', (req, res) => {
    const { slug, clave, servicios, logo, nombreTienda, whatsapp } = req.body;
    const db = leerDB();
    const u = db.usuarios[slug];

    if (!u || u.clave !== clave) {
        return res.status(403).json({ error: "No autorizado" });
    }

    if (servicios !== undefined) u.servicios = servicios;
    if (logo) u.logo = logo;
    if (nombreTienda) u.nombreTienda = nombreTienda;
    if (whatsapp) u.whatsapp = whatsapp.replace(/[^0-9]/g, '');

    guardarDB(db);
    res.json({ mensaje: "Actualizado con éxito", usuario: u });
});

// 5. SUPERADMIN: Login
app.post('/api/superadmin/login', (req, res) => {
    const { correo, clave } = req.body;
    const db = leerDB();
    if (db.superadmin.correo === correo && db.superadmin.clave === clave) {
        return res.json({ exito: true });
    }
    res.status(401).json({ error: "Credenciales de Dueño inválidas" });
});

// 6. SUPERADMIN: Listar revendedores
app.get('/api/superadmin/usuarios', (req, res) => {
    const db = leerDB();
    const lista = Object.values(db.usuarios).map(u => ({
        slug: u.slug,
        nombreTienda: u.nombreTienda,
        whatsapp: u.whatsapp,
        correo: u.correo,
        clave: u.clave,
        activo: u.activo,
        vencimiento: u.vencimiento,
        totalServicios: u.servicios ? u.servicios.length : 0
    }));
    res.json({ usuarios: lista });
});

// 7. SUPERADMIN: Registrar revendedor de forma MANUAL
app.post('/api/superadmin/crear-usuario', (req, res) => {
    const { nombreTienda, slug, whatsapp, correo, clave, diasSuscripcion } = req.body;
    if (!nombreTienda || !slug || !whatsapp || !correo || !clave) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const db = leerDB();

    if (db.usuarios[cleanSlug]) {
        return res.status(400).json({ error: "Ese slug/identificador ya existe." });
    }

    const dias = parseInt(diasSuscripcion) || 30;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + dias);

    db.usuarios[cleanSlug] = {
        slug: cleanSlug,
        nombreTienda,
        whatsapp: whatsapp.replace(/[^0-9]/g, ''),
        correo: correo.toLowerCase(),
        clave,
        logo: "./logo.png",
        activo: true,
        vencimiento: fechaVence.toISOString().split('T')[0],
        servicios: []
    };

    guardarDB(db);
    res.json({ mensaje: "Revendedor registrado con éxito", usuario: db.usuarios[cleanSlug] });
});

// 8. SUPERADMIN: Modificar estado o eliminar
app.post('/api/superadmin/modificar-estado', (req, res) => {
    const { slug, accion } = req.body;
    const db = leerDB();
    const u = db.usuarios[slug];

    if (!u) return res.status(404).json({ error: "Usuario no encontrado" });

    if (accion === 'toggle_activo') {
        u.activo = !u.activo;
    } else if (accion === 'sumar_30_dias') {
        const actual = new Date(u.vencimiento && u.vencimiento > new Date().toISOString() ? u.vencimiento : new Date());
        actual.setDate(actual.getDate() + 30);
        u.vencimiento = actual.toISOString().split('T')[0];
        u.activo = true;
    } else if (accion === 'eliminar') {
        delete db.usuarios[slug];
    }

    guardarDB(db);
    res.json({ mensaje: "Operación realizada" });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor SaaS activo en http://localhost:${PORT}`);
});
