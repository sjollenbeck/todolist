/**
 * Task Model
 * Representa uma tarefa
 */
class Task {
    constructor(data = {}) {
        this.id = data.id || this._generateId();
        this.name = data.name || '';
        this.description = data.description || '';
        this.status = data.status || 'Nova';
        this.startDateTime = data.startDateTime || null;
        this.endDateTime = data.endDateTime || null;
        this.deliveryDate = data.deliveryDate || null;
        this.categoryId = data.categoryId || null;
        this.clients = data.clients || [];
        this.subtasks = data.subtasks || [];
        this.priority = data.priority || 1;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Gera um ID único
     */
    _generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Valida os dados da tarefa
     */
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('O nome da tarefa é obrigatório');
        }

        if (!this.status) {
            errors.push('O status da tarefa é obrigatório');
        }

        const validStatuses = ['Nova', 'Em Andamento', 'Pausada', 'Cancelada', 'Concluida'];
        if (!validStatuses.includes(this.status)) {
            errors.push('Status inválido');
        }

        if (!this.categoryId) {
            errors.push('A categoria é obrigatória');
        }

        if (this.priority < 1 || this.priority > 10) {
            errors.push('A prioridade deve estar entre 1 e 10');
        }

        if (this.startDateTime && this.endDateTime) {
            const start = new Date(this.startDateTime);
            const end = new Date(this.endDateTime);
            if (end < start) {
                errors.push('A data de término não pode ser anterior à data de início');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Calcula o tempo decorrido em milissegundos
     */
    getElapsedTime() {
        if (!this.startDateTime) {
            return 0;
        }

        const start = new Date(this.startDateTime);
        const end = this.endDateTime ? new Date(this.endDateTime) : new Date();
        
        return end - start;
    }

    /**
     * Formata o tempo decorrido
     */
    getFormattedElapsedTime() {
        const elapsed = this.getElapsedTime();
        
        if (elapsed === 0) {
            return 'Não iniciada';
        }

        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Atualiza o timestamp de modificação
     */
    touch() {
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Converte para objeto simples
     */
    /**
     * Verifica se todas as subtarefas estão concluídas
     */
    allSubtasksCompleted() {
        if (!this.subtasks || this.subtasks.length === 0) {
            return true;
        }
        return this.subtasks.every(st => st.status === 'Concluida');
    }

    /**
     * Retorna o progresso das subtarefas
     */
    getSubtaskProgress() {
        if (!this.subtasks || this.subtasks.length === 0) {
            return { completed: 0, total: 0, percentage: 0 };
        }
        const completed = this.subtasks.filter(st => st.status === 'Concluida').length;
        const total = this.subtasks.length;
        const percentage = (completed / total) * 100;
        return { completed, total, percentage };
    }

    toObject() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            status: this.status,
            startDateTime: this.startDateTime,
            endDateTime: this.endDateTime,
            deliveryDate: this.deliveryDate,
            categoryId: this.categoryId,
            clients: this.clients,
            subtasks: this.subtasks,
            priority: this.priority,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Cria uma instância a partir de um objeto
     */
    static fromObject(obj) {
        return new Task(obj);
    }
}
