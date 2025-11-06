import User from '../models/User.js';

const adminMiddleware = async (req, res, next) => {
  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user && user.role === 'admin') {
        // Устанавливаем layout для админки
        res.locals.layout = 'admin';
        return next();
      }
    } catch (error) {
      // ignore
    }
  }
  return res.status(403).send('Доступ запрещен: требуется роль администратора');
};

export default adminMiddleware;