import express from 'express';
import { getPage } from '../controllers/pagesController.js';

const router = express.Router();

// Публичный роут для страниц
router.get('/page/:slug', getPage);

export default router;

