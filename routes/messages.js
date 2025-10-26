import express from 'express';
import {
  requireAuth,
  getMessages,
  postMessage
} from '../controllers/messagesController.js';

const router = express.Router();

// Все маршруты сообщений требуют аутентификации
router.use(requireAuth);

// Получить сообщения для задачи
router.get('/tasks/:taskId/messages', getMessages);

// Отправить сообщение в задаче
router.post('/tasks/:taskId/messages', postMessage);

export default router;