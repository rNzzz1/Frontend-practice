const API_URL = '/products';

// Получение всех товаров
async function loadProducts() {
    try {
        const response = await fetch(API_URL);
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        alert('Не удалось загрузить товары');
    }
}

// Отображение товаров
function displayProducts(products) {
    const productsList = document.getElementById('productsList');
    
    if (products.length === 0) {
        productsList.innerHTML = '<div class="empty-state">Список товаров пуст</div>';
        return;
    }

    productsList.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-info">
                <h3>${escapeHtml(product.name)}</h3>
                <div class="product-price">${product.price.toFixed(2)} ₽</div>
                <div class="product-id">ID: ${product.id}</div>
            </div>
            <div class="product-actions">
                <button class="btn btn-edit" onclick="openEditModal(${product.id})">✏️ Изменить</button>
                <button class="btn btn-delete" onclick="deleteProduct(${product.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

// Добавление товара
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, price })
        });

        if (response.ok) {
            document.getElementById('addProductForm').reset();
            loadProducts();
            showNotification('Товар успешно добавлен!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Ошибка добавления товара', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Не удалось добавить товар', 'error');
    }
});

// Удаление товара
async function deleteProduct(id) {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadProducts();
            showNotification('Товар успешно удалён!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Ошибка удаления товара', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Не удалось удалить товар', 'error');
    }
}

// Открытие модального окна редактирования
async function openEditModal(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const product = await response.json();

        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductPrice').value = product.price;

        document.getElementById('editModal').style.display = 'block';
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Не удалось загрузить данные товара', 'error');
    }
}

// Закрытие модального окна
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('editModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Обновление товара
document.getElementById('editProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('editProductName').value;
    const price = document.getElementById('editProductPrice').value;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, price })
        });

        if (response.ok) {
            document.getElementById('editModal').style.display = 'none';
            loadProducts();
            showNotification('Товар успешно обновлён!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Ошибка обновления товара', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Не удалось обновить товар', 'error');
    }
});

// Обновление списка
document.getElementById('refreshBtn').addEventListener('click', loadProducts);

// Уведомления
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Защита от XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Загрузка товаров при загрузке страницы
document.addEventListener('DOMContentLoaded', loadProducts);
