const express = require("express");
const { nanoid } = require("nanoid");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = 3000;

app.use(express.json());

// ===== ДАННЫЕ =====
let users = [
  { id: nanoid(6), name: "Петр", age: 16 },
  { id: nanoid(6), name: "Иван", age: 18 },
  { id: nanoid(6), name: "Дарья", age: 20 }
];

// ===== SWAGGER НАСТРОЙКА =====
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Users REST API",
      version: "1.0.0",
      description: "API для управления пользователями"
    },
    servers: [
      {
        url: `http://localhost:${port}`
      }
    ]
  },
  apis: ["./app.js"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - age
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный ID пользователя
 *         name:
 *           type: string
 *           description: Имя пользователя
 *         age:
 *           type: integer
 *           description: Возраст пользователя
 *       example:
 *         id: "abc123"
 *         name: "Петр"
 *         age: 16
 */

// ===== CRUD =====

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список пользователей
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Массив пользователей
 */
app.get("/api/users", (req, res) => {
  res.json(users);
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Создать нового пользователя
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - age
 *             properties:
 *               name:
 *                 type: string
 *               age:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Пользователь создан
 *       400:
 *         description: Ошибка в данных
 */
app.post("/api/users", (req, res) => {
  const { name, age } = req.body;

  if (!name || age === undefined) {
    return res.status(400).json({ error: "Name and age are required" });
  }

  const newUser = {
    id: nanoid(6),
    name: name.trim(),
    age: Number(age)
  };

  users.push(newUser);
  res.status(201).json(newUser);
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить пользователя по ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Пользователь найден
 *       404:
 *         description: Пользователь не найден
 */
app.get("/api/users/:id", (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Обновить данные пользователя
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               age:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Пользователь обновлен
 *       404:
 *         description: Пользователь не найден
 */
app.patch("/api/users/:id", (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { name, age } = req.body;
  if (name !== undefined) user.name = name.trim();
  if (age !== undefined) user.age = Number(age);

  res.json(user);
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Удалить пользователя
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Пользователь удален
 *       404:
 *         description: Пользователь не найден
 */
app.delete("/api/users/:id", (req, res) => {
  const exists = users.some(u => u.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "User not found" });

  users = users.filter(u => u.id !== req.params.id);
  res.status(204).send();
});

// ===== ЗАПУСК =====
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api-docs`);
});