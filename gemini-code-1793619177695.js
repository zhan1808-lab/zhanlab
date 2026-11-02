// --- ИНИЦИАЛИЗАЦИЯ INDEXEDDB И БАЗЫ ДАННЫХ ---
const DB_NAME = 'ZhaNutriBalanceDB';
const DB_VERSION = 1;
let db = null;

const defaultProducts = [
    { id: 'p1', name: 'Куриная грудка (филе)', category: 'Мясо и птица', calories: 113, protein: 23.6, fat: 1.9, carbs: 0.4, fiber: 0 },
    { id: 'p2', name: 'Говядина нежирная', category: 'Мясо и птица', calories: 187, protein: 19.0, fat: 12.0, carbs: 0, fiber: 0 },
    { id: 'p3', name: 'Лосось (семга)', category: 'Рыба и морепродукты', calories: 208, protein: 20.0, fat: 13.0, carbs: 0, fiber: 0 },
    { id: 'p4', name: 'Творог 5%', category: 'Молочные продукты', calories: 121, protein: 16.5, fat: 5.0, carbs: 1.8, fiber: 0 },
    { id: 'p5', name: 'Молоко 2.5%', category: 'Молочные продукты', calories: 52, protein: 2.8, fat: 2.5, carbs: 4.7, fiber: 0 },
    { id: 'p6', name: 'Яйцо куриное (1 шт = 60г)', category: 'Яйца', calories: 157, protein: 12.7, fat: 11.5, carbs: 0.7, fiber: 0 },
    { id: 'p7', name: 'Овсяная крупа', category: 'Крупы', calories: 389, protein: 16.9, fat: 6.9, carbs: 66.3, fiber: 10.6 },
    { id: 'p8', name: 'Рис белый отварной', category: 'Крупы', calories: 130, protein: 2.7, fat: 0.3, carbs: 28.2, fiber: 0.4 },
    { id: 'p9', name: 'Гречневая крупа (ядрица)', category: 'Крупы', calories: 343, protein: 12.6, fat: 3.3, carbs: 62.1, fiber: 11.3 },
    { id: 'p10', name: 'Макароны из твердых сортов', category: 'Макаронные изделия', calories: 351, protein: 12.0, fat: 1.5, carbs: 70.5, fiber: 3.5 },
    { id: 'p11', name: 'Огурцы свежие', category: 'Овощи', calories: 15, protein: 0.8, fat: 0.1, carbs: 2.8, fiber: 0.7 },
    { id: 'p12', name: 'Помидоры свежие', category: 'Овощи', calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fiber: 1.4 },
    { id: 'p13', name: 'Брокколи отварная', category: 'Овощи', calories: 35, protein: 3.0, fat: 0.4, carbs: 6.6, fiber: 3.3 },
    { id: 'p14', name: 'Банан', category: 'Фрукты и ягоды', calories: 89, protein: 1.5, fat: 0.3, carbs: 21.8, fiber: 2.6 },
    { id: 'p15', name: 'Яблоко', category: 'Фрукты и ягоды', calories: 47, protein: 0.4, fat: 0.4, carbs: 9.8, fiber: 1.8 },
    { id: 'p16', name: 'Орехи грецкие', category: 'Орехи и семена', calories: 654, protein: 16.2, fat: 60.8, carbs: 11.1, fiber: 6.7 },
    { id: 'p17', name: 'Масло оливковое', category: 'Масла и жиры', calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0 },
    { id: 'p18', name: 'Хлеб ржано-цельнозерновой', category: 'Выпечка и хлеб', calories: 213, protein: 6.6, fat: 1.2, carbs: 41.0, fiber: 7.2 },
    { id: 'p19', name: 'Шоколад горький 70%', category: 'Сладости', calories: 539, protein: 7.9, fat: 35.4, carbs: 48.2, fiber: 7.0 },
    { id: 'p20', name: 'Кофе черный без сахара', category: 'Напитки', calories: 2, protein: 0.2, fat: 0, carbs: 0.3, fiber: 0 }
];

