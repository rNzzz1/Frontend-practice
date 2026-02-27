const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// ===== ТОВАРЫ =====
let products = [
  {
    id: nanoid(6),
    name: "Logitech G Pro X",
    category: "Keyboard",
    description: "Механическая игровая клавиатура",
    price: 120,
    stock: 15,
    rating: 4.8
  },
  {
    id: nanoid(6),
    name: "Razer DeathAdder V3",
    category: "Mouse",
    description: "Игровая мышь 26000 DPI",
    price: 90,
    stock: 25,
    rating: 4.7
  },
  {
    id: nanoid(6),
    name: "SteelSeries Arctis 7",
    category: "Headset",
    description: "Беспроводная гарнитура",
    price: 150,
    stock: 10,
    rating: 4.6
  },
  {
    id: nanoid(6),
    name: "HyperX Pulsefire",
    category: "Mouse",
    description: "RGB игровая мышь",
    price: 70,
    stock: 30,
    rating: 4.4
  },
  {
    id: nanoid(6),
    name: "Corsair K95",
    category: "Keyboard",
    description: "Механическая клавиатура RGB",
    price: 200,
    stock: 8,
    rating: 4.9
  },
  {
    id: nanoid(6),
    name: "Xbox Controller",
    category: "Gamepad",
    description: "Оригинальный геймпад Xbox",
    price: 65,
    stock: 40,
    rating: 4.8
  },
  {
    id: nanoid(6),
    name: "PlayStation DualSense",
    category: "Gamepad",
    description: "Геймпад PS5",
    price: 75,
    stock: 35,
    rating: 4.9
  },
  {
    id: nanoid(6),
    name: "Razer Mousepad XXL",
    category: "Mousepad",
    description: "Большой коврик для мыши",
    price: 30,
    stock: 50,
    rating: 4.5
  },
  {
    id: nanoid(6),
    name: "Logitech G733",
    category: "Headset",
    description: "RGB гарнитура",
    price: 130,
    stock: 12,
    rating: 4.6
  },
  {
    id: nanoid(6),
    name: "Asus ROG Keyboard",
    category: "Keyboard",
    description: "Премиум клавиатура",
    price: 180,
    stock: 6,
    rating: 4.7
  }
];

// ===== CRUD =====

// GET все товары
app.get("/api/products", (req, res) => {
  res.json(products);
});

// GET товар по id
app.get("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// POST создать товар
app.post("/api/products", (req, res) => {
  const { name, category, description, price, stock } = req.body;

  if (!name || !category || !description || price === undefined || stock === undefined) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const newProduct = {
    id: nanoid(6),
    name,
    category,
    description,
    price: Number(price),
    stock: Number(stock),
    rating: 0
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// PATCH обновить товар
app.patch("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const { name, category, description, price, stock, rating } = req.body;

  if (name !== undefined) product.name = name;
  if (category !== undefined) product.category = category;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) product.stock = Number(stock);
  if (rating !== undefined) product.rating = Number(rating);

  res.json(product);
});

// DELETE удалить товар
app.delete("/api/products/:id", (req, res) => {
  const exists = products.some(p => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Product not found" });

  products = products.filter(p => p.id !== req.params.id);
  res.status(204).send();
});

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ===== ЗАПУСК =====
app.listen(port, () => {
  console.log(`Shop server started at http://localhost:${port}`);
});