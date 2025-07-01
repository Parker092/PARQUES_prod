const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "super_secret_jwt"; // pon esto en .env en producción

// Middleware para proteger rutas
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token)
    return res.status(401).json({ error: "Token malformado" });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Token inválido" });
    req.user = decoded;
    next();
  });
}

function adminOnly(req, res, next) {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ error: "Acceso solo para administradores" });
}
module.exports = { authMiddleware, adminOnly, SECRET };
