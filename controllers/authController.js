import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const getRegister = (req, res) => {
  res.render('register', { title: 'Регистрация' });
};

export const postRegister = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    req.session.userId = user._id;
    res.redirect('/profile');
  } catch (error) {
    res.render('register', { error: 'Ошибка регистрации' });
  }
};

export const getLogin = (req, res) => {
  res.render('login', { title: 'Вход' });
};

export const postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      res.redirect('/profile');
    } else {
      res.render('login', { error: 'Неверный email или пароль' });
    }
  } catch (error) {
    res.render('login', { error: 'Ошибка входа' });
  }
};

export const getLogout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};

export const getProfile = async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const user = await User.findById(req.session.userId);
    const userObj = user.toObject();
    userObj.createdAtFormatted = user.createdAt.toLocaleDateString('ru-RU');
    res.render('profile', { user: userObj, title: 'Профиль' });
  } catch (error) {
    res.redirect('/');
  }
};