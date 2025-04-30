const multer = require('multer');
const storage = multer.memoryStorage(); // store in memory for sharp
const upload = multer({ storage });
module.exports = upload;
