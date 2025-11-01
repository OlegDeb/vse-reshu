import express from 'express';
import {
  requireAuth,
  getMessages,
  postMessage
} from '../controllers/messagesController.js';

const router = express.Router();

// Получить сообщения для задачи - требует аутентификации
router.get('/tasks/:taskId/messages', requireAuth, getMessages);

// Отправить сообщение в задаче - требует аутентификации
router.post('/tasks/:taskId/messages', requireAuth, postMessage);

export default router;