const controller = require('./controllers/contractController');
const upload = require('./middleware/uploadMiddleware');
const { protect } = require('./middleware/authMiddleware');

console.log('typeof protect:', typeof protect);
console.log('typeof upload:', typeof upload);
console.log('typeof upload.array:', typeof upload.array);
console.log('controller.createContract:', typeof controller.createContract);
console.log('controller.listContractsByUser:', typeof controller.listContractsByUser);
console.log('controller.getContract:', typeof controller.getContract);
console.log('controller.updateContract:', typeof controller.updateContract);
console.log('controller.uploadContractDocument:', typeof controller.uploadContractDocument);
console.log('controller.acceptContract:', typeof controller.acceptContract);
console.log('controller.proposeContractEdit:', typeof controller.proposeContractEdit);
console.log('controller.listContractsByProperty:', typeof controller.listContractsByProperty);
