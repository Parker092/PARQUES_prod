const express = require("express");
const cors = require("cors");
const app = express();

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../src/swagger");

// Configurar orígenes permitidos
const allowedOrigins = [
  'http://frontend:3004',
  'http://10.20.70.91:3009'
];

// Middleware de CORS
app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como desde curl o Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Origen no permitido por CORS: ' + origin));
    }
  }
}));

app.use(express.json());

const authRouter = require("./routes/auth");
const sitesRouter = require("./routes/sites");
const logsRouter = require("./routes/logs");

app.use("/auth", authRouter);
app.use("/sites", sitesRouter);
app.use("/logs", logsRouter);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const uptimeSync = require("./uptimeSync");
uptimeSync.start();

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
});
