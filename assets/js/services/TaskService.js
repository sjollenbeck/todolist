/**
 * Task Service
 * Serviço para gerenciamento de tarefas
 * Implementa CRUD completo seguindo princípios SOLID
 */
class TaskService {
    constructor(storageManager) {
        this.storage = storageManager;
        this.storeName = 'tasks';
    }

    /**
     * Cria uma nova tarefa
     */
    async create(taskData) {
        try {
            const task = new Task(taskData);
            const validation = task.validate();

            if (!validation.isValid) {
                logger.warn('Validação de tarefa falhou', validation.errors);
                throw new Error(validation.errors.join(', '));
            }

            await this.storage.add(this.storeName, task.toObject());
            logger.info('Tarefa criada com sucesso', task.name);
            return task;
        } catch (error) {
            logger.error('Erro ao criar tarefa', error);
            throw error;
        }
    }

    /**
     * Busca uma tarefa por ID
     */
    async getById(id) {
        try {
            const data = await this.storage.get(this.storeName, id);
            if (!data) {
                return null;
            }
            return Task.fromObject(data);
        } catch (error) {
            logger.error('Erro ao buscar tarefa', error);
            throw error;
        }
    }

    /**
     * Retorna todas as tarefas
     */
    async getAll() {
        try {
            const data = await this.storage.getAll(this.storeName);
            const tasks = data.map(item => Task.fromObject(item));
            
            // Ordenar por prioridade (maior primeiro) e data de criação
            tasks.sort((a, b) => {
                if (b.priority !== a.priority) {
                    return b.priority - a.priority;
                }
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            
            logger.debug(`${tasks.length} tarefas recuperadas`);
            return tasks;
        } catch (error) {
            logger.error('Erro ao buscar tarefas', error);
            throw error;
        }
    }

    /**
     * Atualiza uma tarefa existente
     */
    async update(id, taskData) {
        try {
            const existing = await this.getById(id);
            if (!existing) {
                throw new Error('Tarefa não encontrada');
            }

            const task = new Task({
                ...existing.toObject(),
                ...taskData,
                id: id,
                createdAt: existing.createdAt
            });

            task.touch();
            const validation = task.validate();

            if (!validation.isValid) {
                logger.warn('Validação de tarefa falhou', validation.errors);
                throw new Error(validation.errors.join(', '));
            }

            await this.storage.update(this.storeName, task.toObject());
            logger.info('Tarefa atualizada com sucesso', task.name);
            return task;
        } catch (error) {
            logger.error('Erro ao atualizar tarefa', error);
            throw error;
        }
    }

    /**
     * Remove uma tarefa
     */
    async delete(id) {
        try {
            await this.storage.delete(this.storeName, id);
            logger.info('Tarefa removida com sucesso', id);
        } catch (error) {
            logger.error('Erro ao remover tarefa', error);
            throw error;
        }
    }

    /**
     * Busca tarefas por categoria
     */
    async getByCategory(categoryId) {
        try {
            const data = await this.storage.getByIndex(this.storeName, 'categoryId', categoryId);
            return data.map(item => Task.fromObject(item));
        } catch (error) {
            logger.error('Erro ao buscar tarefas por categoria', error);
            throw error;
        }
    }

    /**
     * Busca tarefas por status
     */
    async getByStatus(status) {
        try {
            const data = await this.storage.getByIndex(this.storeName, 'status', status);
            return data.map(item => Task.fromObject(item));
        } catch (error) {
            logger.error('Erro ao buscar tarefas por status', error);
            throw error;
        }
    }

    /**
     * Filtra tarefas por múltiplos critérios
     */
    async filter(filters) {
        try {
            let tasks = await this.getAll();

            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                tasks = tasks.filter(task => 
                    task.name.toLowerCase().includes(searchLower) ||
                    task.description.toLowerCase().includes(searchLower)
                );
            }

            if (filters.status) {
                tasks = tasks.filter(task => task.status === filters.status);
            }

            if (filters.category) {
                tasks = tasks.filter(task => task.categoryId === filters.category);
            }

            if (filters.client) {
                tasks = tasks.filter(task => task.clients.includes(filters.client));
            }

            return tasks;
        } catch (error) {
            logger.error('Erro ao filtrar tarefas', error);
            throw error;
        }
    }
}
