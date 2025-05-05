const multer = require('multer');


const storage = multer.memoryStorage(); // Use memory storage for Sharp processing
const upload = multer({ storage });

module.exports = upload;

