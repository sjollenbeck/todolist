/**
 * Client Model
 * Representa um cliente
 */
class Client {
    constructor(data = {}) {
        this.id = data.id || this._generateId();
        this.name = data.name || '';
        this.description = data.description || '';
        this.priority = data.priority || 1;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Gera um ID único
     */
    _generateId() {
        return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Valida os dados do cliente
     */
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('O nome do cliente é obrigatório');
        }

        if (this.priority < 1 || this.priority > 10) {
            errors.push('A prioridade deve estar entre 1 e 10');
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
            priority: this.priority,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Cria uma instância a partir de um objeto
     */
    static fromObject(obj) {
        return new Client(obj);
    }
}
