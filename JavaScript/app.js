/* 
 * @author: Pietro Costa Cardoso
 * @link: https://github.com/PietroCostaCardoso
 * Copyright (c) 2026. Todos os direitos reservados.
 * Este código está licenciado sob a MIT License.
 * O plágio ou remoção deste cabeçalho é estritamente proibido.
 */
const FormatUtils = {
    currency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },
    date(day, month, year) {
        const d = String(day).padStart(2, '0');
        const m = String(month).padStart(2, '0');
        return `${d}/${m}/${year}`;
    },
    formatCurrencyInput(value) {
        value = value.replace(/\D/g, "");
        value = (Number(value) / 100).toFixed(2) + "";
        value = value.replace(".", ",");
        value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        return "R$ " + value;
    },
    parseCurrency(value) {
        if (typeof value === 'number') return value;
        return Number(value.replace(/\D/g, "")) / 100;
    }
};

// --- MODEL ---
class Expense {
    constructor({ year, month, day, type, description, value, id = null }) {
        this.id = id || crypto.randomUUID();
        this.year = year;
        this.month = month;
        this.day = day;
        this.type = type;
        this.description = description;
        this.value = FormatUtils.parseCurrency(value);
    }

    isValid() {
        if (!this.year || !this.month || !this.day || !this.type || !this.description || !this.value) return false;
        if (isNaN(this.value) || this.value <= 0) return false;
        return true;
    }
}

// --- SERVICES ---
class StatisticsService {
    constructor(repository) {
        this.repository = repository;
    }

    calculateTotal() {
        const expenses = this.repository.getAll();
        return expenses.reduce((sum, expense) => sum + expense.value, 0);
    }

    getExpensesByCategory() {
        const expenses = this.repository.getAll();
        return expenses.reduce((acc, expense) => {
            acc[expense.type] = (acc[expense.type] || 0) + expense.value;
            return acc;
        }, {});
    }
}

// --- Repositorio---
class ExpenseRepository {
    constructor() {
        this.storageKey = 'expenses_v2';
    }

    save(expense) {
        const expenses = this.getAll();
        expenses.push(expense);
        this._persist(expenses);
        return expense;
    }

    getAll() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Database error:", error);
            return [];
        }
    }

    search(filter) {
        const expenses = this.getAll();
        return expenses.filter(d => {
            if (filter.year && d.year !== filter.year) return false;
            if (filter.month && d.month !== filter.month) return false;
            if (filter.day && d.day !== filter.day) return false;
            if (filter.type && d.type !== filter.type) return false;
            if (filter.description && !d.description.toLowerCase().includes(filter.description.toLowerCase())) return false;
            if (filter.value && d.value !== FormatUtils.parseCurrency(filter.value)) return false;
            return true;
        });
    }

    delete(id) {
        const expenses = this.getAll();
        const filtered = expenses.filter(d => d.id !== id);
        this._persist(filtered);
    }

    _persist(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
}

class InputMask {
    constructor(element) {
        this.element = element;
        if (this.element) {
            this.element.addEventListener('input', (e) => {
                e.target.value = FormatUtils.formatCurrencyInput(e.target.value);
            });
        }
    }
}

// --- VIEW ---
class ExpenseView {
    constructor() {
        this.elements = {
            year: document.getElementById('ano'),
            month: document.getElementById('mes'),
            day: document.getElementById('dia'),
            type: document.getElementById('tipo'),
            description: document.getElementById('descricao'),
            value: document.getElementById('valor'),
            list: document.getElementById('listaDespesas'),
            total: document.getElementById('totalDespesas'),
            btnRegister: document.getElementById('cadastrar-despesa'),
            btnSearch: document.getElementById('pesquisar-despesa'),
        };
        
        // Initialize Input Mask
        new InputMask(this.elements.value);
    }

    getFormData() {
        return {
            year: this.elements.year?.value,
            month: this.elements.month?.value,
            day: this.elements.day?.value,
            type: this.elements.type?.value,
            description: this.elements.description?.value,
            value: this.elements.value?.value
        };
    }

