/*
 * @author: Pietro Costa Cardoso
 * @link: https://github.com/PietroCostaCardoso
 * Copyright (c) 2026. Todos os direitos reservados.
 * Este código está licenciado sob a MIT License.
 * O plágio ou remoção deste cabeçalho é estritamente proibido.
 */

class Task {
    constructor({ name, completed = false, id = null, createdAt = Date.now() }) {
        this.id = id || crypto.randomUUID();
        this.name = name;
        this.completed = completed;
        this.createdAt = createdAt;
    }

    toggle() {
        this.completed = !this.completed;
    }

    updateName(newName) {
        this.name = newName;
    }
}

// --- Repositorio ---
class TaskRepository {
    constructor() {
        this.key = 'tasks_v3';
    }

    getAll() {
        try {
            const data = localStorage.getItem(this.key);
            return data ? JSON.parse(data).map(t => new Task(t)) : [];
        } catch (e) {
            console.error("Error loading tasks", e);
            return [];
        }
    }

    saveAll(tasks) {
        localStorage.setItem(this.key, JSON.stringify(tasks));
    }
}

// --- SERVICES ---
class NotificationSystem {
    constructor() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '9999',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        });
        document.body.appendChild(this.container);
    }

    show(message, type = 'success') {
        const toast = document.createElement('div');
        const colors = {
            success: '#28a745',
            danger: '#dc3545',
            info: '#17a2b8'
        };

        Object.assign(toast.style, {
            minWidth: '250px',
            padding: '15px',
            borderRadius: '5px',
            color: '#fff',
            backgroundColor: colors[type] || colors.info,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease-out',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        toast.innerHTML = `<span>${message}</span><i class="fas fa-times" style="cursor:pointer"></i>`;
        
        // Close button
        toast.querySelector('i').onclick = () => this._remove(toast);

        this.container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        setTimeout(() => this._remove(toast), 3000);
    }

    _remove(toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }
}

class TaskLogger {
    static log(action, details) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${action}:`, details);
    }
}

// --- VIEW ---
class TaskView {
    constructor() {
        this.listElement = document.getElementById("todo-list");
        this.inputElement = document.getElementById("item-input");
        this.formElement = document.getElementById("todo-add");
        this.countElement = document.getElementById("count-number");
        this.filterButtons = document.querySelectorAll(".filter-btn");
        this.clearButton = document.getElementById("clear-completed");
    }

    bindAddTask(handler) {
        this.formElement?.addEventListener("submit", event => {
            event.preventDefault();
            if (this.inputElement.value.trim()) {
                handler(this.inputElement.value);
                this.inputElement.value = "";
            }
        });
    }

    bindListEvents(handlers) {
        this.listElement?.addEventListener("click", event => {
            const target = event.target;
            const li = event.target.closest("li");
            if (!li) return;
            const id = li.dataset.id;
            const action = target.dataset.action;

            switch (action) {
                case "checkButton":
                    handlers.toggle(id);
                    break;
                case "deleteButton":
                    handlers.delete(id);
                    break;
                case "editButton":
                    this._showEditMode(li);
                    break;
                case "containerCancelButton":
                    this._hideEditMode(li);
                    break;
                case "containerEditButton":
                    const input = li.querySelector(".editInput");
                    handlers.edit(id, input.value);
                    break;
            }
        });
    }

    bindFilterChange(handler) {
        this.filterButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                this.filterButtons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                handler(btn.dataset.filter);
            });
        });
    }

    bindClearCompleted(handler) {
        this.clearButton?.addEventListener("click", handler);
    }

    render(tasks, filter = 'all') {
        if (!this.listElement) return;
        this.listElement.innerHTML = "";
        
       
        const filteredTasks = tasks.filter(task => {
            if (filter === 'active') return !task.completed;
            if (filter === 'completed') return task.completed;
            return true;
        });

        // contador
        const activeCount = tasks.filter(t => !t.completed).length;
        if (this.countElement) this.countElement.textContent = activeCount;

        
        if (filteredTasks.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.className = 'todo-empty';
            emptyState.textContent = 'Nenhuma tarefa encontrada.';
            this.listElement.appendChild(emptyState);
            return;
        }

        const fragment = document.createDocumentFragment();
        filteredTasks.forEach(task => {
            fragment.appendChild(this._createTaskElement(task));
        });
        this.listElement.appendChild(fragment);
    }

    _createTaskElement(task) {
        const li = document.createElement("li");
        li.className = `todo-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        li.innerHTML = `
            <button class="button-check" data-action="checkButton">
                <i class="fas fa-check ${task.completed ? "" : "displayNone"}"></i>
            </button>
            <p class="task-name">${this._escapeHtml(task.name)}</p>
            <i class="fas fa-edit" data-action="editButton"></i>
            <i class="fas fa-trash-alt" data-action="deleteButton"></i>
            <div class="editContainer">
                <input type="text" class="editInput" value="${this._escapeHtml(task.name)}">
                <button class="editButton" data-action="containerEditButton">Salvar</button>
                <button class="cancelButton" data-action="containerCancelButton">Cancelar</button>
            </div>
        `;
        return li;
    }

    _showEditMode(li) {
        document.querySelectorAll('.editContainer').forEach(el => el.style.display = 'none');
        li.querySelector(".editContainer").style.display = "flex";
        li.querySelector(".editInput").focus();
    }

    _hideEditMode(li) {
        li.querySelector(".editContainer").style.display = "none";
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// --- CONTROLLER ---
class TaskController {
    constructor(model, view) {
        this.repository = model;
        this.view = view;
        this.notification = new NotificationSystem();
        this.filter = 'all';

        this.tasks = this.repository.getAll();
        this._updateView();

        this.view.bindAddTask(this.handleAddTask.bind(this));
        this.view.bindFilterChange(this.handleFilterChange.bind(this));
        this.view.bindClearCompleted(this.handleClearCompleted.bind(this));
        this.view.bindListEvents({
            toggle: this.handleToggleTask.bind(this),
            delete: this.handleDeleteTask.bind(this),
            edit: this.handleEditTask.bind(this),
        });
    }

    _updateView() {
        this.repository.saveAll(this.tasks);
        this.view.render(this.tasks, this.filter);
    }

    handleAddTask(taskName) {
        this.tasks.push(new Task({ name: taskName }));
        this._updateView();
        this.notification.show('Tarefa adicionada com sucesso!', 'success');
        TaskLogger.log('ADD', taskName);
    }

    handleToggleTask(id) {
        const task = this.tasks.find(t => t.id == id);
        if (task) {
            task.toggle();
            this._updateView();
            TaskLogger.log('TOGGLE', task.id);
        }
    }

    handleDeleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id != id);
        this._updateView();
        this.notification.show('Tarefa removida.', 'danger');
        TaskLogger.log('DELETE', id);
    }

    handleEditTask(id, newName) {
        const task = this.tasks.find(t => t.id == id);
        if (task && newName.trim()) {
            task.updateName(newName);
            this._updateView();
            this.notification.show('Tarefa atualizada.', 'info');
            TaskLogger.log('EDIT', id);
        }
    }

    handleFilterChange(filter) {
        this.filter = filter;
        this._updateView();
    }

    handleClearCompleted() {
        this.tasks = this.tasks.filter(t => !t.completed);
        this._updateView();
        this.notification.show('Tarefas concluídas limpas.', 'info');
        TaskLogger.log('CLEAR', 'Completed tasks');
    }
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    new TaskController(new TaskRepository(), new TaskView());
});