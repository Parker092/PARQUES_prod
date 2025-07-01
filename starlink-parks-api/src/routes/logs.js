/**
 * @swagger
 * tags:
 *   - name: Logs
 *     description: Auditoría de cambios a sitios (solo administradores)
 */

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: Ver logs de auditoría (solo admin)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Log'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso solo para administradores
 *
 * components:
 *   schemas:
 *     Log:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         site_id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         accion:
 *           type: string
 *         datos:
 *           type: object
 *         timestamp:
 *           type: string
 *         username:
 *           type: string
 *         sitio:
 *           type: string
 */

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authMiddleware, adminOnly } = require("../auth");

router.get("/", authMiddleware, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT l.*, u.username, s.sitio
    FROM site_logs l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN sites s ON l.site_id = s.id
    ORDER BY l.timestamp DESC
    LIMIT 200
  `);
  res.json(rows);
});

module.exports = router;
