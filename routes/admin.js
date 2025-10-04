import express from 'express';
import adminMiddleware from '../controllers/adminMiddleware.js';
import {
  getIndex,
  getCreate,
  postCreate,
  getEdit,
  postEdit,
  postDelete
} from '../controllers/categoriesController.js';

const router = express.Router();

// Применить middleware для всех маршрутов админки
router.use(adminMiddleware);

// Категории
router.get('/categories', getIndex);
router.get('/categories/create', getCreate);
router.post('/categories/create', postCreate);
router.get('/categories/:id/edit', getEdit);
router.post('/categories/:id/edit', postEdit);
router.post('/categories/:id/delete', postDelete);

export default router;