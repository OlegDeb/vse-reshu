import express from 'express';
import adminMiddleware from '../controllers/adminMiddleware.js';
import {
  getIndex,
  getCreate,
  postCreate,
  getEdit,
  postEdit,
  postDelete,
  getCategoriesByType
} from '../controllers/categoriesController.js';
import {
  getIndex as getArticleCategoriesIndex,
  getCreate as getArticleCategoriesCreate,
  postCreate as postArticleCategoriesCreate,
  getEdit as getArticleCategoriesEdit,
  postEdit as postArticleCategoriesEdit,
  postDelete as postArticleCategoriesDelete
} from '../controllers/articleCategoriesController.js';
import {
  getAdminIndex,
  getAdminCreate,
  postAdminCreate,
  getAdminEdit,
  postAdminEdit,
  postAdminDelete,
  postAdminToggleStatus
} from '../controllers/articlesController.js';
import {
  getAdminIndex as getPagesIndex,
  getAdminCreate as getPagesCreate,
  postAdminCreate as postPagesCreate,
  getAdminEdit as getPagesEdit,
  postAdminEdit as postPagesEdit,
  postAdminDelete as postPagesDelete
} from '../controllers/pagesController.js';
import upload from '../config/multer.js';

const router = express.Router();

// Применить middleware для всех маршрутов админки
router.use(adminMiddleware);

// Категории для задач
router.get('/categories', getIndex);
router.get('/categories/type/:type', getCategoriesByType);
router.get('/categories/create', getCreate);
router.post('/categories/create', postCreate);
router.get('/categories/:id/edit', getEdit);
router.post('/categories/:id/edit', postEdit);
router.post('/categories/:id/delete', postDelete);

// Категории для статей
router.get('/article-categories', getArticleCategoriesIndex);
router.get('/article-categories/create', getArticleCategoriesCreate);
router.post('/article-categories/create', postArticleCategoriesCreate);
router.get('/article-categories/:id/edit', getArticleCategoriesEdit);
router.post('/article-categories/:id/edit', postArticleCategoriesEdit);
router.post('/article-categories/:id/delete', postArticleCategoriesDelete);

// Статьи
router.get('/articles', getAdminIndex);
router.get('/articles/create', getAdminCreate);
router.post('/articles/create', upload.single('image'), postAdminCreate);
router.get('/articles/:id/edit', getAdminEdit);
router.post('/articles/:id/edit', upload.single('image'), postAdminEdit);
router.post('/articles/:id/delete', postAdminDelete);
router.post('/articles/:id/toggle-status', postAdminToggleStatus);

// Страницы
router.get('/pages', getPagesIndex);
router.get('/pages/create', getPagesCreate);
router.post('/pages/create', postPagesCreate);
router.get('/pages/:id/edit', getPagesEdit);
router.post('/pages/:id/edit', postPagesEdit);
router.post('/pages/:id/delete', postPagesDelete);

export default router;