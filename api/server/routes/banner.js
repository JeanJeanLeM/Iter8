const express = require('express');

const { getBanner } = require('~/models/Banner');
const optionalJwtAuth = require('~/server/middleware/optionalJwtAuth');
const router = express.Router();

router.get('/', optionalJwtAuth, async (req, res) => {
  // #region agent log
  try {
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'banner.js:GET/entry',message:'GET /api/banner entered',data:{},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
  } catch (_) {}
  // #endregion
  try {
    res.status(200).send(await getBanner(req.user));
  } catch (error) {
    // #region agent log
    const fs = require('fs');
    const path = require('path');
    const pl = {location:'banner.js:GET/catch',message:'GET /api/banner error',data:{message:error?.message,name:error?.name,stack:error?.stack?.slice(0,600)},hypothesisId:'H3'};
    try { fs.appendFileSync(path.resolve(__dirname, '../../../.cursor/debug.log'), JSON.stringify({...pl,timestamp:Date.now()}) + '\n'); } catch (_) {}
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pl,timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    res.status(500).json({ message: 'Error getting banner' });
  }
});

module.exports = router;
