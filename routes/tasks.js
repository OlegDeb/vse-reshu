import express from 'express';
import {
  requireAuth,
  getTasks,
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

const router = express.Router();

// Список задач - доступен всем
router.get('/', getTasks);

// Мои задачи - требует аутентификации
router.get('/my-tasks', requireAuth, getMyTasks);

// Создание задачи - требует аутентификации
router.get('/create', requireAuth, getCreateTask);
router.post('/create', requireAuth, postCreateTask);

// Просмотр задачи - доступен всем
router.get('/:id', getTask);

// Редактирование задачи - требует аутентификации
router.get('/:id/edit', requireAuth, getEditTask);
router.post('/:id/edit', requireAuth, postEditTask);

// Остальные роуты требуют аутентификации
router.use(requireAuth);

// Оставить отклик
router.post('/:id/response', postResponse);

// Принять отклик
router.post('/:taskId/response/:responseId/accept', acceptResponse);

// Редактировать отклик
router.post('/:taskId/response/:responseId/edit', editResponse);

// Удалить отклик
router.post('/:taskId/response/:responseId/delete', deleteResponse);

// Закрыть задачу
router.post('/:id/close', closeTask);

export default router;