let currentDate = new Date().toISOString().split('T')[0];
let activeCategory = 'Все';
let currentCategoryList = [...defaultProducts];
let currentEditingProduct = null;
let selectedProductForMeal = null;
let currentRecipeIngredients = [];
let chartsInstances = {};

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains('products')) {
                const prodStore = database.createObjectStore('products', { keyPath: 'id' });
                defaultProducts.forEach(p => prodStore.put(p));
            }
            if (!database.objectStoreNames.contains('diaries')) {
                database.createObjectStore('diaries', { keyPath: 'date' });
            }
            if (!database.objectStoreNames.contains('recipes')) {
                database.createObjectStore('recipes', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
            }
            if (!database.objectStoreNames.contains('weightHistory')) {
                database.createObjectStore('weightHistory', { keyPath: 'date' });
            }
        };
    });
}

// --- УПРАВЛЕНИЕ ДАННЫМИ И ХРАНИЛИЩЕМ ---
async function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbPut(storeName, value) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// --- ИНИЦИАЛИЗАЦИЯ ИНТЕРФЕЙСА ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        setupNavigation();
        setupThemeToggle();
        setupDateNavigator();
        setupProductsPanel();
        setupSettings();
        setupModals();
        setupCalendarTab();
        setupStatsTab();
        setupRecipesTab();
        setupBackupImport();

        await loadProducts();
        await loadUserSettings();
        await renderDiary();
    } catch (e) {
        console.error('Initialization error:', e);
    }
});

// Навигация по вкладкам
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');

            if (btn.getAttribute('data-tab') === 'calendar') renderCalendar();
            if (btn.getAttribute('data-tab') === 'stats') updateStatsCharts();
            if (btn.getAttribute('data-tab') === 'recipes') renderRecipesList();
        });
    });
}

// Переключение тем
function setupThemeToggle() {
    const btn = document.getElementById('themeToggleBtn');
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    btn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    });
}

// Навигация по датам
function setupDateNavigator() {
    const updateDisplay = () => {
        const display = document.getElementById('currentDateDisplay');
        const todayStr = new Date().toISOString().split('T')[0];
        if (currentDate === todayStr) {
            display.textContent = `Сегодня, ${formatDateReadable(currentDate)}`;
        } else {
            display.textContent = formatDateReadable(currentDate);
        }
    };

    document.getElementById('prevDayBtn').addEventListener('click', async () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 1);
        currentDate = d.toISOString().split('T')[0];
        updateDisplay();
        await renderDiary();
    });

    document.getElementById('nextDayBtn').addEventListener('click', async () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 1);
        currentDate = d.toISOString().split('T')[0];
        updateDisplay();
        await renderDiary();
    });

    document.getElementById('todayBtn').addEventListener('click', async () => {
        currentDate = new Date().toISOString().split('T')[0];
        updateDisplay();
        await renderDiary();
    });

    document.getElementById('copyYesterdayBtn').addEventListener('click', async () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 1);
        const prevStr = d.toISOString().split('T')[0];
        const prevDiary = await dbGet('diaries', prevStr);
        if (!prevDiary || !prevDiary.meals || prevDiary.meals.length === 0) {
            alert('За вчерашний день нет записей в рационе.');
            return;
        }
        let currentDiary = await dbGet('diaries', currentDate) || { date: currentDate, meals: [] };
        currentDiary.meals = [...currentDiary.meals, ...JSON.parse(JSON.stringify(prevDiary.meals))];
        await dbPut('diaries', currentDiary);
        await renderDiary();
        alert('Рацион вчерашнего дня успешно скопирован!');
    });

    updateDisplay();
}

function formatDateReadable(dateStr) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('ru-RU', options);
}

