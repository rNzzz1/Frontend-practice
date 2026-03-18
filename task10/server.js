const crypto = require('crypto');
const path = require('path');

function loadExpress() {
  try {
    return require('express');
  } catch (_error) {
    const fallbacks = [
      '../task3/node_modules/express',
      '../task2/node_modules/express',
      '../task4-5/server-shop/node_modules/express',
      '../task4-5/server-swagger/node_modules/express',
    ];

    for (const candidate of fallbacks) {
      try {
        return require(candidate);
      } catch (_innerError) {
        // try next fallback
      }
    }

    throw new Error('express is not installed');
  }
}

function loadNanoid() {
  try {
    return require('nanoid');
  } catch (_error) {
    const fallbacks = [
      '../task4-5/server-shop/node_modules/nanoid',
      '../task4-5/server-swagger/node_modules/nanoid',
      '../task4-5/client/node_modules/nanoid',
    ];

    for (const candidate of fallbacks) {
      try {
        return require(candidate);
      } catch (_innerError) {
        // try next fallback
      }
    }

    return {
      nanoid(size = 10) {
        return crypto.randomBytes(size).toString('hex').slice(0, size);
      },
    };
  }
}

function loadBcrypt() {
  try {
    return require('bcrypt');
  } catch (_error) {
    function scryptAsync(password, salt) {
      return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(derivedKey);
        });
      });
    }

    return {
      async hash(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const key = await scryptAsync(String(password), salt);
        return `scrypt$${salt}$${key.toString('hex')}`;
      },
      async compare(password, storedHash) {
        if (!String(storedHash).startsWith('scrypt$')) {
          return false;
        }

        const [, salt, expectedHex] = String(storedHash).split('$');
        const actual = await scryptAsync(String(password), salt);
        const expected = Buffer.from(expectedHex, 'hex');

        if (expected.length !== actual.length) {
          return false;
        }

        return crypto.timingSafeEqual(expected, actual);
      },
    };
  }
}

function loadJwt() {
  try {
    return require('jsonwebtoken');
  } catch (_error) {
    function toBase64Url(input) {
      return Buffer.from(input)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    }

    function fromBase64Url(input) {
      const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
      const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
      return Buffer.from(normalized + pad, 'base64');
    }

    function parseExpires(expiresIn) {
      if (typeof expiresIn === 'number') {
        return expiresIn;
      }

      const match = String(expiresIn).trim().match(/^(\d+)([smhd])$/i);
      if (!match) {
        return 900;
      }

      const amount = Number(match[1]);
      const unit = match[2].toLowerCase();
      const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };

      return amount * multipliers[unit];
    }

    function sign(payload, secret, options = {}) {
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: 'HS256', typ: 'JWT' };
      const claims = { ...payload, iat: now };

      if (options.expiresIn !== undefined) {
        claims.exp = now + parseExpires(options.expiresIn);
      }

      const encodedHeader = toBase64Url(JSON.stringify(header));
      const encodedPayload = toBase64Url(JSON.stringify(claims));
      const body = `${encodedHeader}.${encodedPayload}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      return `${body}.${signature}`;
    }

    function verify(token, secret) {
      const [encodedHeader, encodedPayload, encodedSignature] = String(token).split('.');
      if (!encodedHeader || !encodedPayload || !encodedSignature) {
        throw new Error('jwt malformed');
      }

      const body = `${encodedHeader}.${encodedPayload}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const expectedBuffer = Buffer.from(expectedSignature);
      const actualBuffer = Buffer.from(encodedSignature);

      if (expectedBuffer.length !== actualBuffer.length) {
        throw new Error('invalid signature');
      }
      if (!crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
        throw new Error('invalid signature');
      }

      const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8'));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp !== undefined && now >= payload.exp) {
        throw new Error('jwt expired');
      }
      if (payload.nbf !== undefined && now < payload.nbf) {
        throw new Error('jwt not active');
      }

      return payload;
    }

    return { sign, verify };
  }
}

