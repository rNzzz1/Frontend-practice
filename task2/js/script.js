const API = '/products';

// Загрузка товаров
async function loadProducts() {
    try {
        const res = await fetch(API);
        const products = await res.json();
        displayProducts(products);
    } catch (err) {
        console.error('Ошибка загрузки:', err);
    }
}

// Отображение товаров
function displayProducts(products) {
    const container = document.getElementById('products');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty">Товаров нет</div>';
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="product">
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="product-price">${p.price} ₽</div>
                <div class="product-id">ID: ${p.id}</div>
            </div>
            <div class="product-actions">
                <button class="btn-edit" onclick="openEdit(${p.id})">Изменить</button>
                <button class="btn-delete" onclick="deleteProduct(${p.id})">Удалить</button>
            </div>
        </div>
    `).join('');
}

// Добавление товара
document.getElementById('addForm').onsubmit = async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const price = document.getElementById('price').value;

    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price })
        });

        if (res.ok) {
            e.target.reset();
            loadProducts();
            alert('Товар добавлен!');
        }
    } catch (err) {
        alert('Ошибка добавления');
    }
};

// Удаление товара
async function deleteProduct(id) {
    if (!confirm('Удалить товар?')) return;

    try {
        const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadProducts();
            alert('Товар удалён!');
        }
    } catch (err) {
        alert('Ошибка удаления');
    }
}

// Открыть редактирование
async function openEdit(id) {
    try {
        const res = await fetch(`${API}/${id}`);
        const product = await res.json();

        document.getElementById('editId').value = product.id;
        document.getElementById('editName').value = product.name;
        document.getElementById('editPrice').value = product.price;

        document.getElementById('modal').style.display = 'block';
    } catch (err) {
        alert('Ошибка загрузки');
    }
}

// Сохранить изменения
document.getElementById('editForm').onsubmit = async (e) => {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value;
    const price = document.getElementById('editPrice').value;

    try {
        const res = await fetch(`${API}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price })
        });

        if (res.ok) {
            document.getElementById('modal').style.display = 'none';
            loadProducts();
            alert('Товар обновлён!');
        }
    } catch (err) {
        alert('Ошибка обновления');
    }
};

// Закрытие модального окна
document.querySelector('.close').onclick = () => {
    document.getElementById('modal').style.display = 'none';
};

window.onclick = (e) => {
    const modal = document.getElementById('modal');
    if (e.target === modal) modal.style.display = 'none';
};

// Обновление списка
document.getElementById('refresh').onclick = loadProducts;

// Загрузка при старте
loadProducts();