    clearForm() {
        if (!this.elements.year) return;
        this.elements.year.value = '';
        this.elements.month.value = '';
        this.elements.day.value = '';
        this.elements.type.value = '';
        this.elements.description.value = '';
        this.elements.value.value = '';
    }

    renderList(expenses) {
        if (!this.elements.list) return;

        this.elements.list.innerHTML = '';
        let total = 0;

        expenses.forEach(expense => {
            total += expense.value;
            const row = this.elements.list.insertRow();
            row.dataset.id = expense.id; // Add ID to the row for delegation

            row.insertCell(0).textContent = FormatUtils.date(expense.day, expense.month, expense.year);
            row.insertCell(1).textContent = this._getTypeLabel(expense.type);
            row.insertCell(2).textContent = expense.description;
            row.insertCell(3).textContent = FormatUtils.currency(expense.value);

            row.insertCell(4).innerHTML = `<button class="btn btn-danger btn-sm" data-action="delete"><i class="fas fa-times"></i></button>`;
        });

        if (this.elements.total) {
            this.elements.total.textContent = FormatUtils.currency(total);
        }
    }

    showFeedback(title, message, type) {
        const modalTitle = document.getElementById('modal_titulo');
        const modalBody = document.getElementById('modal_conteudo');
        const modalHeader = document.getElementById('modal_titulo_div');
        const modalBtn = document.getElementById('modal_btn');

        if (modalTitle) {
            modalTitle.textContent = title;
            modalBody.textContent = message;
            modalHeader.className = `modal-header text-${type}`;
            modalBtn.className = `btn btn-${type}`;
            $('#modalRegistraDespesa').modal('show');
        } else {
            alert(`${title}\n${message}`);
        }
    }

    _getTypeLabel(type) {
        const types = {
            '1': 'Alimentação',
            '2': 'Educação',
            '3': 'Lazer',
            '4': 'Saúde',
            '5': 'Transporte'
        };
        return types[type] || 'Outro';
    }
}

// --- CONTROLLER ---
class ExpenseController {
    constructor(repository, view) {
        this.repository = repository;
        this.view = view;
        this.statsService = new StatisticsService(repository);
        this.init();
    }

    init() {
        this.view.elements.btnRegister?.addEventListener('click', () => this.handleRegister());
        this.view.elements.btnSearch?.addEventListener('click', () => this.handleSearch());
        
        this.view.elements.list?.addEventListener('click', (event) => {
            const deleteButton = event.target.closest('[data-action="delete"]');
            if (deleteButton) {
                const row = event.target.closest('tr');
                if (row && row.dataset.id) {
                    this.handleDelete(row.dataset.id);
                }
            }
        });

        if (this.view.elements.list) {
            this.loadExpenses();
        }
    }

    handleRegister() {
        const data = this.view.getFormData();
        const expense = new Expense(data);

        if (expense.isValid()) {
            try {
                this.repository.save(expense);
                this.view.showFeedback('Sucesso', 'Despesa cadastrada com sucesso!', 'success');
                this.view.clearForm();
            } catch (error) {
                this.view.showFeedback('Erro', 'Falha ao gravar no banco de dados.', 'danger');
            }
        } else {
            this.view.showFeedback('Erro de Validação', 'Verifique se todos os campos foram preenchidos corretamente.', 'danger');
        }
    }

    handleSearch() {
        const data = this.view.getFormData();
        const filter = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== ''));
        const expenses = this.repository.search(filter);
        this.view.renderList(expenses);
    }

    handleDelete(id) {
        this.repository.delete(id);
        this.loadExpenses();
    }

    loadExpenses() {
        const expenses = this.repository.getAll();
        this.view.renderList(expenses);
    
        console.log("Total Expenses:", this.statsService.calculateTotal());
    }
}

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    const repository = new ExpenseRepository();
    const view = new ExpenseView();
    new ExpenseController(repository, view);
});
