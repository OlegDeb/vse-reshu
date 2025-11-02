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
import { uploadAvatar } from '../config/multer.js';

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
router.post('/profile/edit', (req, res, next) => {
  uploadAvatar.single('avatar')(req, res, (err) => {
    if (err) {
      console.error('Ошибка загрузки файла:', err);
      // Сохраняем ошибку в req.uploadError для отображения пользователю
      if (err.code === 'LIMIT_FILE_SIZE') {
        req.uploadError = 'Размер файла превышает 2MB. Пожалуйста, выберите файл меньшего размера.';
      } else if (err.message && err.message.includes('Разрешены только изображения')) {
        req.uploadError = 'Разрешены только изображения (JPEG, PNG, GIF, WEBP)';
      } else {
        req.uploadError = 'Ошибка загрузки файла. Пожалуйста, попробуйте еще раз.';
      }
      // Продолжаем выполнение, чтобы пользователь мог видеть ошибку
    }
    next();
  });
}, postEditProfile);

export default router;