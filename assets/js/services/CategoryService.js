/**
 * Category Service
 * Serviço para gerenciamento de categorias
 * Implementa CRUD completo seguindo princípios SOLID
 */
class CategoryService {
    constructor(storageManager) {
        this.storage = storageManager;
        this.storeName = 'categories';
    }

    /**
     * Cria uma nova categoria
     */
    async create(categoryData) {
        try {
            const category = new Category(categoryData);
            const validation = category.validate();

            if (!validation.isValid) {
                logger.warn('Validação de categoria falhou', validation.errors);
                throw new Error(validation.errors.join(', '));
            }

            await this.storage.add(this.storeName, category.toObject());
            logger.info('Categoria criada com sucesso', category.name);
            return category;
        } catch (error) {
            logger.error('Erro ao criar categoria', error);
            throw error;
        }
    }

    /**
     * Busca uma categoria por ID
     */
    async getById(id) {
        try {
            const data = await this.storage.get(this.storeName, id);
            if (!data) {
                return null;
            }
            return Category.fromObject(data);
        } catch (error) {
            logger.error('Erro ao buscar categoria', error);
            throw error;
        }
    }

    /**
     * Retorna todas as categorias ordenadas por prioridade
     */
    async getAll() {
        try {
            const data = await this.storage.getAll(this.storeName);
            const categories = data.map(item => Category.fromObject(item));
            
            // Ordenar por prioridade (maior primeiro)
            categories.sort((a, b) => b.priority - a.priority);
            
            logger.debug(`${categories.length} categorias recuperadas`);
            return categories;
        } catch (error) {
            logger.error('Erro ao buscar categorias', error);
            throw error;
        }
    }

    /**
     * Atualiza uma categoria existente
     */
    async update(id, categoryData) {
        try {
            const existing = await this.getById(id);
            if (!existing) {
                throw new Error('Categoria não encontrada');
            }

            const category = new Category({
                ...existing.toObject(),
                ...categoryData,
                id: id,
                createdAt: existing.createdAt
            });

            category.touch();
            const validation = category.validate();

            if (!validation.isValid) {
                logger.warn('Validação de categoria falhou', validation.errors);
                throw new Error(validation.errors.join(', '));
            }

            await this.storage.update(this.storeName, category.toObject());
            logger.info('Categoria atualizada com sucesso', category.name);
            return category;
        } catch (error) {
            logger.error('Erro ao atualizar categoria', error);
            throw error;
        }
    }

    /**
     * Remove uma categoria
     */
    async delete(id) {
        try {
            await this.storage.delete(this.storeName, id);
            logger.info('Categoria removida com sucesso', id);
        } catch (error) {
            logger.error('Erro ao remover categoria', error);
            throw error;
        }
    }

    /**
     * Busca categorias por prioridade
     */
    async getByPriority(priority) {
        try {
            const data = await this.storage.getByIndex(this.storeName, 'priority', priority);
            return data.map(item => Category.fromObject(item));
        } catch (error) {
            logger.error('Erro ao buscar categorias por prioridade', error);
            throw error;
        }
    }
}
