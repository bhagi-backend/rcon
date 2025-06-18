const express = require('express');
const workSequenceDocumentController = require('../controllers/workSequenceDocumentController');
const router = express.Router();

router
  .route('/')
  .get(workSequenceDocumentController.getAllDocuments)
  .post(workSequenceDocumentController.createDocument);

router
  .route('/:id')
  .get(workSequenceDocumentController.getDocument);

module.exports = router;