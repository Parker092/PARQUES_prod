// swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Starlink Parks API",
      version: "1.0.0",
      description: "API RESTful para gestión y monitoreo de parques con Starlink",
    },
    servers: [{ url: "" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"], // escanea los archivos de rutas
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
