/**
 * TodoList Application
 * AplicaÃ§Ã£o principal usando Alpine.js
 */

// Inicializar serviÃ§os
let categoryService, taskService, clientService;

// FunÃ§Ã£o para inicializar a aplicaÃ§Ã£o
async function initializeApp() {
    try {
        await storage.init();
        
        categoryService = new CategoryService(storage);
        taskService = new TaskService(storage);
        clientService = new ClientService(storage);
        
        logger.info('AplicaÃ§Ã£o inicializada com sucesso');
    } catch (error) {
        logger.error('Erro ao inicializar aplicaÃ§Ã£o', error);
        alert('Erro ao inicializar a aplicaÃ§Ã£o. Verifique o console para mais detalhes.');
    }
}

// Componente principal Alpine.js
function todoApp() {
    return {
        // Estado
        theme: 'light',
        currentView: 'tasks',
        settingsExpanded: false,
        categories: [],
        tasks: [],
        clients: [],
        filteredTasks: [],
        
        // Filtros
        taskFilters: {
            search: '',
            status: '',
            category: ''
        },
        
        // FormulÃ¡rios
        categoryForm: {
            id: null,
            name: '',
            color: '#0d6efd',
            icon: 'bi bi-folder',
            priority: 5
        },
        
        taskForm: {
            id: null,
            name: '',
            description: '',
            status: 'Nova',
            startDateTime: '',
            endDateTime: '',
            deliveryDate: '',
            categoryId: '',
            clients: [],
            subtasks: [],
            priority: 5
        },
        
        // Subtask form
        subtaskForm: {
            name: '',
            description: '',
            status: 'Pendente'
        },
        
        draggedSubtaskIndex: null,
        
        clientForm: {
            id: null,
            name: '',
            description: '',
            priority: 5
        },
        
        // Perfil do usuário
        userProfile: {
            name: localStorage.getItem('userProfile.name') || '',
            email: localStorage.getItem('userProfile.email') || '',
            company: localStorage.getItem('userProfile.company') || ''
        },
        
        // Configurações de notificações
        notificationSettings: {
            enabled: localStorage.getItem('notification.enabled') === 'true',
            intervalMinutes: parseInt(localStorage.getItem('notification.intervalMinutes')) || 30,
            statusFilter: JSON.parse(localStorage.getItem('notification.statusFilter') || '["Nova", "Em Andamento", "Pausada"]'),
            categoryFilter: JSON.parse(localStorage.getItem('notification.categoryFilter') || '[]')
        },
        
        notificationTimer: null,
        
        // Status Report
        statusReport: '',
        
        // Dashboard
        dashboardTasks: [],
        dashboardData: {
            totalTasks: 0,
            statusCounts: {},
            onTime: 0,
            overdue: 0
        },
        selectedDashboardTasks: [],
        selectedReportTasks: [],
        
        // InicializaÃ§Ã£o
        async init() {
            await initializeApp();
            await this.loadAll();
            await this.normalizeDates(); // Normalizar datas antigas
            this.loadTheme();
            this.filterTasks();
            this.initNotifications(); // Inicializar notificações
            
            // Atualizar tempo decorrido a cada minuto
            setInterval(() => {
                this.tasks = [...this.tasks];
            }, 60000);
        },
        
        // Carregar todos os dados
        async loadAll() {
            try {
                this.categories = await categoryService.getAll();
                this.tasks = await taskService.getAll();
                this.clients = await clientService.getAll();
                
                logger.info('Dados carregados:', {
                    categorias: this.categories.length,
                    tarefas: this.tasks.length,
                    clientes: this.clients.length
                });
                
                if (this.tasks.length > 0) {
                    // Log de todas as tarefas com deliveryDate
                    const tasksWithDelivery = this.tasks.filter(t => t.deliveryDate);
                    logger.debug(`Tarefas com Previsão de Entrega: ${tasksWithDelivery.length}/${this.tasks.length}`);
                    
                    tasksWithDelivery.forEach(t => {
                        logger.debug('Tarefa com entrega:', {
                            id: t.id,
                            name: t.name,
                            deliveryDate: t.deliveryDate,
                            deliveryDateType: typeof t.deliveryDate
                        });
                    });
                }
            } catch (error) {
                logger.error('Erro ao carregar dados', error);
            }
        },
        
        // Normalizar datas antigas (executado uma vez na inicialização)
        async normalizeDates() {
            try {
                let updated = 0;
                
                logger.debug('Iniciando normalização de', this.tasks.length, 'tarefas');
                
                for (const task of this.tasks) {
                    let needsUpdate = false;
                    let normalizedDate = task.deliveryDate;
                    
                    // Se a data está no formato ISO completo, converter para YYYY-MM-DD
                    if (task.deliveryDate && task.deliveryDate.includes('T')) {
                        const date = new Date(task.deliveryDate);
                        if (!isNaN(date.getTime())) {
                            const year = date.getUTCFullYear();
                            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                            const day = String(date.getUTCDate()).padStart(2, '0');
                            normalizedDate = `${year}-${month}-${day}`;
                            needsUpdate = true;
                            
                            logger.debug('Normalizando data:', {
                                taskId: task.id,
                                oldDate: task.deliveryDate,
                                newDate: normalizedDate
                            });
                        }
                    }
                    
                    // Se não tem campo subtasks ou é undefined
                    if (!task.hasOwnProperty('subtasks') || task.subtasks === undefined) {
                        needsUpdate = true;
                        logger.debug('Adicionando campo subtasks para tarefa:', task.name);
                    }
                    
                    // Se subtasks existe mas não é array, corrigir
                    if (task.subtasks && !Array.isArray(task.subtasks)) {
                        needsUpdate = true;
                        logger.warn('Campo subtasks não é array, corrigindo:', task.name);
                    }
                    
                    if (needsUpdate) {
                        // Criar objeto plain sem proxies do Alpine.js
                        const taskData = {
                            id: task.id,
                            name: task.name,
                            description: task.description,
                            status: task.status,
                            startDateTime: task.startDateTime,
                            endDateTime: task.endDateTime,
                            deliveryDate: normalizedDate,
                            categoryId: task.categoryId,
                            clients: [...(task.clients || [])],
                            subtasks: task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : [],
                            priority: task.priority,
                            createdAt: task.createdAt,
                            updatedAt: task.updatedAt
                        };
                        
                        await taskService.update(task.id, taskData);
                        updated++;
                    }
                }
                
                if (updated > 0) {
                    logger.info(`✅ ${updated} tarefa(s) normalizada(s) com sucesso`);
                    await this.loadAll(); // Recarregar dados atualizados
                    this.filterTasks(); // Atualizar filtros
                } else {
                    logger.debug('Nenhuma tarefa precisou ser normalizada');
                }
            } catch (error) {
                logger.error('Erro ao normalizar datas:', error);
            }
        },
        
        // ========== TEMA ==========
        loadTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            this.theme = savedTheme;
            document.body.setAttribute('data-bs-theme', savedTheme);
        },
        
        toggleTheme() {
            this.theme = this.theme === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-bs-theme', this.theme);
            localStorage.setItem('theme', this.theme);
            logger.info(`Tema alterado para ${this.theme}`);
        },
        
        // ========== CATEGORIAS ==========
        openCategoryModal(category = null) {
            if (category) {
                this.categoryForm = {
                    id: category.id,
                    name: category.name,
                    color: category.color,
                    icon: category.icon,
                    priority: category.priority
                };
            } else {
                this.categoryForm = {
                    id: null,
                    name: '',
                    color: '#0d6efd',
                    icon: 'bi bi-folder',
                    priority: 5
                };
            }
            
            const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
            modal.show();
        },
        
        async saveCategory() {
            try {
                // Criar objeto simples (plain object) removendo proxies do Alpine.js
                const categoryData = {
                    id: this.categoryForm.id,
                    name: this.categoryForm.name,
                    color: this.categoryForm.color,
                    icon: this.categoryForm.icon,
                    priority: parseInt(this.categoryForm.priority)
                };
                
                if (categoryData.id) {
                    await categoryService.update(categoryData.id, categoryData);
                } else {
                    delete categoryData.id; // Remover id null ao criar
                    await categoryService.create(categoryData);
                }
                
                await this.loadAll();
                bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
                this.showToast('Categoria salva com sucesso!');
            } catch (error) {
                alert('Erro: ' + error.message);
            }
        },
        
        editCategory(category) {
            this.openCategoryModal(category);
        },
        
        async deleteCategory(id) {
            if (!confirm('Deseja realmente excluir esta categoria?')) {
                return;
            }
            
            try {
                await categoryService.delete(id);
                await this.loadAll();
                this.showToast('Categoria excluÃ­da com sucesso!');
            } catch (error) {
                alert('Erro ao excluir categoria: ' + error.message);
            }
        },
        
        // ========== TAREFAS ==========
        openTaskModal(task = null) {
            if (task) {
                const formattedDeliveryDate = task.deliveryDate ? this.formatDateForInput(task.deliveryDate) : '';
                logger.debug('Abrindo tarefa para edição:', {
                    id: task.id,
                    name: task.name,
                    deliveryDate: task.deliveryDate,
                    formattedDeliveryDate: formattedDeliveryDate,
                    subtasks: task.subtasks || [],
                    subtasksCount: (task.subtasks || []).length
                });
                
                // Garantir que subtasks é sempre um array limpo
                let subtasksArray = [];
                
                logger.debug('task.subtasks raw:', task.subtasks, 'isArray:', Array.isArray(task.subtasks), 'length:', task.subtasks?.length);
                
                if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
                    subtasksArray = task.subtasks.map(st => ({
                        id: st.id,
                        name: st.name,
                        description: st.description || '',
                        status: st.status,
                        order: st.order || 0,
                        createdAt: st.createdAt,
                        updatedAt: st.updatedAt
                    }));
                    logger.info(`Carregadas ${subtasksArray.length} subtarefas da tarefa ${task.name}`);
                } else {
                    logger.debug('Nenhuma subtarefa encontrada para a tarefa:', task.name);
                }
                
                this.taskForm = {
                    id: task.id,
                    name: task.name,
                    description: task.description,
                    status: task.status,
                    startDateTime: task.startDateTime ? this.formatDateTimeForInput(task.startDateTime) : '',
                    endDateTime: task.endDateTime ? this.formatDateTimeForInput(task.endDateTime) : '',
                    deliveryDate: formattedDeliveryDate,
                    categoryId: task.categoryId,
                    clients: task.clients || [],
                    subtasks: subtasksArray,
                    priority: task.priority
                };
                
                logger.debug('TaskForm configurado com', this.taskForm.subtasks.length, 'subtarefas');
            } else {
                // Para novas tarefas, definir data de entrega para hoje
                const today = new Date();
                const todayStr = this.formatDateForInput(today.toISOString());
                logger.debug('Abrindo modal para nova tarefa com data de entrega:', todayStr);
                
                this.taskForm = {
                    id: null,
                    name: '',
                    description: '',
                    status: 'Nova',
                    startDateTime: '',
                    endDateTime: '',
                    deliveryDate: todayStr,
                    categoryId: '',
                    clients: [],
                    subtasks: [],
                    priority: 5
                };
            }
            
            const modal = new bootstrap.Modal(document.getElementById('taskModal'));
            modal.show();
        },
        
        async saveTask() {
            try {
                // Validar se pode marcar como concluída
                if (this.taskForm.status === 'Concluida' && this.taskForm.subtasks && this.taskForm.subtasks.length > 0) {
                    const allCompleted = this.taskForm.subtasks.every(st => st.status === 'Concluida');
                    if (!allCompleted) {
                        alert('❌ Não é possível marcar a tarefa como concluída enquanto houver subtarefas pendentes!');
                        return;
                    }
                }
                
                // Converter datas do formato input para ISO string ou manter formato YYYY-MM-DD
                let deliveryDateISO = null;
                if (this.taskForm.deliveryDate) {
                    // Se já está no formato YYYY-MM-DD, manter assim (evita problemas de fuso horário)
                    if (/^\d{4}-\d{2}-\d{2}$/.test(this.taskForm.deliveryDate)) {
                        deliveryDateISO = this.taskForm.deliveryDate;
                } else {
                        // Converter para formato YYYY-MM-DD
                        const dateObj = new Date(this.taskForm.deliveryDate);
                        if (!isNaN(dateObj.getTime())) {
                            const year = dateObj.getFullYear();
                            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const day = String(dateObj.getDate()).padStart(2, '0');
                            deliveryDateISO = `${year}-${month}-${day}`;
                        }
                    }
                }
                
                // Criar objeto simples (plain object) removendo proxies do Alpine.js
                const taskData = {
                    id: this.taskForm.id,
                    name: this.taskForm.name,
                    description: this.taskForm.description,
                    status: this.taskForm.status,
                    startDateTime: this.taskForm.startDateTime || null,
                    endDateTime: this.taskForm.endDateTime || null,
                    deliveryDate: deliveryDateISO,
                    categoryId: this.taskForm.categoryId,
                    clients: [...(this.taskForm.clients || [])],
                    subtasks: this.taskForm.subtasks ? JSON.parse(JSON.stringify(this.taskForm.subtasks)) : [],
                    priority: parseInt(this.taskForm.priority)
                };
                
                logger.debug('Salvando tarefa:', {
                    id: taskData.id,
                    name: taskData.name,
                    deliveryDateForm: this.taskForm.deliveryDate,
                    deliveryDateISO: deliveryDateISO,
                    subtasks: taskData.subtasks,
                    subtasksCount: taskData.subtasks.length
                });
                
                if (taskData.id) {
                    await taskService.update(taskData.id, taskData);
                } else {
                    delete taskData.id; // Remover id null ao criar
                    await taskService.create(taskData);
                }
                
                await this.loadAll();
                this.filterTasks();
                bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
                this.showToast('Tarefa salva com sucesso!');
            } catch (error) {
                alert('Erro: ' + error.message);
                logger.error('Erro ao salvar tarefa:', error);
            }
        },
        
        editTask(task) {
            this.openTaskModal(task);
        },
        
        async deleteTask(id) {
            if (!confirm('Deseja realmente excluir esta tarefa?')) {
                return;
            }
            
            try {
                await taskService.delete(id);
                await this.loadAll();
                this.filterTasks();
                this.showToast('Tarefa excluÃ­da com sucesso!');
            } catch (error) {
                alert('Erro ao excluir tarefa: ' + error.message);
            }
        },
        
        // ========== CLIENTES ==========
        openClientModal(client = null) {
            if (client) {
                this.clientForm = {
                    id: client.id,
                    name: client.name,
                    description: client.description,
                    priority: client.priority
                };
            } else {
                this.clientForm = {
                    id: null,
                    name: '',
                    description: '',
                    priority: 5
                };
            }
            
            const modal = new bootstrap.Modal(document.getElementById('clientModal'));
            modal.show();
        },
        
        async saveClient() {
            try {
                // Criar objeto simples (plain object) removendo proxies do Alpine.js
                const clientData = {
                    id: this.clientForm.id,
                    name: this.clientForm.name,
                    description: this.clientForm.description,
                    priority: parseInt(this.clientForm.priority)
                };
                
                if (clientData.id) {
                    await clientService.update(clientData.id, clientData);
                } else {
                    delete clientData.id; // Remover id null ao criar
                    await clientService.create(clientData);
                }
                
                await this.loadAll();
                bootstrap.Modal.getInstance(document.getElementById('clientModal')).hide();
                this.showToast('Cliente salvo com sucesso!');
            } catch (error) {
                alert('Erro: ' + error.message);
            }
        },
        
        editClient(client) {
            this.openClientModal(client);
        },
        
        async deleteClient(id) {
            if (!confirm('Deseja realmente excluir este cliente?')) {
                return;
            }
            
            try {
                await clientService.delete(id);
                await this.loadAll();
                this.showToast('Cliente excluÃ­do com sucesso!');
            } catch (error) {
                alert('Erro ao excluir cliente: ' + error.message);
            }
        },
        
        // ========== FILTROS ==========
        async filterTasks() {
            try {
                this.filteredTasks = await taskService.filter(this.taskFilters);
            } catch (error) {
                logger.error('Erro ao filtrar tarefas', error);
            }
        },
        
        clearFilters() {
            this.taskFilters = {
                search: '',
                status: '',
                category: ''
            };
            this.filterTasks();
        },
        
        // ========== HELPERS ==========
        getCategoryName(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.name : 'Sem categoria';
        },
        
        getCategoryColor(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.color : '#6c757d';
        },
        
        getClientName(clientId) {
            const client = this.clients.find(c => c.id === clientId);
            return client ? client.name : 'Desconhecido';
        },
        
        getStatusBadgeClass(status) {
            const classes = {
                'Nova': 'bg-primary',
                'Em Andamento': 'bg-info',
                'Pausada': 'bg-warning',
                'Cancelada': 'bg-danger',
                'Concluida': 'bg-success'
            };
            return classes[status] || 'bg-secondary';
        },
        
        getStatusIndicatorClass(status) {
            const statusMap = {
                'Nova': 'status-nova',
                'Em Andamento': 'status-em-andamento',
                'Pausada': 'status-pausada',
                'Cancelada': 'status-cancelada',
                'Concluida': 'status-concluida'
            };
            return statusMap[status] || '';
        },
        
        toggleClientSelection(clientId) {
            if (!this.taskForm.clients) {
                this.taskForm.clients = [];
            }
            
            const index = this.taskForm.clients.indexOf(clientId);
            if (index > -1) {
                this.taskForm.clients.splice(index, 1);
            } else {
                this.taskForm.clients.push(clientId);
            }
        },
        
        removeClient(clientId) {
            const index = this.taskForm.clients.indexOf(clientId);
            if (index > -1) {
                this.taskForm.clients.splice(index, 1);
            }
        },
        
        isClientSelected(clientId) {
            return this.taskForm.clients && this.taskForm.clients.includes(clientId);
        },
        
        formatDateTime(dateTime) {
            if (!dateTime) {
                return 'Não definido';
            }
            
            const date = new Date(dateTime);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        formatDateTimeForInput(dateTime) {
            if (!dateTime) {
                return '';
            }
            
            const date = new Date(dateTime);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        },
        
        formatDateForInput(date) {
            if (!date) {
                return '';
            }
            
            try {
                // Se for uma string no formato YYYY-MM-DD (sem hora), retornar direto
                if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    return date;
                }
                
                // Para strings ISO ou objetos Date, usar métodos UTC para evitar problema de fuso horário
                const d = typeof date === 'string' ? new Date(date) : date;
                
                // Verificar se é uma data válida
                if (isNaN(d.getTime())) {
                    return '';
                }
                
                // Usar UTC para evitar problemas de fuso horário
                const year = d.getUTCFullYear();
                const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                const day = String(d.getUTCDate()).padStart(2, '0');
                
                return `${year}-${month}-${day}`;
            } catch (e) {
                logger.error('Erro ao formatar data para input:', date, e);
                return '';
            }
        },
        
        formatElapsedTime(task) {
            const taskObj = Task.fromObject(task);
            return taskObj.getFormattedElapsedTime();
        },
        
        // ========== SUBTAREFAS ==========
        addSubtask() {
            if (!this.subtaskForm.name.trim()) {
                alert('O nome da subtarefa é obrigatório');
                return;
            }
            
            // Garantir que taskForm.subtasks existe
            if (!this.taskForm.subtasks) {
                this.taskForm.subtasks = [];
            }
            
            const subtask = {
                id: 'subtask_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: this.subtaskForm.name.trim(),
                description: this.subtaskForm.description.trim(),
                status: 'Pendente',
                order: this.taskForm.subtasks.length,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            this.taskForm.subtasks.push(subtask);
            
            logger.info('Subtarefa adicionada:', {
                name: subtask.name,
                totalSubtasks: this.taskForm.subtasks.length
            });
            
            // Limpar formulário
            this.subtaskForm = {
                name: '',
                description: '',
                status: 'Pendente'
            };
        },
        
        removeSubtask(index) {
            if (confirm('Deseja realmente remover esta subtarefa?')) {
                this.taskForm.subtasks.splice(index, 1);
                // Reordenar
                this.taskForm.subtasks.forEach((st, i) => st.order = i);
            }
        },
        
        toggleSubtaskStatus(subtask) {
            subtask.status = subtask.status === 'Pendente' ? 'Concluida' : 'Pendente';
            subtask.updatedAt = new Date().toISOString();
        },
        
        // Drag and Drop para subtarefas
        dragStartSubtask(index) {
            this.draggedSubtaskIndex = index;
        },
        
        dragOverSubtask(event) {
            event.preventDefault();
        },
        
        dropSubtask(index) {
            if (this.draggedSubtaskIndex === null) return;
            
            const draggedItem = this.taskForm.subtasks[this.draggedSubtaskIndex];
            this.taskForm.subtasks.splice(this.draggedSubtaskIndex, 1);
            this.taskForm.subtasks.splice(index, 0, draggedItem);
            
            // Atualizar ordem
            this.taskForm.subtasks.forEach((st, i) => st.order = i);
            
            this.draggedSubtaskIndex = null;
            logger.debug('Subtarefas reordenadas');
        },
        
        getSubtaskProgress(task) {
            if (!task || !task.subtasks || task.subtasks.length === 0) {
                return { completed: 0, total: 0, percentage: 0 };
            }
            const completed = task.subtasks.filter(st => st.status === 'Concluida').length;
            const total = task.subtasks.length;
            const percentage = Math.round((completed / total) * 100);
            return { completed, total, percentage };
        },
        
        showToast(message) {
            this.showCustomToast(message, 'success');
            logger.info(message);
        },
        
        // ========== STATUS REPORT ==========
        openStatusReport() {
            this.selectedReportTasks = []; // Limpar seleção
            const modal = new bootstrap.Modal(document.getElementById('statusReportModal'));
            modal.show();
        },
        
        toggleAllReportTasks() {
            if (this.selectedReportTasks.length === this.filteredTasks.length) {
                this.selectedReportTasks = [];
            } else {
                this.selectedReportTasks = this.filteredTasks.map(t => t.id);
            }
            this.statusReport = this.generateStatusReport();
        },
        
        toggleReportTask(taskId) {
            const index = this.selectedReportTasks.indexOf(taskId);
            if (index > -1) {
                this.selectedReportTasks.splice(index, 1);
            } else {
                this.selectedReportTasks.push(taskId);
            }
            this.statusReport = this.generateStatusReport();
        },
        
        isReportTaskSelected(taskId) {
            return this.selectedReportTasks.includes(taskId);
        },
        
        generateStatusReport() {
            // Data atual formatada
            const today = new Date();
            const dateStr = today.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit',
                year: 'numeric'
            });
            
            // Usar tarefas selecionadas ou todas se nenhuma selecionada
            const tasksToReport = this.selectedReportTasks.length > 0
                ? this.filteredTasks.filter(t => this.selectedReportTasks.includes(t.id))
                : this.filteredTasks;
            
            // Agrupar tarefas por status
            const tasksByStatus = {
                'Nova': [],
                'Em Andamento': [],
                'Pausada': [],
                'Cancelada': [],
                'Concluida': []
            };
            
            // Usar as tarefas selecionadas/filtradas
            tasksToReport.forEach(task => {
                if (tasksByStatus[task.status]) {
                    tasksByStatus[task.status].push(task);
                }
            });
            
            // Emojis para cada status
            const statusEmojis = {
                'Nova': '🔵',
                'Em Andamento': '🟡',
                'Pausada': '⏸️',
                'Cancelada': '🔴',
                'Concluida': '🟢'
            };
            
            const statusNames = {
                'Nova': 'Novas',
                'Em Andamento': 'Em Andamento',
                'Pausada': 'Pausadas',
                'Cancelada': 'Canceladas',
                'Concluida': 'Concluídas'
            };
            
            // Construir o relatório
            let report = `📅 STATUS REPORT - ${dateStr}\n`;
            report += `${'='.repeat(50)}\n\n`;
            
            // Total geral
            const totalTasks = tasksToReport.length;
            if (this.selectedReportTasks.length > 0) {
                report += `📊 TAREFAS SELECIONADAS: ${totalTasks}\n\n`;
            } else {
                report += `📊 TOTAL DE TAREFAS: ${totalTasks}\n\n`;
            }
            
            // Iterar sobre cada status
            Object.keys(tasksByStatus).forEach(status => {
                const tasks = tasksByStatus[status];
                const count = tasks.length;
                const emoji = statusEmojis[status];
                const statusName = statusNames[status];
                
                report += `${emoji} ${statusName.toUpperCase()} (${count})\n`;
                report += `${'-'.repeat(50)}\n`;
                
                if (count > 0) {
                    tasks.forEach((task, index) => {
                        // Informações básicas da tarefa
                        report += `${index + 1}. ${task.name}\n`;
                        
                        // Categoria
                        const categoryName = this.getCategoryName(task.categoryId);
                        report += `   📁 Categoria: ${categoryName}\n`;
                        
                        // Prioridade
                        report += `   ⭐ Prioridade: ${task.priority}\n`;
                        
                        // Clientes
                        if (task.clients && task.clients.length > 0) {
                            const clientNames = task.clients.map(id => this.getClientName(id)).join(', ');
                            report += `   👥 Clientes: ${clientNames}\n`;
                        }
                        
                        // Tempo decorrido
                        const elapsed = this.formatElapsedTime(task);
                        if (elapsed !== 'Não iniciada') {
                            report += `   ⏱️  Tempo: ${elapsed}\n`;
                        }
                        
                        // Descrição (se houver)
                        if (task.description) {
                            const desc = task.description.length > 60 
                                ? task.description.substring(0, 60) + '...' 
                                : task.description;
                            report += `   📝 ${desc}\n`;
                        }
                        
                        report += '\n';
                    });
                } else {
                    report += '   (Nenhuma tarefa)\n\n';
                }
                
                report += '\n';
            });
            
            // Rodapé
            report += `${'-'.repeat(50)}\n`;
            report += `Gerado em: ${today.toLocaleString('pt-BR')}\n`;
            report += `Sistema: TodoList Pro\n`;
            
            return report;
        },
        
        async copyReport() {
            try {
                await navigator.clipboard.writeText(this.statusReport);
                alert('✅ Relatório copiado para a área de transferência!');
                logger.info('Relatório copiado com sucesso');
            } catch (error) {
                // Fallback para navegadores mais antigos
                const textArea = document.createElement('textarea');
                textArea.value = this.statusReport;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    alert('✅ Relatório copiado para a área de transferência!');
                    logger.info('Relatório copiado com sucesso (fallback)');
                } catch (err) {
                    alert('❌ Erro ao copiar. Por favor, selecione e copie manualmente.');
                    logger.error('Erro ao copiar relatório', err);
                }
                document.body.removeChild(textArea);
            }
        },
        
        printReport() {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Status Report - TodoList Pro</title>
                    <style>
                        body {
                            font-family: 'Courier New', monospace;
                            padding: 20px;
                            line-height: 1.6;
                            color: #000;
                            background: #fff;
                        }
                        pre {
                            white-space: pre-wrap;
                            word-wrap: break-word;
                            font-size: 11pt;
                        }
                        @media print {
                            body { margin: 0; padding: 15px; }
                        }
                    </style>
                </head>
                <body>
                    <pre>${this.statusReport}</pre>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 100);
                        }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
            logger.info('Relatório enviado para impressão');
        },
        
        // ========== DASHBOARD ==========
        openDashboard() {
            this.generateDashboardData();
            this.selectedDashboardTasks = []; // Limpar seleção ao abrir
            const modal = new bootstrap.Modal(document.getElementById('dashboardModal'));
            modal.show();
        },
        
        toggleAllDashboardTasks() {
            if (this.selectedDashboardTasks.length === this.dashboardTasks.length) {
                this.selectedDashboardTasks = [];
            } else {
                this.selectedDashboardTasks = this.dashboardTasks.map(t => t.id);
            }
        },
        
        toggleDashboardTask(taskId) {
            const index = this.selectedDashboardTasks.indexOf(taskId);
            if (index > -1) {
                this.selectedDashboardTasks.splice(index, 1);
            } else {
                this.selectedDashboardTasks.push(taskId);
            }
        },
        
        isDashboardTaskSelected(taskId) {
            return this.selectedDashboardTasks.includes(taskId);
        },
        
        generateDashboardData() {
            const now = new Date();
            
            logger.debug('Gerando dashboard com tarefas:', this.tasks.length);
            
            // Processar todas as tarefas com cálculo de SLA
            this.dashboardTasks = this.tasks.map(task => {
                const taskCopy = {...task};
                
                logger.debug('Processando tarefa para dashboard:', {
                    id: task.id,
                    name: task.name,
                    status: task.status,
                    deliveryDate: task.deliveryDate,
                    hasDeliveryDate: !!task.deliveryDate,
                    deliveryDateFormat: task.deliveryDate ? (task.deliveryDate.includes('T') ? 'ISO' : 'YYYY-MM-DD') : 'null'
                });
                
                // Calcular SLA para tarefas em andamento com data de entrega
                if (task.status === 'Em Andamento' && task.deliveryDate) {
                    try {
                        const slaData = this.calculateSLA(task.deliveryDate, now);
                        taskCopy.slaPercentage = slaData.percentage;
                        taskCopy.slaText = slaData.text;
                        taskCopy.slaDescription = slaData.description;
                        taskCopy.slaStatus = slaData.status;
                        logger.debug('SLA calculado:', {
                            taskName: task.name,
                            slaPercentage: slaData.percentage,
                            slaText: slaData.text,
                            slaDescription: slaData.description
                        });
                    } catch (e) {
                        logger.error('Erro ao calcular SLA:', e);
                        taskCopy.slaPercentage = 0;
                        taskCopy.slaText = 'Erro';
                        taskCopy.slaDescription = '';
                        taskCopy.slaStatus = 'none';
                    }
                } else {
                    taskCopy.slaPercentage = 0;
                    taskCopy.slaText = '-';
                    taskCopy.slaDescription = '';
                    taskCopy.slaStatus = 'none';
                }
                
                return taskCopy;
            });
            
            // Ordenar por categoria e status
            this.dashboardTasks.sort((a, b) => {
                const catA = this.getCategoryName(a.categoryId);
                const catB = this.getCategoryName(b.categoryId);
                if (catA !== catB) return catA.localeCompare(catB);
                return a.status.localeCompare(b.status);
            });
            
            // Calcular contadores
            const statusCounts = {};
            let onTime = 0;
            let overdue = 0;
            
            this.tasks.forEach(task => {
                // Contar por status
                statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
                
                // Verificar prazo (apenas para tarefas não concluídas)
                if (task.deliveryDate && task.status !== 'Concluida' && task.status !== 'Cancelada') {
                    const deliveryDate = new Date(task.deliveryDate);
                    if (now <= deliveryDate) {
                        onTime++;
                    } else {
                        overdue++;
                    }
                }
            });
            
            this.dashboardData = {
                totalTasks: this.tasks.length,
                statusCounts: statusCounts,
                onTime: onTime,
                overdue: overdue
            };
            
            logger.info('Dashboard gerado com sucesso', this.dashboardData);
        },
        
        calculateSLA(deliveryDateStr, currentDate) {
            if (!deliveryDateStr) {
                logger.warn('calculateSLA chamado sem data de entrega');
                return {
                    percentage: 0,
                    text: '-',
                    description: 'Sem data definida',
                    status: 'none'
                };
            }
            
            const deliveryDate = new Date(deliveryDateStr);
            
            // Verificar se a data é válida
            if (isNaN(deliveryDate.getTime())) {
                logger.error('Data de entrega inválida:', deliveryDateStr);
                return {
                    percentage: 0,
                    text: 'Data inválida',
                    description: 'Erro na data',
                    status: 'none'
                };
            }
            
            deliveryDate.setHours(23, 59, 59, 999); // Fim do dia
            
            const now = new Date(currentDate);
            
            // Calcular diferença em milissegundos
            const diffMs = deliveryDate - now;
            
            logger.debug('Cálculo SLA:', {
                deliveryDateStr,
                deliveryDate: deliveryDate.toISOString(),
                now: now.toISOString(),
                diffMs,
                diffDays: Math.ceil(diffMs / (1000 * 60 * 60 * 24))
            });
            
            // Se já passou da data
            if (diffMs < 0) {
                const daysOverdue = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
                return {
                    percentage: 100,
                    text: `Atrasado`,
                    description: `${daysOverdue} dia${daysOverdue !== 1 ? 's' : ''} de atraso`,
                    status: 'overdue'
                };
            }
            
            // Calcular tempo restante
            const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            // Calcular percentual (assumindo prazo total de 7 dias como exemplo)
            // Na prática, você pode calcular com base na data de início
            const totalDays = 7; // ou calcular: deliveryDate - startDate
            const percentage = ((totalDays - daysRemaining) / totalDays) * 100;
            
            let status = 'ok';
            if (daysRemaining <= 1) {
                status = 'warning';
            }
            
            let timeText = '';
            if (daysRemaining > 0) {
                timeText = `${daysRemaining}d`;
                if (hoursRemaining > 0 && daysRemaining < 2) {
                    timeText += ` ${hoursRemaining}h`;
                }
            } else if (hoursRemaining > 0) {
                timeText = `${hoursRemaining}h`;
            } else {
                timeText = 'Hoje';
            }
            
            return {
                percentage: Math.max(0, Math.min(100, percentage)),
                text: timeText,
                description: `Restam ${timeText} para entrega`,
                status: status
            };
        },
        
        formatDate(dateStr) {
            if (!dateStr) return '-';
            try {
                // Se for formato YYYY-MM-DD, processar diretamente sem conversão de fuso
                if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                    const [year, month, day] = dateStr.split('-');
                    return `${day}/${month}/${year}`;
                }
                
                // Para ISO strings completas, usar UTC
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return '-';
                
                // Usar UTC para evitar problemas de fuso horário
                const day = String(date.getUTCDate()).padStart(2, '0');
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const year = date.getUTCFullYear();
                
                return `${day}/${month}/${year}`;
            } catch (e) {
                logger.error('Erro ao formatar data:', dateStr, e);
                return '-';
            }
        },
        
        // ========== PERFIL ==========
        saveProfile() {
            localStorage.setItem('userProfile.name', this.userProfile.name);
            localStorage.setItem('userProfile.email', this.userProfile.email);
            localStorage.setItem('userProfile.company', this.userProfile.company);
            this.showToast('Perfil salvo com sucesso!');
            logger.info('Perfil do usuário atualizado');
        },
        
        // ========== BACKUP / RESTORE ==========
        async exportBackup() {
            try {
                const backup = {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    userProfile: this.userProfile,
                    data: {
                        categories: this.categories.map(c => c.toObject ? c.toObject() : c),
                        tasks: this.tasks.map(t => t.toObject ? t.toObject() : t),
                        clients: this.clients.map(c => c.toObject ? c.toObject() : c)
                    }
                };
                
                const json = JSON.stringify(backup, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `todolist-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                logger.info('Backup exportado com sucesso', {
                    categories: backup.data.categories.length,
                    tasks: backup.data.tasks.length,
                    clients: backup.data.clients.length
                });
                
                alert('✅ Backup exportado com sucesso!');
            } catch (error) {
                logger.error('Erro ao exportar backup:', error);
                alert('❌ Erro ao exportar backup: ' + error.message);
            }
        },
        
        async importBackup() {
            const fileInput = document.getElementById('restoreFile');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Por favor, selecione um arquivo de backup.');
                return;
            }
            
            if (!confirm('⚠️ ATENÇÃO: Isso irá substituir TODOS os dados atuais. Deseja continuar?')) {
                return;
            }
            
            try {
                const text = await file.text();
                const backup = JSON.parse(text);
                
                // Validar estrutura do backup
                if (!backup.data || !backup.data.categories || !backup.data.tasks || !backup.data.clients) {
                    throw new Error('Arquivo de backup inválido ou corrompido');
                }
                
                logger.info('Iniciando restauração de backup...', {
                    categories: backup.data.categories.length,
                    tasks: backup.data.tasks.length,
                    clients: backup.data.clients.length
                });
                
                // Limpar dados existentes
                await storage.clear('categories');
                await storage.clear('tasks');
                await storage.clear('clients');
                
                // Restaurar categorias
                for (const cat of backup.data.categories) {
                    await storage.add('categories', cat);
                }
                
                // Restaurar tarefas
                for (const task of backup.data.tasks) {
                    await storage.add('tasks', task);
                }
                
                // Restaurar clientes
                for (const client of backup.data.clients) {
                    await storage.add('clients', client);
                }
                
                // Restaurar perfil do usuário
                if (backup.userProfile) {
                    this.userProfile = backup.userProfile;
                    this.saveProfile();
                }
                
                // Recarregar dados
                await this.loadAll();
                this.filterTasks();
                
                // Limpar input
                fileInput.value = '';
                
                logger.info('Backup restaurado com sucesso!');
                alert('✅ Backup restaurado com sucesso! A página será recarregada.');
                window.location.reload();
            } catch (error) {
                logger.error('Erro ao importar backup:', error);
                alert('❌ Erro ao importar backup: ' + error.message);
            }
        },
        
        async clearAllData() {
            if (!confirm('⚠️ ATENÇÃO: Isso irá DELETAR PERMANENTEMENTE todos os dados (tarefas, categorias, clientes). Esta ação NÃO pode ser desfeita!\n\nTem certeza absoluta?')) {
                return;
            }
            
            if (!confirm('🚨 ÚLTIMA CONFIRMAÇÃO: Todos os dados serão perdidos. Deseja realmente continuar?')) {
                return;
            }
            
            try {
                await storage.clear('categories');
                await storage.clear('tasks');
                await storage.clear('clients');
                
                // Limpar perfil
                localStorage.removeItem('userProfile.name');
                localStorage.removeItem('userProfile.email');
                localStorage.removeItem('userProfile.company');
                
                logger.info('Todos os dados foram limpos');
                alert('✅ Todos os dados foram removidos. A página será recarregada.');
                window.location.reload();
            } catch (error) {
                logger.error('Erro ao limpar dados:', error);
                alert('❌ Erro ao limpar dados: ' + error.message);
            }
        },
        
        // ========== NOTIFICAÇÕES ==========
        initNotifications() {
            if (this.notificationSettings.enabled) {
                this.startNotificationTimer();
                logger.info('Sistema de notificações iniciado', {
                    interval: this.notificationSettings.intervalMinutes,
                    statusFilter: this.notificationSettings.statusFilter,
                    categoryFilter: this.notificationSettings.categoryFilter
                });
            }
        },
        
        toggleNotifications() {
            this.saveNotificationSettings();
            if (this.notificationSettings.enabled) {
                this.startNotificationTimer();
                this.showCustomToast('🔔 Notificações ativadas!', 'success');
            } else {
                this.stopNotificationTimer();
                this.showCustomToast('🔕 Notificações desativadas', 'info');
            }
        },
        
        startNotificationTimer() {
            this.stopNotificationTimer(); // Limpar timer anterior
            
            // Executar imediatamente
            this.checkAndNotify();
            
            // Configurar timer periódico
            const intervalMs = this.notificationSettings.intervalMinutes * 60 * 1000;
            this.notificationTimer = setInterval(() => {
                this.checkAndNotify();
            }, intervalMs);
            
            logger.debug('Timer de notificações iniciado:', intervalMs + 'ms');
        },
        
        stopNotificationTimer() {
            if (this.notificationTimer) {
                clearInterval(this.notificationTimer);
                this.notificationTimer = null;
                logger.debug('Timer de notificações parado');
            }
        },
        
        checkAndNotify() {
            if (!this.notificationSettings.enabled) return;
            
            // Filtrar tarefas que vencem hoje
            const today = new Date();
            const todayStr = this.formatDateForInput(today.toISOString());
            
            let tasksToNotify = this.tasks.filter(task => {
                // Verificar data de entrega = hoje
                if (!task.deliveryDate || task.deliveryDate !== todayStr) {
                    return false;
                }
                
                // Aplicar filtro de status
                if (this.notificationSettings.statusFilter.length > 0 && 
                    !this.notificationSettings.statusFilter.includes(task.status)) {
                    return false;
                }
                
                // Aplicar filtro de categoria
                if (this.notificationSettings.categoryFilter.length > 0 && 
                    !this.notificationSettings.categoryFilter.includes(task.categoryId)) {
                    return false;
                }
                
                return true;
            });
            
            if (tasksToNotify.length > 0) {
                this.showTaskNotification(tasksToNotify);
            }
        },
        
        showTaskNotification(tasks) {
            const container = document.getElementById('notificationContainer');
            
            // Criar elemento de notificação
            const notification = document.createElement('div');
            notification.className = 'custom-notification slide-in';
            
            // Montar conteúdo
            let content = `
                <div class="notification-header">
                    <div class="notification-icon">
                        <i class="bi bi-bell-fill"></i>
                    </div>
                    <div class="notification-title">
                        <strong>📅 Tarefas para Hoje</strong>
                        <button class="notification-close" onclick="this.closest('.custom-notification').remove()">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>
                <div class="notification-body">
                    <p class="mb-2"><strong>${tasks.length}</strong> tarefa${tasks.length > 1 ? 's' : ''} com entrega prevista para hoje:</p>
                    <ul class="notification-task-list">
            `;
            
            tasks.slice(0, 5).forEach(task => {
                const categoryName = this.getCategoryName(task.categoryId);
                const categoryColor = this.getCategoryColor(task.categoryId);
                content += `
                    <li>
                        <span class="task-bullet" style="background-color: ${categoryColor}"></span>
                        <strong>${task.name}</strong>
                        <br>
                        <small class="text-muted">${categoryName}</small>
                    </li>
                `;
            });
            
            if (tasks.length > 5) {
                content += `<li class="text-muted">... e mais ${tasks.length - 5} tarefa${tasks.length - 5 > 1 ? 's' : ''}</li>`;
            }
            
            content += `
                    </ul>
                </div>
                <div class="notification-footer">
                    <button class="btn btn-sm btn-primary" onclick="document.querySelector('[\\\\@click\\\\.prevent=\\"currentView = \\'tasks\\'\\"]').click(); this.closest('.custom-notification').remove();">
                        Ver Tarefas
                    </button>
                </div>
            `;
            
            notification.innerHTML = content;
            container.appendChild(notification);
            
            // Auto remover após 15 segundos
            setTimeout(() => {
                notification.classList.add('slide-out');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 15000);
            
            logger.info(`Notificação exibida: ${tasks.length} tarefas`);
        },
        
        testNotification() {
            // Forçar verificação imediata
            const today = new Date();
            const todayStr = this.formatDateForInput(today.toISOString());
            
            let tasksToday = this.tasks.filter(task => task.deliveryDate === todayStr);
            
            if (tasksToday.length > 0) {
                this.showTaskNotification(tasksToday);
            } else {
                this.showCustomToast('ℹ️ Nenhuma tarefa com entrega prevista para hoje', 'info');
            }
        },
        
        showCustomToast(message, type = 'info') {
            const container = document.getElementById('notificationContainer');
            const toast = document.createElement('div');
            toast.className = `custom-toast toast-${type} slide-in`;
            toast.innerHTML = `<span>${message}</span>`;
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('slide-out');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },
        
        saveNotificationSettings() {
            localStorage.setItem('notification.enabled', this.notificationSettings.enabled);
            localStorage.setItem('notification.intervalMinutes', this.notificationSettings.intervalMinutes);
            localStorage.setItem('notification.statusFilter', JSON.stringify(this.notificationSettings.statusFilter));
            localStorage.setItem('notification.categoryFilter', JSON.stringify(this.notificationSettings.categoryFilter));
            
            // Reiniciar timer se estiver ativo
            if (this.notificationSettings.enabled) {
                this.startNotificationTimer();
            }
            
            this.showCustomToast('✅ Configurações salvas!', 'success');
            logger.info('Configurações de notificações salvas');
        },
        
        toggleStatusFilter(status) {
            const index = this.notificationSettings.statusFilter.indexOf(status);
            if (index > -1) {
                this.notificationSettings.statusFilter.splice(index, 1);
            } else {
                this.notificationSettings.statusFilter.push(status);
            }
            this.saveNotificationSettings();
        },
        
        toggleCategoryFilter(categoryId) {
            const index = this.notificationSettings.categoryFilter.indexOf(categoryId);
            if (index > -1) {
                this.notificationSettings.categoryFilter.splice(index, 1);
            } else {
                this.notificationSettings.categoryFilter.push(categoryId);
            }
            this.saveNotificationSettings();
        },
        
        async copyDashboard() {
            if (this.selectedDashboardTasks.length === 0) {
                alert('⚠️ Selecione pelo menos uma tarefa para copiar.');
                return;
            }
            
            try {
                const dashboardText = this.generateDashboardText();
                await navigator.clipboard.writeText(dashboardText);
                alert(`✅ ${this.selectedDashboardTasks.length} tarefa(s) copiada(s) para a área de transferência!`);
                logger.info('Dashboard copiado com sucesso', { tarefas: this.selectedDashboardTasks.length });
            } catch (error) {
                // Fallback para navegadores mais antigos
                const textArea = document.createElement('textarea');
                textArea.value = this.generateDashboardText();
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    alert('✅ Dashboard copiado para a área de transferência!');
                    logger.info('Dashboard copiado com sucesso (fallback)');
                } catch (err) {
                    alert('❌ Erro ao copiar. Por favor, selecione e copie manualmente.');
                    logger.error('Erro ao copiar dashboard', err);
                }
                document.body.removeChild(textArea);
            }
        },
        
        generateDashboardText() {
            const today = new Date().toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            // Filtrar apenas tarefas selecionadas
            const selectedTasks = this.dashboardTasks.filter(task => 
                this.selectedDashboardTasks.includes(task.id)
            );
            
            let text = `📊 DASHBOARD DE TAREFAS - ${today}\n`;
            text += `${'='.repeat(80)}\n\n`;
            
            // Contadores (recalcular para tarefas selecionadas)
            const statusCounts = {};
            let onTime = 0;
            let overdue = 0;
            const now = new Date();
            
            selectedTasks.forEach(task => {
                statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
                if (task.deliveryDate && task.status !== 'Concluida' && task.status !== 'Cancelada') {
                    const deliveryDate = new Date(task.deliveryDate);
                    if (now <= deliveryDate) {
                        onTime++;
                    } else {
                        overdue++;
                    }
                }
            });
            
            text += `📈 RESUMO (Tarefas Selecionadas)\n`;
            text += `${'-'.repeat(80)}\n`;
            text += `📊 Total Selecionado: ${selectedTasks.length}\n`;
            text += `🔵 Novas: ${statusCounts.Nova || 0}\n`;
            text += `🟡 Em Andamento: ${statusCounts['Em Andamento'] || 0}\n`;
            text += `⏸️  Pausadas: ${statusCounts.Pausada || 0}\n`;
            text += `🔴 Canceladas: ${statusCounts.Cancelada || 0}\n`;
            text += `🟢 Concluídas: ${statusCounts.Concluida || 0}\n`;
            text += `✅ No Prazo: ${onTime}\n`;
            text += `⚠️  Atrasadas: ${overdue}\n\n`;
            
            // Tabela
            text += `📋 DETALHAMENTO DAS TAREFAS SELECIONADAS\n`;
            text += `${'-'.repeat(80)}\n\n`;
            
            selectedTasks.forEach((task, index) => {
                text += `${index + 1}. ${task.name}\n`;
                text += `   📁 Categoria: ${this.getCategoryName(task.categoryId)}\n`;
                text += `   ⭐ Status: ${task.status}\n`;
                text += `   📅 Previsão de Entrega: ${task.deliveryDate ? this.formatDate(task.deliveryDate) : 'Não definida'}\n`;
                
                // SLA para tarefas em andamento
                if (task.status === 'Em Andamento' && task.deliveryDate) {
                    text += `   ⏱️  SLA: ${task.slaDescription}`;
                    if (task.slaStatus === 'overdue') {
                        text += ` ⚠️ ATRASADA`;
                    } else if (task.slaStatus === 'warning') {
                        text += ` ⚡ URGENTE`;
                    }
                    text += '\n';
                }
                
                // Clientes
                if (task.clients && task.clients.length > 0) {
                    const clientNames = task.clients.map(id => this.getClientName(id)).join(', ');
                    text += `   👥 Clientes: ${clientNames}\n`;
                }
                
                // Descrição
                if (task.description) {
                    const desc = task.description.length > 80 
                        ? task.description.substring(0, 80) + '...' 
                        : task.description;
                    text += `   📝 ${desc}\n`;
                }
                
                text += '\n';
            });
            
            // Rodapé
            text += `${'-'.repeat(80)}\n`;
            text += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
            text += `Sistema: TodoList Pro\n`;
            
            return text;
        },
        
        printDashboard() {
            if (this.selectedDashboardTasks.length === 0) {
                alert('⚠️ Selecione pelo menos uma tarefa para imprimir.');
                return;
            }
            
            const printWindow = window.open('', '_blank');
            
            // Filtrar apenas tarefas selecionadas
            const selectedTasks = this.dashboardTasks.filter(task => 
                this.selectedDashboardTasks.includes(task.id)
            );
            
            // Gerar HTML da tabela
            let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
            tableHTML += '<thead><tr style="background-color: #212529; color: white;">';
            tableHTML += '<th style="padding: 10px; border: 1px solid #ddd;">Categoria</th>';
            tableHTML += '<th style="padding: 10px; border: 1px solid #ddd;">Status</th>';
            tableHTML += '<th style="padding: 10px; border: 1px solid #ddd;">Tarefa</th>';
            tableHTML += '<th style="padding: 10px; border: 1px solid #ddd;">Previsão</th>';
            tableHTML += '<th style="padding: 10px; border: 1px solid #ddd;">SLA</th>';
            tableHTML += '<th style="padding: 10px; border: 1px solid #ddd;">Clientes</th>';
            tableHTML += '</tr></thead><tbody>';
            
            selectedTasks.forEach(task => {
                const rowColor = task.slaStatus === 'overdue' ? 'background-color: #f8d7da;' : 
                                task.slaStatus === 'warning' ? 'background-color: #fff3cd;' : '';
                tableHTML += `<tr style="${rowColor}">`;
                tableHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${this.getCategoryName(task.categoryId)}</td>`;
                tableHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${task.status}</td>`;
                tableHTML += `<td style="padding: 8px; border: 1px solid #ddd;"><strong>${task.name}</strong><br><small>${task.description || ''}</small></td>`;
                tableHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${task.deliveryDate ? this.formatDate(task.deliveryDate) : '-'}</td>`;
                
                // SLA
                let slaText = '-';
                if (task.status === 'Em Andamento' && task.deliveryDate) {
                    slaText = task.slaDescription;
                    if (task.slaStatus === 'overdue') {
                        slaText += ' ⚠️';
                    }
                }
                tableHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${slaText}</td>`;
                
                // Clientes
                const clientsText = task.clients && task.clients.length > 0 
                    ? task.clients.map(id => this.getClientName(id)).join(', ') 
                    : '-';
                tableHTML += `<td style="padding: 8px; border: 1px solid #ddd;">${clientsText}</td>`;
                tableHTML += '</tr>';
            });
            
            tableHTML += '</tbody></table>';
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Dashboard - TodoList Pro</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            color: #000;
                            background: #fff;
                        }
                        h1 {
                            color: #0d6efd;
                            margin-bottom: 10px;
                        }
                        .summary {
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                            gap: 10px;
                            margin-bottom: 30px;
                        }
                        .summary-card {
                            border: 2px solid #ddd;
                            padding: 15px;
                            border-radius: 8px;
                            text-align: center;
                        }
                        .summary-card h3 {
                            margin: 0 0 5px 0;
                            font-size: 1.8em;
                        }
                        .summary-card p {
                            margin: 0;
                            color: #666;
                            font-size: 0.9em;
                        }
                        table {
                            page-break-inside: auto;
                        }
                        tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                        @media print {
                            body { margin: 0; padding: 15px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>📊 Dashboard de Tarefas</h1>
                    <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                    <hr>
                    
                    <h2>📈 Resumo Geral</h2>
                    <div class="summary">
                        <div class="summary-card">
                            <h3>${selectedTasks.length}</h3>
                            <p>Tarefas Selecionadas</p>
                        </div>
                    </div>
                    
                    <h2>📋 Detalhamento das Tarefas</h2>
                    ${tableHTML}
                    
                    <hr>
                    <p style="text-align: center; color: #666; font-size: 0.9em;">
                        TodoList Pro - Sistema de Gerenciamento de Tarefas
                    </p>
                    
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 100);
                        }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
            logger.info('Dashboard enviado para impressão');
        }
    };
}

// Expor funÃ§Ã£o globalmente para Alpine.js
window.todoApp = todoApp;

// Helper para debug no console
window.debugTask = async function(taskId) {
    const task = await storage.get('tasks', taskId);
    console.log('=== DEBUG TASK ===');
    console.log('ID:', taskId);
    console.log('Nome:', task?.name);
    console.log('Subtasks:', task?.subtasks);
    console.log('Subtasks é Array?', Array.isArray(task?.subtasks));
    console.log('Subtasks length:', task?.subtasks?.length);
    console.log('Objeto completo:', task);
    return task;
};

window.debugAllTasks = async function() {
    const tasks = await storage.getAll('tasks');
    console.log('=== TODAS AS TAREFAS ===');
    tasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.name}`);
        console.log('   - ID:', task.id);
        console.log('   - Subtasks:', task.subtasks || 'undefined');
        console.log('   - Has subtasks?', task.hasOwnProperty('subtasks'));
    });
    return tasks;
};

// Log de inÃ­cio
logger.info('TodoList Pro carregado');
