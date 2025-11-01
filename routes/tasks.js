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

// Список задач - доступен всем (должен быть первым!)
router.get('/', getTasks);

// Мои задачи - требует аутентификации (должен быть до /:id)
router.get('/my-tasks', requireAuth, getMyTasks);

// Создание задачи - требует аутентификации (должен быть до /:id)
router.get('/create', requireAuth, getCreateTask);
router.post('/create', requireAuth, postCreateTask);

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

export default router;