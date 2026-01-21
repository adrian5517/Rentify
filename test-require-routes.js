try {
  const r = require('./routes/contractRoutes');
  console.log('contractRoutes loaded, type:', typeof r);
} catch (e) {
  console.error('error requiring contractRoutes:', e);
}
