import Page from '../models/Page.js';
import { transliterate } from '../libs/transliterate.js';

// ========== АДМИН КОНТРОЛЛЕРЫ ==========

// Показать все страницы в админке
export const getAdminIndex = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const pagesData = await Page.find({})
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Page.countDocuments({});
    const totalPages = Math.ceil(total / limit);

    // Генерируем массив страниц для пагинации
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    res.render('admin/pages/index', {
      title: 'Управление страницами',
      pages: pagesData,
      currentPage: page,
      totalPages,
      pageNumbers: pageNumbers,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    });
  } catch (error) {
    console.error('Ошибка загрузки страниц в админке:', error);
    res.status(500).send('Ошибка загрузки страниц');
  }
};

// Показать форму создания страницы
export const getAdminCreate = async (req, res) => {
  try {
    res.render('admin/pages/create', {
      title: 'Создать страницу'
    });
  } catch (error) {
    console.error('Ошибка загрузки формы создания страницы:', error);
    res.status(500).send('Ошибка загрузки формы');
  }
};

// Создать новую страницу
export const postAdminCreate = async (req, res) => {
  try {
    const {
      title,
      content,
      metaTitle,
      metaDescription,
      metaKeywords,
      slug
    } = req.body;

    // Генерируем slug из title, если не указан
    let pageSlug = slug || transliterate(title);

    // Проверяем уникальность slug
    const existingPage = await Page.findOne({ slug: pageSlug });
    if (existingPage) {
      // Если slug уже существует, добавляем число
      let counter = 1;
      while (await Page.findOne({ slug: `${pageSlug}-${counter}` })) {
        counter++;
      }
      pageSlug = `${pageSlug}-${counter}`;
    }

    const pageData = {
      title,
      content,
      slug: pageSlug,
      metaTitle: metaTitle || title,
      metaDescription,
      metaKeywords
    };

    const page = new Page(pageData);
    await page.save();

    res.redirect('/admin/pages');
  } catch (error) {
    console.error('Ошибка создания страницы:', error);
    res.render('admin/pages/create', {
      title: 'Создать страницу',
      error: error.message,
      formData: req.body
    });
  }
};

// Показать форму редактирования страницы
export const getAdminEdit = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).send('Страница не найдена');
    }

    res.render('admin/pages/edit', {
      title: 'Редактировать страницу',
      page
    });
  } catch (error) {
    console.error('Ошибка загрузки страницы для редактирования:', error);
    res.status(500).send('Ошибка загрузки страницы');
  }
};

// Обновить страницу
export const postAdminEdit = async (req, res) => {
  try {
    const {
      title,
      content,
      metaTitle,
      metaDescription,
      metaKeywords,
      slug
    } = req.body;

    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).send('Страница не найдена');
    }

    // Обновляем slug, если он изменился
    let pageSlug = slug || transliterate(title);
    
    // Если slug изменился, проверяем уникальность
    if (pageSlug !== page.slug) {
      const existingPage = await Page.findOne({ slug: pageSlug, _id: { $ne: page._id } });
      if (existingPage) {
        let counter = 1;
        while (await Page.findOne({ slug: `${pageSlug}-${counter}`, _id: { $ne: page._id } })) {
          counter++;
        }
        pageSlug = `${pageSlug}-${counter}`;
      }
    }

    page.title = title;
    page.content = content;
    page.slug = pageSlug;
    page.metaTitle = metaTitle || title;
    page.metaDescription = metaDescription;
    page.metaKeywords = metaKeywords;
    page.updatedAt = Date.now();

    await page.save();

    res.redirect('/admin/pages');
  } catch (error) {
    console.error('Ошибка обновления страницы:', error);
    const page = await Page.findById(req.params.id);
    res.render('admin/pages/edit', {
      title: 'Редактировать страницу',
      page,
      error: error.message
    });
  }
};

// Удалить страницу
export const postAdminDelete = async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).send('Страница не найдена');
    }

    await Page.findByIdAndDelete(req.params.id);

    res.redirect('/admin/pages');
  } catch (error) {
    console.error('Ошибка удаления страницы:', error);
    res.status(500).send('Ошибка удаления страницы');
  }
};

// ========== ПУБЛИЧНЫЙ КОНТРОЛЛЕР ==========

// Показать страницу по slug
export const getPage = async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug });

    if (!page) {
      return res.status(404).render('error', {
        title: 'Страница не найдена',
        message: 'Страница не найдена'
      });
    }

    res.render('pages/show', {
      title: page.metaTitle || page.title,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      page
    });
  } catch (error) {
    console.error('Ошибка загрузки страницы:', error);
    res.status(500).render('error', {
      title: 'Ошибка',
      message: 'Ошибка загрузки страницы'
    });
  }
};

