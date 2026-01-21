const controller = require('./controllers/contractController');
console.log('contractController keys:');
for (const k of Object.keys(controller)) {
  console.log(k, '->', typeof controller[k]);
}
console.log('has createContract:', typeof controller.createContract);
console.log('has listContractsByUser:', typeof controller.listContractsByUser);
console.log('has listContractsByProperty:', typeof controller.listContractsByProperty);
console.log('has getContract:', typeof controller.getContract);
console.log('has uploadContractDocument:', typeof controller.uploadContractDocument);
console.log('has acceptContract:', typeof controller.acceptContract);
console.log('has proposeContractEdit:', typeof controller.proposeContractEdit);
