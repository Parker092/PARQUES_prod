const express = require("express");
const app = express();
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("../src/swagger");

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
