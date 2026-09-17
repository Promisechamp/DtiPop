import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import {
  createDocument,
  createDocumentWithUpload,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  getHouseholdDocuments,
  getAssetDocuments,
} from '../controllers/documentsController.js';

const router = express.Router();

// All document routes require authentication
router.use(authenticate);

// Create document with optional file upload (frontend direct URL or backend upload)
router.post('/', upload.single('file'), (req, res) => {
  // If file is present, use upload method; otherwise use regular create
  if (req.file) {
    return createDocumentWithUpload(req, res);
  }
  return createDocument(req, res);
});

// GET endpoints
router.get('/', getDocuments);
router.get('/household/:householdId', getHouseholdDocuments);
router.get('/asset/:assetId', getAssetDocuments);
router.get('/:id', getDocument);

// PUT & DELETE
router.put('/:id', upload.single('file'), async (req, res) => {
  // We need to handle file replacement in update as well
  // The updateDocument function can handle it if fileUrl is provided in body
  // If a new file is uploaded, we'll upload and pass the URL
  if (req.file) {
    try {
      const userId = req.user?.id;
      // Upload the new file
      const uploaded = await uploadToCloudinary(req.file.buffer, 'POP/documents', {
        resourceType: 'auto',
      });
      // Add fileUrl and publicId to body
      req.body.fileUrl = uploaded.url;
      req.body.filePublicId = uploaded.publicId;
    } catch (err) {
      console.error('File upload failed during update:', err);
      return res.status(500).json({ success: false, message: 'File upload failed.' });
    }
  }
  return updateDocument(req, res);
});

router.delete('/:id', deleteDocument);

export default router;