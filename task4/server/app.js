const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");

const app = express();
const port = 3000;

app.use(express.json());

app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

// ===== ТОВАРЫ =====
let products = [
  {
    id: nanoid(6),
    name: "Logitech G Pro X",
    category: "Keyboard",
    description: "Механическая игровая клавиатура",
    price: 120,
    stock: 15,
    rating: 4.8,
    image: "https://via.placeholder.com/150"
  },
  {
    id: nanoid(6),
    name: "Razer DeathAdder V3",
    category: "Mouse",
    description: "Игровая мышь 26000 DPI",
    price: 90,
    stock: 25,
    rating: 4.7,
    image: "https://via.placeholder.com/150"
  },
  {
    id: nanoid(6),
    name: "SteelSeries Arctis 7",
    category: "Headset",
    description: "Беспроводная гарнитура",
    price: 150,
    stock: 10,
    rating: 4.6,
    image: "https://via.placeholder.com/150"
  },
  {
    id: nanoid(6),
    name: "HyperX Pulsefire",
    category: "Mouse",
    description: "RGB игровая мышь",
    price: 70,
    stock: 30,
    rating: 4.4,
    image: "https://via.placeholder.com/150"
  },
  {
    id: nanoid(6),
    name: "Corsair K95",
    category: "Keyboard",
    description: "Механическая клавиатура RGB",
    price: 200,
    stock: 8,
    rating: 4.9,
    image: "https://via.placeholder.com/150"
  },
  {
    id: nanoid(6),
    name: "Xbox Controller",
    category: "Gamepad",
    description: "Оригинальный геймпад Xbox",
    price: 65,
    stock: 40,
    rating: 4.8,
    image: "https://via.placeholder.com/150"
  },
  {
    id: nanoid(6),
    name: "PlayStation DualSense",
    category: "Gamepad",
    description: "Геймпад PS5",
    price: 75,
    stock: 35,
    rating: 4.9,
    image: "https://via.placeholder.com/150"
  },
  {
    id: nanoid(6),
    name: "Razer Mousepad XXL",
    category: "Mousepad",
    description: "Большой коврик для мыши",
    price: 30,
    stock: 50,
    rating: 4.5,
    image: "https://via.placeholder.com/150"
  },
  {
    id: nanoid(6),
    name: "Logitech G733",
    category: "Headset",
    description: "RGB гарнитура",
    price: 130,
    stock: 12,
    rating: 4.6,
    image: "https://via.placeholder.com/150"
  },
  {
    id: nanoid(6),
    name: "Asus ROG Keyboard",
    category: "Keyboard",
    description: "Премиум клавиатура",
    price: 180,
    stock: 6,
    rating: 4.7,
    image: "https://via.placeholder.com/150"
  }
];

// ===== CRUD =====

// GET all
app.get("/api/products", (req, res) => {
  res.json(products);
});

// GET by id
app.get("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Not found" });
  res.json(product);
});

// POST
app.post("/api/products", (req, res) => {
  const { name, category, description, price, stock } = req.body;

  const newProduct = {
    id: nanoid(6),
    name,
    category,
    description,
    price: Number(price),
    stock: Number(stock),
    rating: 0,
    image: "https://via.placeholder.com/150"
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// PATCH
app.patch("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Not found" });

  Object.assign(product, req.body);
  res.json(product);
});

// DELETE
app.delete("/api/products/:id", (req, res) => {
  products = products.filter(p => p.id !== req.params.id);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});