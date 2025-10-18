import express from 'express';
import {
  requireAuth,
  getTasks,
  getCreateTask,
  postCreateTask,
  getTask,
  postResponse,
  acceptResponse,
  closeTask,
  editResponse,
  deleteResponse
} from '../controllers/tasksController.js';

const router = express.Router();

// Список задач - доступен всем
router.get('/', getTasks);

// Просмотр задачи - доступен всем
router.get('/:id', getTask);

// Остальные роуты требуют аутентификации
router.use(requireAuth);

// Создание задачи
router.get('/create', getCreateTask);
router.post('/create', postCreateTask);

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