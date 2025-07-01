/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Autenticación de usuarios
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               nombre:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado
 *       400:
 *         description: Error en el registro
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión y obtener token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Autenticación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Credenciales inválidas
 */

const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { SECRET } = require("../auth");

// Registro de usuario (puedes restringir este endpoint solo para admins si gustas)
router.post("/register", async (req, res) => {
  const { username, password, nombre } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Faltan datos" });
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash, nombre) VALUES ($1, $2, $3) RETURNING id, username, nombre",
      [username, hash, nombre || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(400).json({ error: "Usuario ya existe" });
  }
});

// Login de usuario
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query("SELECT * FROM users WHERE username=$1", [
    username,
  ]);
  if (rows.length === 0)
    return res.status(401).json({ error: "Credenciales inválidas" });
  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Credenciales inválidas" });

  // Generar token JWT
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      role: user.role,
    },
    SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token });
});

module.exports = router;
