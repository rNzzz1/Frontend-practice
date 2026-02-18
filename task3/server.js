const express = require('express');
const app = express();
const port = 3000;

let users = [
  { id: 1, name: 'Петр', age: 16 },
  { id: 2, name: 'Иван', age: 18 },
  { id: 3, name: 'Дарья', age: 20 },
];

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Главная страница');
});

app.get('/users', (req, res) => {
  res.send(JSON.stringify(users));
});

app.get('/users/:id', (req, res) => {
  let user = users.find(u => u.id == req.params.id);
  res.send(JSON.stringify(user));
});

app.post('/users', (req, res) => {
  const { name, age } = req.body;
  const newUser = { id: Date.now(), name, age };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.put('/users/:id', (req, res) => {
  const user = users.find(u => u.id == req.params.id);
  const { name, age } = req.body;
  if (name !== undefined) user.name = name;
  if (age !== undefined) user.age = age;
  res.json(user);
});

app.patch('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  const user = users[userIndex];
  const { name, age } = req.body;
  if (name !== undefined) user.name = name;
  if (age !== undefined) user.age = age;
  users[userIndex] = user;
  res.json(user);
});

app.delete('/users/:id', (req, res) => {
  users = users.filter(u => u.id != req.params.id);
  res.send('Ok');
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