// --- БАЗА ПРОДУКТОВ И СВОРАЧИВАЕМАЯ ПАНЕЛЬ ---
function setupProductsPanel() {
    const togglePanel = document.getElementById('toggleProductsPanel');
    const panelBody = document.getElementById('productsPanelBody');
    togglePanel.addEventListener('click', () => {
        panelBody.style.display = panelBody.style.display === 'none' ? 'flex' : 'none';
        togglePanel.querySelector('.arrow-icon').classList.toggle('fa-rotate-180');
    });

    const categories = ['Все', 'Мясо и птица', 'Рыба и морепродукты', 'Молочные продукты', 'Яйца', 'Крупы', 'Макаронные изделия', 'Овощи', 'Фрукты и ягоды', 'Орехи и семена', 'Масла и жиры', 'Соусы', 'Выпечка и хлеб', 'Сладости', 'Напитки', 'Прочее'];
    const chipsContainer = document.getElementById('categoriesChips');
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `chip ${cat === 'Все' ? 'active' : ''}`;
        btn.textContent = cat;
        btn.addEventListener('click', () => {
            chipsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = cat;
            filterProducts();
        });
        chipsContainer.appendChild(btn);
    });

    document.getElementById('productSearchInput').addEventListener('input', filterProducts);
    document.getElementById('openAddProductModal').addEventListener('click', () => openProductModal());
}

async function loadProducts() {
    const products = await dbGetAll('products');
    currentCategoryList = products;
    filterProducts();
}

function filterProducts() {
    const query = document.getElementById('productSearchInput').value.toLowerCase();
    const container = document.getElementById('productsListContainer');
    container.innerHTML = '';

    const filtered = currentCategoryList.filter(p => {
        const matchCat = activeCategory === 'Все' || p.category === activeCategory;
        const matchQuery = p.name.toLowerCase().includes(query);
        return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">Продукты не найдены</div>';
        return;
    }

    filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `
            <div class="product-item-info">
                <h5>${p.name}</h5>
                <p>${p.category}</p>
            </div>
            <div class="product-item-macros">
                <div>${p.calories} ккал</div>
                <small>Кл: ${p.fiber || 0}г</small>
            </div>
        `;
        div.addEventListener('click', () => openAddMealModal(p));
        container.appendChild(div);
    });
}

