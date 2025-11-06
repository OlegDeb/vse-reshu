import express from 'express';
import {
  requireAuth,
  getTasks,
  getTasksByCategory,
  getCreateTask,
  postCreateTask,
  getTask,
  getEditTask,
  postEditTask,
  getMyTasks,
  postResponse,
  acceptResponse,
  closeTask,
  editResponse,
  deleteResponse
} from '../controllers/tasksController.js';
import {
  createRating,
  getTaskRatings,
  canRate
} from '../controllers/ratingsController.js';

const router = express.Router();

// Список задач - доступен всем (должен быть первым!)
router.get('/', getTasks);

// Мои задачи - требует аутентификации (должен быть до /:id)
router.get('/my-tasks', requireAuth, getMyTasks);

// Создание задачи - требует аутентификации (должен быть до /:id)
router.get('/create', requireAuth, getCreateTask);
router.post('/create', requireAuth, postCreateTask);

// Задачи по категории (ЧПУ) - должен быть до /:id
router.get('/category/:slug', getTasksByCategory);

// Редактирование задачи - требует аутентификации (должен быть до /:id)
router.get('/:id/edit', requireAuth, getEditTask);
router.post('/:id/edit', requireAuth, postEditTask);

// Просмотр задачи - доступен всем (должен быть последним из /:id)
router.get('/:id', getTask);

// Оставить отклик - требует аутентификации
router.post('/:id/response', requireAuth, postResponse);

// Принять отклик - требует аутентификации
router.post('/:taskId/response/:responseId/accept', requireAuth, acceptResponse);

// Редактировать отклик - требует аутентификации
router.post('/:taskId/response/:responseId/edit', requireAuth, editResponse);

// Удалить отклик - требует аутентификации
router.post('/:taskId/response/:responseId/delete', requireAuth, deleteResponse);

// Закрыть задачу - требует аутентификации
router.post('/:id/close', requireAuth, closeTask);

// Рейтинги для задачи
router.get('/:taskId/ratings', getTaskRatings);
router.post('/:taskId/ratings', requireAuth, createRating);
router.get('/:taskId/can-rate', canRate);

export default router;