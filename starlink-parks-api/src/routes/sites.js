/**
 * @swagger
 * tags:
 *   - name: Sites
 *     description: Endpoints para gestión de sitios/parques
 *
 * components:
 *   schemas:
 *     Site:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         sitio:
 *           type: string
 *         departamento:
 *           type: string
 *         municipio:
 *           type: string
 *         distrito:
 *           type: string
 *         latitud:
 *           type: number
 *         longitud:
 *           type: number
 *         status:
 *           type: string
 *         response_time:
 *           type: integer
 *     SiteInput:
 *       type: object
 *       properties:
 *         sitio:
 *           type: string
 *         departamento:
 *           type: string
 *         municipio:
 *           type: string
 *         distrito:
 *           type: string
 *         coordenadas:
 *           type: string
 *         status:
 *           type: string
 */

const { authMiddleware } = require("../auth");
const express = require("express");
const router = express.Router();
const pool = require("../db");

function splitCoordinates(coordString) {
  if (!coordString) return [null, null];
  const parts = coordString.split(",");
  return [parseFloat(parts[0]), parseFloat(parts[1])];
}

/**
 * @swagger
 * /sites:
 *   get:
 *     summary: Listar todos los sitios (público)
 *     tags: [Sites]
 *     responses:
 *       200:
 *         description: Lista de sitios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Site'
 */
router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM sites ORDER BY id");
  res.json(rows);
});

/**
 * @swagger
 * /sites/{id}:
 *   get:
 *     summary: Obtener un sitio por ID
 *     tags: [Sites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle del sitio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Site'
 *       404:
 *         description: No encontrado
 */
router.get("/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM sites WHERE id=$1", [
    req.params.id,
  ]);
  if (rows.length === 0)
    return res.status(404).json({ error: "No encontrado" });
  res.json(rows[0]);
});

/**
 * @swagger
 * /sites:
 *   post:
 *     summary: Crear un sitio (autenticado)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SiteInput'
 *     responses:
 *       201:
 *         description: Sitio creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Site'
 *       401:
 *         description: No autorizado
 */
router.post("/", authMiddleware, async (req, res) => {
  const { sitio, departamento, municipio, distrito, coordenadas, status } =
    req.body;
  const [latitud, longitud] = splitCoordinates(coordenadas);
  const { rows } = await pool.query(
    `INSERT INTO sites (sitio, departamento, municipio, distrito, latitud, longitud, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [sitio, departamento, municipio, distrito, latitud, longitud, status]
  );
  const siteId = rows[0].id;
  await pool.query(
    "INSERT INTO site_logs (site_id, user_id, accion, datos) VALUES ($1, $2, $3, $4)",
    [siteId, req.user.id, "create", JSON.stringify(rows[0])]
  );
  res.status(201).json(rows[0]);
});

/**
 * @swagger
 * /sites/{id}:
 *   put:
 *     summary: Actualizar un sitio (autenticado)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SiteInput'
 *     responses:
 *       200:
 *         description: Sitio actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Site'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: No encontrado
 */
router.put("/:id", authMiddleware, async (req, res) => {
  const { sitio, departamento, municipio, distrito, coordenadas, status } =
    req.body;
  const [latitud, longitud] = splitCoordinates(coordenadas);
  const { rows } = await pool.query(
    `UPDATE sites SET sitio=$1, departamento=$2, municipio=$3, distrito=$4,
      latitud=$5, longitud=$6, status=$7 WHERE id=$8 RETURNING *`,
    [
      sitio,
      departamento,
      municipio,
      distrito,
      latitud,
      longitud,
      status,
      req.params.id,
    ]
  );
  if (rows.length === 0)
    return res.status(404).json({ error: "No encontrado" });

  await pool.query(
    "INSERT INTO site_logs (site_id, user_id, accion, datos) VALUES ($1, $2, $3, $4)",
    [req.params.id, req.user.id, "update", JSON.stringify(rows[0])]
  );
  res.json(rows[0]);
});

/**
 * @swagger
 * /sites/{id}:
 *   delete:
 *     summary: Eliminar un sitio (autenticado)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Sitio eliminado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: No encontrado
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  const { rows: beforeRows } = await pool.query(
    "SELECT * FROM sites WHERE id=$1",
    [req.params.id]
  );
  if (beforeRows.length === 0)
    return res.status(404).json({ error: "No encontrado" });

  const { rowCount } = await pool.query("DELETE FROM sites WHERE id=$1", [
    req.params.id,
  ]);
  if (rowCount === 0) return res.status(404).json({ error: "No encontrado" });

  await pool.query(
    "INSERT INTO site_logs (site_id, user_id, accion, datos) VALUES ($1, $2, $3, $4)",
    [req.params.id, req.user.id, "delete", JSON.stringify(beforeRows[0])]
  );
  res.status(204).send();
});

/**
 * @swagger
 * /sites/municipio/{municipio}:
 *   get:
 *     summary: Listar sitios por municipio
 *     tags: [Sites]
 *     parameters:
 *       - in: path
 *         name: municipio
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de sitios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Site'
 */
router.get("/municipio/:municipio", async (req, res) => {
  const municipio = req.params.municipio.toLowerCase();
  const { rows } = await pool.query(
    "SELECT * FROM sites WHERE LOWER(municipio) = $1",
    [municipio]
  );
  res.json(rows);
});

/**
 * @swagger
 * /sites/status/{status}:
 *   get:
 *     summary: Listar sitios por status
 *     tags: [Sites]
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de sitios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Site'
 */
router.get("/status/:status", async (req, res) => {
  const status = req.params.status;
  const { rows } = await pool.query(
    "SELECT * FROM sites WHERE status ILIKE $1",
    [status]
  );
  res.json(rows);
});

module.exports = router;
