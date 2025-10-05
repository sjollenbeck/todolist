/**
 * Client Service
 * Serviço para gerenciamento de clientes
 * Implementa CRUD completo seguindo princípios SOLID
 */
class ClientService {
    constructor(storageManager) {
        this.storage = storageManager;
        this.storeName = 'clients';
    }

    /**
     * Cria um novo cliente
     */
    async create(clientData) {
        try {
            const client = new Client(clientData);
            const validation = client.validate();

            if (!validation.isValid) {
                logger.warn('Validação de cliente falhou', validation.errors);
                throw new Error(validation.errors.join(', '));
            }

            await this.storage.add(this.storeName, client.toObject());
            logger.info('Cliente criado com sucesso', client.name);
            return client;
        } catch (error) {
            logger.error('Erro ao criar cliente', error);
            throw error;
        }
    }

    /**
     * Busca um cliente por ID
     */
    async getById(id) {
        try {
            const data = await this.storage.get(this.storeName, id);
            if (!data) {
                return null;
            }
            return Client.fromObject(data);
        } catch (error) {
            logger.error('Erro ao buscar cliente', error);
            throw error;
        }
    }

    /**
     * Retorna todos os clientes ordenados por prioridade
     */
    async getAll() {
        try {
            const data = await this.storage.getAll(this.storeName);
            const clients = data.map(item => Client.fromObject(item));
            
            // Ordenar por prioridade (maior primeiro)
            clients.sort((a, b) => b.priority - a.priority);
            
            logger.debug(`${clients.length} clientes recuperados`);
            return clients;
        } catch (error) {
            logger.error('Erro ao buscar clientes', error);
            throw error;
        }
    }

    /**
     * Atualiza um cliente existente
     */
    async update(id, clientData) {
        try {
            const existing = await this.getById(id);
            if (!existing) {
                throw new Error('Cliente não encontrado');
            }

            const client = new Client({
                ...existing.toObject(),
                ...clientData,
                id: id,
                createdAt: existing.createdAt
            });

            client.touch();
            const validation = client.validate();

            if (!validation.isValid) {
                logger.warn('Validação de cliente falhou', validation.errors);
                throw new Error(validation.errors.join(', '));
            }

            await this.storage.update(this.storeName, client.toObject());
            logger.info('Cliente atualizado com sucesso', client.name);
            return client;
        } catch (error) {
            logger.error('Erro ao atualizar cliente', error);
            throw error;
        }
    }

    /**
     * Remove um cliente
     */
    async delete(id) {
        try {
            await this.storage.delete(this.storeName, id);
            logger.info('Cliente removido com sucesso', id);
        } catch (error) {
            logger.error('Erro ao remover cliente', error);
            throw error;
        }
    }

    /**
     * Busca clientes por prioridade
     */
    async getByPriority(priority) {
        try {
            const data = await this.storage.getByIndex(this.storeName, 'priority', priority);
            return data.map(item => Client.fromObject(item));
        } catch (error) {
            logger.error('Erro ao buscar clientes por prioridade', error);
            throw error;
        }
    }
}