const express = loadExpress();
const bcrypt = loadBcrypt();
const jwt = loadJwt();
const { nanoid } = loadNanoid();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SALT_ROUNDS = 10;
const ACCESS_SECRET = process.env.ACCESS_SECRET || process.env.JWT_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh_secret';
const ACCESS_EXPIRES_IN = process.env.ACCESS_EXPIRES_IN || '15s';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '15s';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let users = [];
const refreshTokens = new Set();
const defaultCatalog = [
  {
    title: 'Logitech G Pro X',
    category: 'Keyboard',
    description: 'Механическая игровая клавиатура',
    price: 120,
  },
  {
    title: 'Razer DeathAdder V3',
    category: 'Mouse',
    description: 'Игровая мышь 26000 DPI',
    price: 90,
  },
  {
    title: 'SteelSeries Arctis 7',
    category: 'Headset',
    description: 'Беспроводная гарнитура',
    price: 150,
  },
  {
    title: 'HyperX Pulsefire',
    category: 'Mouse',
    description: 'RGB игровая мышь',
    price: 70,
  },
  {
    title: 'Corsair K95',
    category: 'Keyboard',
    description: 'Механическая клавиатура RGB',
    price: 200,
  },
  {
    title: 'Xbox Controller',
    category: 'Gamepad',
    description: 'Оригинальный геймпад Xbox',
    price: 65,
  },
  {
    title: 'PlayStation DualSense',
    category: 'Gamepad',
    description: 'Геймпад PS5',
    price: 75,
  },
  {
    title: 'Razer Mousepad XXL',
    category: 'Mousepad',
    description: 'Большой коврик для мыши',
    price: 30,
  },
  {
    title: 'Logitech G733',
    category: 'Headset',
    description: 'RGB гарнитура',
    price: 130,
  },
  {
    title: 'Asus ROG Keyboard',
    category: 'Keyboard',
    description: 'Премиум клавиатура',
    price: 180,
  },
];

function createDefaultProducts() {
  return defaultCatalog.map((item) => ({
    id: nanoid(10),
    title: item.title,
    category: item.category,
    description: item.description,
    price: item.price,
  }));
}

let products = createDefaultProducts();

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

function toPublicProduct(product) {
  return {
    id: product.id,
    title: product.title,
    category: product.category,
    description: product.description,
    price: product.price,
  };
}

function parsePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    return null;
  }
  return price;
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      jti: nanoid(12),
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

function getRefreshTokenFromHeaders(req) {
  const header = req.headers['x-refresh-token'];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header ? String(header).trim() : '';
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'Missing or invalid Authorization header',
    });
  }

  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.post('/api/auth/register', async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({
      error: 'email, first_name, last_name, password are required',
    });
  }

  const normalizedEmail = normalizeEmail(email);
  const existingUser = users.find((user) => user.email === normalizedEmail);

  if (existingUser) {
    return res.status(409).json({ error: 'user with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);

  const user = {
    id: nanoid(10),
    email: normalizedEmail,
    first_name: String(first_name).trim(),
    last_name: String(last_name).trim(),
    password: passwordHash,
  };

  users.push(user);

  return res.status(201).json(toPublicUser(user));
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = users.find((item) => item.email === normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(String(password), user.password);

  if (!isValidPassword) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);

  return res.status(200).json({ accessToken, refreshToken });
});

app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = getRefreshTokenFromHeaders(req);

  if (!refreshToken) {
    return res.status(400).json({ error: 'refresh token is required' });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'invalid refresh token' });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((item) => item.id === payload.sub);

    if (!user) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ error: 'user not found' });
    }

    refreshTokens.delete(refreshToken);

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    return res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (_error) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: 'invalid or expired refresh token' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = users.find((item) => item.id === req.user.sub);

  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  return res.status(200).json(toPublicUser(user));
});

app.post('/api/products', authMiddleware, (req, res) => {
  const { title, category, description, price } = req.body;

  if (!title || !category || !description || price === undefined) {
    return res.status(400).json({
      error: 'title, category, description, price are required',
    });
  }

  const parsedPrice = parsePrice(price);
  if (parsedPrice === null) {
    return res.status(400).json({ error: 'price must be a non-negative number' });
  }

  const product = {
    id: nanoid(10),
    title: String(title).trim(),
    category: String(category).trim(),
    description: String(description).trim(),
    price: parsedPrice,
  };

  products.push(product);

  return res.status(201).json(toPublicProduct(product));
});

app.get('/api/products', authMiddleware, (req, res) => {
  return res.status(200).json(products.map(toPublicProduct));
});

app.get('/api/products/:id', authMiddleware, (req, res) => {
  const product = products.find((item) => item.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'product not found' });
  }

  return res.status(200).json(toPublicProduct(product));
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const product = products.find((item) => item.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'product not found' });
  }

  const { title, category, description, price } = req.body;

  if (title !== undefined) {
    product.title = String(title).trim();
  }
  if (category !== undefined) {
    product.category = String(category).trim();
  }
  if (description !== undefined) {
    product.description = String(description).trim();
  }
  if (price !== undefined) {
    const parsedPrice = parsePrice(price);
    if (parsedPrice === null) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }
    product.price = parsedPrice;
  }

  return res.status(200).json(toPublicProduct(product));
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const product = products.find((item) => item.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'product not found' });
  }

  products = products.filter((item) => item.id !== req.params.id);
  return res.status(200).json({ deleted: true });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Task9 server started at http://localhost:${PORT}`);
  });
}

module.exports = app;