// --- РАЦИОН И ПЕРЕСЧЕТ ---
async function renderDiary() {
    const diary = await dbGet('diaries', currentDate) || { date: currentDate, meals: [] };
    const settings = await dbGet('settings', 'userNorms') || { calories: 2000, protein: 100, fat: 70, carbs: 250, fiber: 30 };

    let totalCal = 0, totalProt = 0, totalFat = 0, totalCarb = 0, totalFiber = 0;

    const listContainer = document.getElementById('mealsList');
    listContainer.innerHTML = '';

    if (diary.meals.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">Ваш рацион пуст. Выберите продукты из базы справа.</div>';
    } else {
        diary.meals.forEach((m, index) => {
            const ratio = m.weight / 100;
            const cals = Math.round(m.calories * ratio);
            const prot = (m.protein * ratio).toFixed(1);
            const fat = (m.fat * ratio).toFixed(1);
            const carb = (m.carbs * ratio).toFixed(1);
            const fiber = ((m.fiber || 0) * ratio).toFixed(1);

            totalCal += cals;
            totalProt += parseFloat(prot);
            totalFat += parseFloat(fat);
            totalCarb += parseFloat(carb);
            totalFiber += parseFloat(fiber);

            const item = document.createElement('div');
            item.className = 'meal-item';
            item.innerHTML = `
                <div class="meal-info">
                    <h4>${m.name}</h4>
                    <p>${m.weight} г | Кл: ${fiber}г</p>
                </div>
                <div class="meal-actions">
                    <span>${cals} ккал</span>
                    <button class="delete-btn" onclick="removeMeal(${index})"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            listContainer.appendChild(item);
        });
    }

    // Обновляем сводку
    document.getElementById('calConsumed').textContent = totalCal;
    document.getElementById('calGoal').textContent = settings.calories;

    document.getElementById('proteinText').textContent = `${totalProt.toFixed(0)} / ${settings.protein} г`;
    document.getElementById('proteinProgress').style.width = `${Math.min(100, (totalProt / settings.protein) * 100)}%`;

    document.getElementById('fatText').textContent = `${totalFat.toFixed(0)} / ${settings.fat} г`;
    document.getElementById('fatProgress').style.width = `${Math.min(100, (totalFat / settings.fat) * 100)}%`;

    document.getElementById('carbText').textContent = `${totalCarb.toFixed(0)} / ${settings.carbs} г`;
    document.getElementById('carbProgress').style.width = `${Math.min(100, (totalCarb / settings.carbs) * 100)}%`;

    document.getElementById('fiberText').textContent = `${totalFiber.toFixed(1)} / ${settings.fiber} г`;
    document.getElementById('fiberProgress').style.width = `${Math.min(100, (totalFiber / settings.fiber) * 100)}%`;
}

async function removeMeal(index) {
    let diary = await dbGet('diaries', currentDate);
    if (diary && diary.meals) {
        diary.meals.splice(index, 1);
        await dbPut('diaries', diary);
        await renderDiary();
    }
}

// --- МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ ПРОДУКТА ---
function openAddMealModal(product) {
    selectedProductForMeal = product;
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductCategory').textContent = product.category;
    document.getElementById('mealWeightInput').value = 100;
    updateMealPreview();
    document.getElementById('addMealModal').classList.add('active');
}

function updateMealPreview() {
    if (!selectedProductForMeal) return;
    const weight = parseFloat(document.getElementById('mealWeightInput').value) || 0;
    const ratio = weight / 100;
    document.getElementById('previewCal').textContent = Math.round(selectedProductForMeal.calories * ratio);
    document.getElementById('previewProtein').textContent = (selectedProductForMeal.protein * ratio).toFixed(1);
    document.getElementById('previewFat').textContent = (selectedProductForMeal.fat * ratio).toFixed(1);
    document.getElementById('previewCarbs').textContent = (selectedProductForMeal.carbs * ratio).toFixed(1);
    document.getElementById('previewFiber').textContent = ((selectedProductForMeal.fiber || 0) * ratio).toFixed(1);
}

// --- НАСТРОЙКИ И МИФФЛИН — САН ЖЕОР ---
async function loadUserSettings() {
    const settings = await dbGet('settings', 'userNorms');
    if (settings) {
        document.getElementById('settingGender').value = settings.gender || 'male';
        document.getElementById('settingAge').value = settings.age || 25;
        document.getElementById('settingHeight').value = settings.height || 170;
        document.getElementById('settingWeight').value = settings.weight || 65;
        document.getElementById('settingActivity').value = settings.activity || '1.2';
        document.getElementById('settingGoal').value = settings.goal || 'maintain';

        document.getElementById('targetCalories').value = settings.calories;
        document.getElementById('targetProtein').value = settings.protein;
        document.getElementById('targetFat').value = settings.fat;
        document.getElementById('targetCarbs').value = settings.carbs;
        document.getElementById('targetFiber').value = settings.fiber;
    }
}

function setupSettings() {
    document.getElementById('calculateNormsBtn').addEventListener('click', () => {
        const gender = document.getElementById('settingGender').value;
        const age = parseFloat(document.getElementById('settingAge').value);
        const height = parseFloat(document.getElementById('settingHeight').value);
        const weight = parseFloat(document.getElementById('settingWeight').value);
        const activity = parseFloat(document.getElementById('settingActivity').value);
        const goal = document.getElementById('settingGoal').value;

        // Формула Миффлина — Сан Жеора
        let bmr = (10 * weight) + (6.25 * height) - (5 * age);
        if (gender === 'male') {
            bmr += 5;
        } else {
            bmr -= 161;
        }

        let tdee = bmr * activity;
        let targetCals = tdee;

        if (goal === 'lose') targetCals *= 0.85;
        if (goal === 'gain') targetCals *= 1.15;

        targetCals = Math.round(targetCals);
        const protein = Math.round(weight * 1.8); // 1.8г на кг веса
        const fat = Math.round((targetCals * 0.3) / 9); // 30% калорий из жиров
        const carbs = Math.round((targetCals - (protein * 4) - (fat * 9)) / 4);
        const fiber = gender === 'male' ? 38 : 25;

        document.getElementById('targetCalories').value = targetCals;
        document.getElementById('targetProtein').value = protein;
        document.getElementById('targetFat').value = fat;
        document.getElementById('targetCarbs').value = carbs;
        document.getElementById('targetFiber').value = fiber;

        alert('Нормы успешно рассчитаны по формуле Миффлина — Сан Жеора!');
    });

    document.getElementById('userSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const settings = {
            key: 'userNorms',
            gender: document.getElementById('settingGender').value,
            age: parseFloat(document.getElementById('settingAge').value),
            height: parseFloat(document.getElementById('settingHeight').value),
            weight: parseFloat(document.getElementById('settingWeight').value),
            activity: document.getElementById('settingActivity').value,
            goal: document.getElementById('settingGoal').value,
            calories: parseFloat(document.getElementById('targetCalories').value),
            protein: parseFloat(document.getElementById('targetProtein').value),
            fat: parseFloat(document.getElementById('targetFat').value),
            carbs: parseFloat(document.getElementById('targetCarbs').value),
            fiber: parseFloat(document.getElementById('targetFiber').value)
        };
        await dbPut('settings', settings);
        await renderDiary();
        alert('Настройки успешно сохранены!');
    });
}

// --- КАЛЕНДАРЬ ---
let currentCalendarMonth = new Date();

function setupCalendarTab() {
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
        renderCalendar();
    });
}

async function renderCalendar() {
    const title = document.getElementById('calendarMonthTitle');
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    title.textContent = `${monthNames[month]} ${year}`;

    const grid = document.getElementById('calendarDaysGrid');
    grid.innerHTML = '';

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const diaries = await dbGetAll('diaries');
    const diariesMap = {};
    diaries.forEach(d => diariesMap[d.date] = d);

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        grid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayDiv = document.createElement('div');
        dayDiv.className = `calendar-day ${dateStr === currentDate ? 'active' : ''}`;

        const diary = diariesMap[dateStr];
        let totalCals = 0;
        if (diary && diary.meals) {
            diary.meals.forEach(m => {
                totalCals += Math.round(m.calories * (m.weight / 100));
            });
        }

        dayDiv.innerHTML = `
            <span class="day-num">${day}</span>
            <span class="day-cals">${totalCals ? totalCals + ' ккал' : ''}</span>
            ${totalCals ? '<div class="day-dot"></div>' : ''}
        `;

        dayDiv.addEventListener('click', async () => {
            currentDate = dateStr;
            document.querySelectorAll('.nav-btn')[0].click(); // Переход на вкладку рациона
            await renderDiary();
        });

        grid.appendChild(dayDiv);
    }
}

// --- КОНСТРУКТОР РЕЦЕПТОВ ---
function setupRecipesTab() {
    document.getElementById('openCreateRecipeModal').addEventListener('click', () => openRecipeModal());
    document.getElementById('addIngredientBtn').addEventListener('click', () => openSelectIngredientModal());
    document.getElementById('recipeCookedWeight').addEventListener('input', calculateRecipeTotals);

    document.getElementById('saveRecipeBtn').addEventListener('click', async () => {
        const name = document.getElementById('recipeNameInput').value;
        const cookedWeight = parseFloat(document.getElementById('recipeCookedWeight').value);
        if (!name || currentRecipeIngredients.length === 0 || !cookedWeight) {
            alert('Заполните название рецепта, добавьте ингредиенты и укажите вес готового блюда.');
            return;
        }

        let rawWeight = 0, sumCal = 0, sumProt = 0, sumFat = 0, sumCarb = 0, sumFiber = 0;
        currentRecipeIngredients.forEach(ing => {
            const ratio = ing.weight / 100;
            rawWeight += ing.weight;
            sumCal += ing.calories * ratio;
            sumProt += ing.protein * ratio;
            sumFat += ing.fat * ratio;
            sumCarb += ing.carbs * ratio;
            sumFiber += (ing.fiber || 0) * ratio;
        });

        const ratio100 = 100 / cookedWeight;

        const recipe = {
            id: 'rec_' + Date.now(),
            name,
            ingredients: currentRecipeIngredients,
            rawWeight,
            cookedWeight,
            calories: Math.round(sumCal * ratio100),
            protein: parseFloat((sumProt * ratio100).toFixed(1)),
            fat: parseFloat((sumFat * ratio100).toFixed(1)),
            carbs: parseFloat((sumCarb * ratio100).toFixed(1)),
            fiber: parseFloat((sumFiber * ratio100).toFixed(1)),
            category: 'Прочее'
        };

        // Также сохраняем рецепт как продукт в общую базу для быстрого добавления в рацион
        await dbPut('recipes', recipe);
        await dbPut('products', recipe);

        document.getElementById('recipeModal').classList.remove('active');
        await loadProducts();
        await renderRecipesList();
        alert('Рецепт успешно сохранен и добавлен в базу продуктов!');
    });
}

function openRecipeModal() {
    currentRecipeIngredients = [];
    document.getElementById('recipeNameInput').value = '';
    document.getElementById('recipeRawWeight').value = '0';
    document.getElementById('recipeCookedWeight').value = '100';
    renderRecipeIngredients();
    document.getElementById('recipeModal').classList.add('active');
}

async function renderRecipesList() {
    const recipes = await dbGetAll('recipes');
    const container = document.getElementById('recipesListContainer');
    container.innerHTML = '';

    if (recipes.length === 0) {
        container.innerHTML = '<div class="empty-state">У вас пока нет сохраненных рецептов. Создайте свое блюдо!</div>';
        return;
    }

    recipes.forEach(r => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.innerHTML = `
            <h4>${r.name}</h4>
            <div class="recipe-card-macros">
                На 100г: ${r.calories} ккал | Б: ${r.protein} | Ж: ${r.fat} | У: ${r.carbs} | Кл: ${r.fiber}г
            </div>
            <div class="recipe-card-actions">
                <button class="btn-primary btn-sm" onclick="addRecipeToDiary('${r.id}')"><i class="fa-solid fa-plus"></i> В рацион</button>
                <button class="delete-btn" onclick="deleteRecipe('${r.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function deleteRecipe(id) {
    await dbDelete('recipes', id);
    await dbDelete('products', id);
    await loadProducts();
    await renderRecipesList();
}

async function addRecipeToDiary(id) {
    const recipe = await dbGet('recipes', id);
    if (!recipe) return;
    openAddMealModal(recipe);
}

function openSelectIngredientModal() {
    const modal = document.getElementById('selectIngredientModal');
    const listContainer = document.getElementById('ingredientSelectList');
    const searchInput = document.getElementById('ingredientSearchInput');

    const renderList = async () => {
        const products = await dbGetAll('products');
        const query = searchInput.value.toLowerCase();
        listContainer.innerHTML = '';

        products.filter(p => p.name.toLowerCase().includes(query)).forEach(p => {
            const div = document.createElement('div');
            div.className = 'product-item';
            div.innerHTML = `<div><h5>${p.name}</h5><small>${p.calories} ккал / 100г</small></div>`;
            div.addEventListener('click', () => {
                const weight = prompt(`Введите вес ингредиента "${p.name}" в граммах:`, '100');
                if (weight && !isNaN(weight)) {
                    currentRecipeIngredients.push({ ...p, weight: parseFloat(weight) });
                    renderRecipeIngredients();
                    modal.classList.remove('active');
                }
            });
            listContainer.appendChild(div);
        });
    };

    searchInput.oninput = renderList;
    renderList();
    modal.classList.add('active');
}

function renderRecipeIngredients() {
    const container = document.getElementById('recipeIngredientsList');
    container.innerHTML = '';
    if (currentRecipeIngredients.length === 0) {
        container.innerHTML = '<div class="empty-state">Ингредиенты не добавлены</div>';
        calculateRecipeTotals();
        return;
    }

    currentRecipeIngredients.forEach((ing, index) => {
        const div = document.createElement('div');
        div.className = 'meal-item';
        div.innerHTML = `
            <div><h5>${ing.name}</h5><small>${ing.weight} г</small></div>
            <button class="delete-btn" onclick="removeRecipeIngredient(${index})"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
    calculateRecipeTotals();
}

function removeRecipeIngredient(index) {
    currentRecipeIngredients.splice(index, 1);
    renderRecipeIngredients();
}

function calculateRecipeTotals() {
    let rawWeight = 0, sumCal = 0, sumProt = 0, sumFat = 0, sumCarb = 0, sumFiber = 0;
    currentRecipeIngredients.forEach(ing => {
        const ratio = ing.weight / 100;
        rawWeight += ing.weight;
        sumCal += ing.calories * ratio;
        sumProt += ing.protein * ratio;
        sumFat += ing.fat * ratio;
        sumCarb += ing.carbs * ratio;
        sumFiber += (ing.fiber || 0) * ratio;
    });

    document.getElementById('recipeRawWeight').value = rawWeight;
    const cookedWeight = parseFloat(document.getElementById('recipeCookedWeight').value) || rawWeight || 1;
    const ratio100 = 100 / cookedWeight;

    document.getElementById('recipeCalcCal').textContent = Math.round(sumCal * ratio100);
    document.getElementById('recipeCalcProt').textContent = (sumProt * ratio100).toFixed(1);
    document.getElementById('recipeCalcFat').textContent = (sumFat * ratio100).toFixed(1);
    document.getElementById('recipeCalcCarb').textContent = (sumCarb * ratio100).toFixed(1);
    document.getElementById('recipeCalcFiber').textContent = (sumFiber * ratio100).toFixed(1);
}

// --- СТАТИСТИКА И ГРАФИКИ ---
let currentStatsDays = 7;

function setupStatsTab() {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentStatsDays = parseInt(e.target.getAttribute('data-days'));
            updateStatsCharts();
        });
    });

    document.getElementById('saveWeightBtn').addEventListener('click', async () => {
        const val = parseFloat(document.getElementById('currentWeightInput').value);
        if (!val) return;
        await dbPut('weightHistory', { date: new Date().toISOString().split('T')[0], weight: val });
        document.getElementById('currentWeightInput').value = '';
        updateStatsCharts();
        alert('Вес успешно записан!');
    });
}

async function updateStatsCharts() {
    const diaries = await dbGetAll('diaries');
    const weightHistory = await dbGetAll('weightHistory');

    const labels = [];
    const calData = [];
    const fiberData = [];
    let sumP = 0, sumF = 0, sumC = 0, count = 0;

    for (let i = currentStatsDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));

        const diary = diaries.find(item => item.date === dateStr);
        let cals = 0, fib = 0, p = 0, f = 0, c = 0;
        if (diary && diary.meals) {
            diary.meals.forEach(m => {
                const ratio = m.weight / 100;
                cals += Math.round(m.calories * ratio);
                fib += (m.fiber || 0) * ratio;
                p += m.protein * ratio;
                f += m.fat * ratio;
                c += m.carbs * ratio;
            });
            sumP += p; sumF += f; sumC += c; count++;
        }
        calData.push(cals);
        fiberData.push(fib);
    }

    // График калорий
    renderChart('caloriesChart', 'bar', labels, calData, 'Калории (ккал)', '#A64B60');
    // График клетчатки
    renderChart('fiberChart', 'line', labels, fiberData, 'Клетчатка (г)', '#6B9080');

    // График БЖУ (среднее)
    const avgP = count ? Math.round(sumP / count) : 0;
    const avgF = count ? Math.round(sumF / count) : 0;
    const avgC = count ? Math.round(sumC / count) : 0;
    renderDoughnutChart('macrosChart', ['Белки', 'Жиры', 'Углеводы'], [avgP, avgF, avgC], ['#D9A5B3', '#A64B60', '#6B9080']);

    // График веса
    weightHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    const wLabels = weightHistory.map(w => w.date);
    const wData = weightHistory.map(w => w.weight);
    renderChart('weightChart', 'line', wLabels, wData, 'Вес (кг)', '#D9A5B3');
}

function renderChart(canvasId, type, labels, data, label, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (chartsInstances[canvasId]) {
        chartsInstances[canvasId].destroy();
    }
    chartsInstances[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: color,
                borderColor: color,
                borderWidth: 2,
                tension: 0.3,
                fill: type === 'line'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function renderDoughnutChart(canvasId, labels, data, colors) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (chartsInstances[canvasId]) {
        chartsInstances[canvasId].destroy();
    }
    chartsInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// --- УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ И РЕЗЕРВНЫМ КОПИРОВАНИЕМ ---
function setupModals() {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        });
    });

    document.getElementById('mealWeightInput').addEventListener('input', updateMealPreview);

    document.getElementById('confirmAddMealBtn').addEventListener('click', async () => {
        if (!selectedProductForMeal) return;
        const weight = parseFloat(document.getElementById('mealWeightInput').value);
        if (!weight || weight <= 0) {
            alert('Введите корректный вес.');
            return;
        }

        let diary = await dbGet('diaries', currentDate) || { date: currentDate, meals: [] };
        diary.meals.push({
            name: selectedProductForMeal.name,
            weight: weight,
            calories: selectedProductForMeal.calories,
            protein: selectedProductForMeal.protein,
            fat: selectedProductForMeal.fat,
            carbs: selectedProductForMeal.carbs,
            fiber: selectedProductForMeal.fiber || 0
        });

        await dbPut('diaries', diary);
        document.getElementById('addMealModal').classList.remove('active');
        await renderDiary();
    });

    document.getElementById('productEditForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const product = {
            id: currentEditingProduct ? currentEditingProduct.id : 'prod_' + Date.now(),
            name: document.getElementById('prodName').value,
            category: document.getElementById('prodCategory').value,
            calories: parseFloat(document.getElementById('prodCal').value),
            protein: parseFloat(document.getElementById('prodProt').value),
            fat: parseFloat(document.getElementById('prodFat').value),
            carbs: parseFloat(document.getElementById('prodCarb').value),
            fiber: parseFloat(document.getElementById('prodFiber').value)
        };
        await dbPut('products', product);
        document.getElementById('productEditModal').classList.remove('active');
        await loadProducts();
    });
}

function openProductModal(product = null) {
    currentEditingProduct = product;
    document.getElementById('productModalTitle').textContent = product ? 'Редактировать продукт' : 'Новый продукт';
    document.getElementById('prodName').value = product ? product.name : '';
    document.getElementById('prodCategory').value = product ? product.category : 'Прочее';
    document.getElementById('prodCal').value = product ? product.calories : '';
    document.getElementById('prodProt').value = product ? product.protein : '';
    document.getElementById('prodFat').value = product ? product.fat : '';
    document.getElementById('prodCarb').value = product ? product.carbs : '';
    document.getElementById('prodFiber').value = product ? product.fiber || 0 : 0;
    document.getElementById('productEditModal').classList.add('active');
}

function setupBackupImport() {
    document.getElementById('backupBtn').addEventListener('click', async () => {
        const data = {
            products: await dbGetAll('products'),
            diaries: await dbGetAll('diaries'),
            recipes: await dbGetAll('recipes'),
            settings: await dbGetAll('settings'),
            weightHistory: await dbGetAll('weightHistory')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ZhaNutriBalance_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });

    document.getElementById('importFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.products) for (let p of data.products) await dbPut('products', p);
                if (data.diaries) for (let d of data.diaries) await dbPut('diaries', d);
                if (data.recipes) for (let r of data.recipes) await dbPut('recipes', r);
                if (data.settings) for (let s of data.settings) await dbPut('settings', s);
                if (data.weightHistory) for (let w of data.weightHistory) await dbPut('weightHistory', w);
                
                await loadProducts();
                await renderDiary();
                alert('Данные успешно импортированы!');
            } catch (err) {
                alert('Ошибка при импорте файла резервной копии.');
            }
        };
        reader.readAsText(file);
    });
}