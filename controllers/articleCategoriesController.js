import ArticleCategory from '../models/ArticleCategory.js';

// Показать список категорий статей
export const getIndex = async (req, res) => {
  try {
    const categories = await ArticleCategory.find({}).sort({ name: 1 });
    
    res.render('admin/articleCategories/index', {
      title: 'Категории статей',
      categories
    });
  } catch (error) {
    console.error('Ошибка загрузки категорий статей:', error);
    res.status(500).send('Ошибка загрузки категорий');
  }
};

// Показать форму создания категории
export const getCreate = async (req, res) => {
  try {
    res.render('admin/articleCategories/create', {
      title: 'Создать категорию статей'
    });
  } catch (error) {
    console.error('Ошибка загрузки формы создания категории:', error);
    res.status(500).send('Ошибка загрузки формы');
  }
};

// Создать новую категорию
export const postCreate = async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = new ArticleCategory({
      name,
      description: description || undefined
    });

    await category.save();
    res.redirect('/admin/article-categories');
  } catch (error) {
    console.error('Ошибка создания категории:', error);
    
    res.render('admin/articleCategories/create', {
      title: 'Создать категорию статей',
      error: 'Ошибка создания категории: ' + error.message,
      formData: req.body
    });
  }
};

// Показать форму редактирования категории
export const getEdit = async (req, res) => {
  try {
    const category = await ArticleCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).send('Категория не найдена');
    }

    res.render('admin/articleCategories/edit', {
      title: 'Редактировать категорию статей',
      category
    });
  } catch (error) {
    console.error('Ошибка загрузки категории для редактирования:', error);
    res.status(500).send('Ошибка загрузки категории');
  }
};

// Обновить категорию
export const postEdit = async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = await ArticleCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).send('Категория не найдена');
    }

    category.name = name;
    if (description !== undefined) category.description = description;

    await category.save();
    res.redirect('/admin/article-categories');
  } catch (error) {
    console.error('Ошибка обновления категории:', error);
    
    const category = await ArticleCategory.findById(req.params.id);
    
    res.render('admin/articleCategories/edit', {
      title: 'Редактировать категорию статей',
      category,
      error: 'Ошибка обновления категории: ' + error.message
    });
  }
};

// Удалить категорию
export const postDelete = async (req, res) => {
  try {
    await ArticleCategory.findByIdAndDelete(req.params.id);
    res.redirect('/admin/article-categories');
  } catch (error) {
    console.error('Ошибка удаления категории:', error);
    res.status(500).send('Ошибка удаления категории');
  }
};
