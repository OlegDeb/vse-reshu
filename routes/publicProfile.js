import express from 'express';
import { getPublicProfile } from '../controllers/publicProfileController.js';

const router = express.Router();

// Публичный профиль пользователя
router.get('/users/:username', getPublicProfile);

export default router;