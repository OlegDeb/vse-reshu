import Article from '../models/Article.js';
import ArticleCategory from '../models/ArticleCategory.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== АДМИН КОНТРОЛЛЕРЫ ==========

// Показать все статьи в админке
export const getAdminIndex = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const filter = {};
    const status = req.query.status;
    const category = req.query.category;
    
    if (status && ['draft', 'published'].includes(status)) {
      filter.status = status;
    }
    
    if (category) {
      filter.category = category;
    }

    const articles = await Article.find(filter)
      .populate('category', 'name type')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Article.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const categories = await ArticleCategory.find({}).sort({ name: 1 });

    // Генерируем массив страниц для пагинации
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    res.render('admin/articles/index', {
      title: 'Управление статьями',
      articles,
      categories,
      currentPage: page,
      totalPages,
      pages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      currentStatus: status,
      currentCategory: category
    });
  } catch (error) {
    console.error('Ошибка загрузки статей в админке:', error);
    res.status(500).send('Ошибка загрузки статей');
  }
};

// Показать форму создания статьи
export const getAdminCreate = async (req, res) => {
  try {
    const categories = await ArticleCategory.find({}).sort({ name: 1 });
    
    res.render('admin/articles/create', {
      title: 'Создать статью',
      categories
    });
  } catch (error) {
    console.error('Ошибка загрузки формы создания статьи:', error);
    res.status(500).send('Ошибка загрузки формы');
  }
};

// Создать новую статью
export const postAdminCreate = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      category,
      status,
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body;

    const articleData = {
      title,
      content,
      category,
      status: status || 'draft'
    };

    // Добавляем опциональные поля если они заполнены
    if (excerpt) articleData.excerpt = excerpt;
    if (metaTitle) articleData.metaTitle = metaTitle;
    if (metaDescription) articleData.metaDescription = metaDescription;
    if (metaKeywords) articleData.metaKeywords = metaKeywords;

    // Обработка загруженного изображения
    if (req.file) {
      articleData.image = `/img/articles/${req.file.filename}`;
    }

    const article = new Article(articleData);
    await article.save();

    res.redirect('/admin/articles');
  } catch (error) {
    console.error('Ошибка создания статьи:', error);
    
    const categories = await ArticleCategory.find({}).sort({ name: 1 });
    
    res.render('admin/articles/create', {
      title: 'Создать статью',
      categories,
      error: 'Ошибка создания статьи: ' + error.message,
      formData: req.body
    });
  }
};

// Показать форму редактирования статьи
export const getAdminEdit = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).populate('category');
    if (!article) {
      return res.status(404).send('Статья не найдена');
    }

    const categories = await ArticleCategory.find({}).sort({ name: 1 });

    res.render('admin/articles/edit', {
      title: 'Редактировать статью',
      article,
      categories
    });
  } catch (error) {
    console.error('Ошибка загрузки статьи для редактирования:', error);
    res.status(500).send('Ошибка загрузки статьи');
  }
};

// Обновить статью
export const postAdminEdit = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      category,
      status,
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body;

    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).send('Статья не найдена');
    }

    // Обновляем поля
    article.title = title;
    article.content = content;
    article.category = category;
    article.status = status || 'draft';
    
    if (excerpt !== undefined) article.excerpt = excerpt;
    if (metaTitle !== undefined) article.metaTitle = metaTitle;
    if (metaDescription !== undefined) article.metaDescription = metaDescription;
    if (metaKeywords !== undefined) article.metaKeywords = metaKeywords;

    // Обработка нового изображения
    if (req.file) {
      // Удаляем старое изображение
      if (article.image) {
        const oldImagePath = path.join(__dirname, '../public', article.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      article.image = `/img/articles/${req.file.filename}`;
    }

    await article.save();
    res.redirect('/admin/articles');
  } catch (error) {
    console.error('Ошибка обновления статьи:', error);
    
    const categories = await ArticleCategory.find({}).sort({ name: 1 });
    const article = await Article.findById(req.params.id);
    
    res.render('admin/articles/edit', {
      title: 'Редактировать статью',
      article,
      categories,
      error: 'Ошибка обновления статьи: ' + error.message
    });
  }
};

// Удалить статью
export const postAdminDelete = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).send('Статья не найдена');
    }

    // Удаляем изображение если есть
    if (article.image) {
      const imagePath = path.join(__dirname, '../public', article.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Article.findByIdAndDelete(req.params.id);
    res.redirect('/admin/articles');
  } catch (error) {
    console.error('Ошибка удаления статьи:', error);
    res.status(500).send('Ошибка удаления статьи');
  }
};

// Изменить статус статьи (опубликовать/снять с публикации)
export const postAdminToggleStatus = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).send('Статья не найдена');
    }

    if (article.status === 'published') {
      await article.unpublish();
    } else {
      await article.publish();
    }

    res.redirect('/admin/articles');
  } catch (error) {
    console.error('Ошибка изменения статуса статьи:', error);
    res.status(500).send('Ошибка изменения статуса');
  }
};

// ========== ПУБЛИЧНЫЕ КОНТРОЛЛЕРЫ ==========

// Показать список опубликованных статей
export const getPublicIndex = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    const filter = { status: 'published' };
    const categorySlug = req.query.category;
    
    let categoryFilter = null;
    if (categorySlug) {
      categoryFilter = await ArticleCategory.findOne({ slug: categorySlug });
      if (categoryFilter) {
        filter.category = categoryFilter._id;
      }
    }

    const articles = await Article.find(filter)
      .populate('category', 'name slug type')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Article.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const categories = await ArticleCategory.find({}).sort({ name: 1 });

    // Генерируем массив страниц для пагинации
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    res.render('articles/index', {
      title: categoryFilter ? `Статьи в категории: ${categoryFilter.name}` : 'Все статьи',
      articles,
      categories,
      currentCategory: categoryFilter,
      currentPage: page,
      totalPages,
      pages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    });
  } catch (error) {
    console.error('Ошибка загрузки статей:', error);
    res.status(500).send('Ошибка загрузки статей');
  }
};

// Показать отдельную статью по slug
export const getPublicShow = async (req, res) => {
  try {
    const article = await Article.findOne({ 
      slug: req.params.slug, 
      status: 'published' 
    }).populate('category', 'name slug type');

    if (!article) {
      return res.status(404).render('error', {
        title: 'Статья не найдена',
        message: 'Запрашиваемая статья не найдена или снята с публикации'
      });
    }

    // Увеличиваем счетчик просмотров
    await article.incrementViews();

    // Получаем похожие статьи из той же категории
    const relatedArticles = await Article.find({
      category: article.category._id,
      status: 'published',
      _id: { $ne: article._id }
    })
    .populate('category', 'name slug')
    .sort({ publishedAt: -1 })
    .limit(3);

    // Получаем все категории для сайдбара
    const categories = await ArticleCategory.find({}).sort({ name: 1 });

    res.render('articles/show', {
      title: article.metaTitle || article.title,
      metaDescription: article.metaDescription || article.excerpt,
      metaKeywords: article.metaKeywords,
      article,
      categories,
      relatedArticles
    });
  } catch (error) {
    console.error('Ошибка загрузки статьи:', error);
    res.status(500).send('Ошибка загрузки статьи');
  }
};