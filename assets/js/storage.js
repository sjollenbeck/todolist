/**
 * IndexedDB Storage Manager
 * Implementa persistência de dados usando IndexedDB
 * Segue princípios SOLID: Single Responsibility e Dependency Inversion
 */
class StorageManager {
    constructor(dbName, version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    /**
     * Inicializa o banco de dados
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                logger.error('Erro ao abrir o banco de dados', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                logger.info('Banco de dados aberto com sucesso', this.dbName);
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Criar object stores se não existirem
                if (!db.objectStoreNames.contains('categories')) {
                    const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: false });
                    categoryStore.createIndex('priority', 'priority', { unique: false });
                    logger.info('Object Store "categories" criado');
                }

                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: false });
                    taskStore.createIndex('categoryId', 'categoryId', { unique: false });
                    taskStore.createIndex('status', 'status', { unique: false });
                    taskStore.createIndex('priority', 'priority', { unique: false });
                    logger.info('Object Store "tasks" criado');
                }

                if (!db.objectStoreNames.contains('clients')) {
                    const clientStore = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: false });
                    clientStore.createIndex('priority', 'priority', { unique: false });
                    logger.info('Object Store "clients" criado');
                }
            };
        });
    }

    /**
     * Adiciona um item ao store
     */
    async add(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(item);

            request.onsuccess = () => {
                logger.debug(`Item adicionado ao store ${storeName}`, item);
                resolve(request.result);
            };

            request.onerror = () => {
                logger.error(`Erro ao adicionar item ao store ${storeName}`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Atualiza um item no store
     */
    async update(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            request.onsuccess = () => {
                logger.debug(`Item atualizado no store ${storeName}`, item);
                resolve(request.result);
            };

            request.onerror = () => {
                logger.error(`Erro ao atualizar item no store ${storeName}`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Remove um item do store
     */
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                logger.debug(`Item removido do store ${storeName}`, id);
                resolve();
            };

            request.onerror = () => {
                logger.error(`Erro ao remover item do store ${storeName}`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Busca um item por ID
     */
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                logger.debug(`Item recuperado do store ${storeName}`, request.result);
                resolve(request.result);
            };

            request.onerror = () => {
                logger.error(`Erro ao buscar item no store ${storeName}`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Retorna todos os itens do store
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                logger.debug(`Todos os itens recuperados do store ${storeName}`, request.result.length);
                resolve(request.result);
            };

            request.onerror = () => {
                logger.error(`Erro ao buscar todos os itens do store ${storeName}`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Busca itens por índice
     */
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                logger.debug(`Itens recuperados por índice ${indexName} do store ${storeName}`, request.result);
                resolve(request.result);
            };

            request.onerror = () => {
                logger.error(`Erro ao buscar itens por índice ${indexName}`, request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Limpa todos os itens de um store
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                logger.info(`Store ${storeName} limpo`);
                resolve();
            };

            request.onerror = () => {
                logger.error(`Erro ao limpar store ${storeName}`, request.error);
                reject(request.error);
            };
        });
    }
}

// Instância global do storage manager
const storage = new StorageManager('omni:personal:todolist');
