import express from 'express';
import {
  requireAuth,
  getTasks,
  getCreateTask,
  postCreateTask,
  getTask,
  postResponse,
  acceptResponse,
  closeTask
} from '../controllers/tasksController.js';

const router = express.Router();

// Все роуты требуют аутентификации
router.use(requireAuth);

// Список задач
router.get('/', getTasks);

// Создание задачи
router.get('/create', getCreateTask);
router.post('/create', postCreateTask);

// Просмотр задачи
router.get('/:id', getTask);

// Оставить отклик
router.post('/:id/response', postResponse);

// Принять отклик
router.post('/:taskId/response/:responseId/accept', acceptResponse);

// Закрыть задачу
router.post('/:id/close', closeTask);

export default router;