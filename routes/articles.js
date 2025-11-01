import express from 'express';
import {
  getPublicIndex,
  getPublicShow
} from '../controllers/articlesController.js';

const router = express.Router();

// Публичные роуты для статей
router.get('/articles', getPublicIndex);
router.get('/articles/:slug', getPublicShow);

export default router;
