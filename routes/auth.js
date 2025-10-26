import express from 'express';
import {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  getLogout,
  getProfile,
  getEditProfile,
  postEditProfile
} from '../controllers/authController.js';

const router = express.Router();

// Регистрация
router.get('/register', getRegister);
router.post('/register', postRegister);

// Вход
router.get('/login', getLogin);
router.post('/login', postLogin);

// Выход
router.get('/logout', getLogout);

// Профиль
router.get('/profile', getProfile);
router.get('/profile/edit', getEditProfile);
router.post('/profile/edit', postEditProfile);

export default router;