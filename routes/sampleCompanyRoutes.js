const express = require('express');
const router = express.Router();
const SampleCompanyController = require('../controllers/sampleCompanyController');

router.post('/', SampleCompanyController.createSampleCompany);

router.put('/logo/:id', SampleCompanyController.uploadLogoMiddleware, SampleCompanyController.updateLogo);

router.get('/logo/:id', SampleCompanyController.getLogo);


router.put('/documents/:id', SampleCompanyController.uploadDocumentsMiddleware, SampleCompanyController.updateDocuments);


router.get('/document/:id/:type', SampleCompanyController.getDocument);
router.get('/', SampleCompanyController.getAllSampleCompanies);

module.exports = router;
