/**
 * Subtask Model
 * Representa uma subtarefa
 */
class Subtask {
    constructor(data = {}) {
        this.id = data.id || this._generateId();
        this.name = data.name || '';
        this.description = data.description || '';
        this.status = data.status || 'Pendente';
        this.order = data.order || 0;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Gera um ID único
     */
    _generateId() {
        return 'subtask_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Valida os dados da subtarefa
     */
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('O nome da subtarefa é obrigatório');
        }

        const validStatuses = ['Pendente', 'Concluida'];
        if (!validStatuses.includes(this.status)) {
            errors.push('Status inválido');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
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
    toObject() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            status: this.status,
            order: this.order,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Cria uma instância a partir de um objeto
     */
    static fromObject(obj) {
        return new Subtask(obj);
    }
}
