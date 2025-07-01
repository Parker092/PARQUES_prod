const cron = require('node-cron');
const fetch = require('node-fetch').default;
const pool = require('./db');

const kumaUrl = 'http://10.20.70.91:3003/metrics';
const username = ''; // <-- reemplaza si es necesario
const password = 'uk1_Iqz8WzbJXRHLY2uecP4vtNj-0wbGJi8Wn9G9A3pI';
const basicAuth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

const statusMap = {
  0: 'DOWN',
  1: 'UP',
  2: 'PENDING',
  3: 'MAINTENANCE'
};

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s,]+/g, " ")
    .trim();
}

async function syncUptimeStatus() {
  try {
    const { rows: sites } = await pool.query('SELECT id, sitio FROM sites');
    const response = await fetch(kumaUrl, {
      headers: { 'Authorization': basicAuth }
    });

    // Revisa si la respuesta es OK
    if (!response.ok) throw new Error(`Uptime Kuma HTTP ${response.status}`);

    const metricsText = await response.text();

    const statusLines = metricsText.split('\n').filter(l => l.startsWith('monitor_status'));
    const responseTimeLines = metricsText.split('\n').filter(l => l.startsWith('monitor_response_time'));

    const statusDict = {};
    const responseTimeDict = {};

    for (const line of statusLines) {
      const nameMatch = line.match(/monitor_name="([^"]+)"/);
      const statusMatch = line.match(/}\s([0-9])$/);
      if (nameMatch && statusMatch) {
        statusDict[nameMatch[1]] = parseInt(statusMatch[1]);
      }
    }
    for (const line of responseTimeLines) {
      const nameMatch = line.match(/monitor_name="([^"]+)"/);
      const timeMatch = line.match(/}\s(-?\d+)$/);
      if (nameMatch && timeMatch) {
        responseTimeDict[nameMatch[1]] = parseInt(timeMatch[1]);
      }
    }

    const notFound = [];
    // Si tienes muchos sitios, puedes optimizar usando Promise.all (opcional)
    for (const site of sites) {
      const siteNorm = normalizeName(site.sitio);
      let foundKey = null;
      for (const key of Object.keys(statusDict)) {
        if (normalizeName(key) === siteNorm) {
          foundKey = key;
          break;
        }
      }
      let nuevoStatus = 'NO_DATA';
      let responseTime = null;
      if (foundKey) {
        const statusCode = statusDict[foundKey];
        nuevoStatus = statusMap[statusCode] || 'UNKNOWN';
        responseTime = responseTimeDict[foundKey] ?? null;
      } else {
        notFound.push(site.sitio);
      }
      await pool.query(
        'UPDATE sites SET status=$1, response_time=$2 WHERE id=$3',
        [nuevoStatus, responseTime, site.id]
      );
    }

    console.log(`[${new Date().toISOString()}] Uptime Sync: ¡Actualización completa!`);
    if (notFound.length) {
      console.log('No se encontró status para los siguientes sitios:');
      notFound.forEach(name => console.log(` - ${name}`));
    }
  } catch (err) {
    console.error('Error en la sincronización con Uptime Kuma:', err.message);
  }
}

module.exports = {
  start: () => {
    syncUptimeStatus();
    cron.schedule('*/5 * * * *', syncUptimeStatus);
  }
};