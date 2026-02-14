const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Массив товаров
let products = [
    { id: 1, name: 'Клавиатура', price: 2500 },
    { id: 2, name: 'Мышь', price: 1200 },
    { id: 3, name: 'Монитор', price: 15000 }
];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Статические файлы
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/scss', express.static(path.join(__dirname, 'scss')));

// Логирование
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// CREATE - Создание товара
app.post('/products', (req, res) => {
    const { name, price } = req.body;
    
    if (!name || !price) {
        return res.status(400).json({ error: 'Укажите название и цену' });
    }

    const newProduct = {
        id: Date.now(),
        name,
        price: parseFloat(price)
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

// READ - Все товары
app.get('/products', (req, res) => {
    res.json(products);
});

// READ - Товар по ID
app.get('/products/:id', (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    res.json(product);
});

// UPDATE - Обновление товара
app.patch('/products/:id', (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    
    if (!product) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    const { name, price } = req.body;
    
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = parseFloat(price);

    res.json(product);
});

// DELETE - Удаление товара
app.delete('/products/:id', (req, res) => {
    const initialLength = products.length;
    products = products.filter(p => p.id != req.params.id);
    
    if (products.length === initialLength) {
        return res.status(404).json({ error: 'Товар не найден' });
    }

    res.json({ message: 'Товар удалён' });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});
