'use strict';

// TaskTime v1.0 — apontamentos pessoais no navegador.
const STORAGE_KEY = 'tasktime.entries.v1';
const TASKS_KEY = 'tasktime.tasks.v1';
// Catálogo de demonstração. No sistema real, projetos serão carregados da API.
const DEMO_PROJECTS = [
    {id: '23ADM', name: 'Administrativo'},
    {id: '23PA001', name: 'Projeto ambiental 001'},
    {id: '23PA002', name: 'Projeto ambiental 002'}
];
const DEMO_TASKS = ['Reunião administrativa', 'Elaboração de relatório técnico', 'Visita técnica'];
const projectCatalog = DEMO_PROJECTS;

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
        return Array.isArray(saved) ? [...new Set([...DEMO_TASKS, ...saved.filter(value => typeof value === 'string' && value.trim() && value.length <= 500)])] : [...DEMO_TASKS];
    } catch {
        return [...DEMO_TASKS];
    }
}

let taskCatalog = loadTasks();

function renderCatalogs() {
    const projectsList = document.querySelector('#project-options');
    const tasksList = document.querySelector('#task-options');
    projectsList.replaceChildren();
    tasksList.replaceChildren();
    for (const project of projectCatalog) {
        const option = document.createElement('option');
        option.value = `${project.id} — ${project.name}`;
        projectsList.appendChild(option);
    }
    for (const task of taskCatalog) {
        const option = document.createElement('option');
        option.value = task;
        tasksList.appendChild(option);
    }
}

function findProject(value) {
    return projectCatalog.find(project => `${project.id} — ${project.name}` === value || project.id === value);
}

function findTask(value) {
    return taskCatalog.find(task => task.toLocaleLowerCase('pt-BR') === value.trim().toLocaleLowerCase('pt-BR'));
}

const taskDialog = document.querySelector('#new-task-dialog');
document.querySelector('#new-task-button').addEventListener('click', () => {
    document.querySelector('#task-feedback').textContent = '';
    document.querySelector('#new-task-name').value = '';
    taskDialog.showModal();
});
document.querySelector('#close-task-dialog').addEventListener('click', () => taskDialog.close());
document.querySelector('#new-task-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = document.querySelector('#new-task-name').value.trim();
    const feedback = document.querySelector('#task-feedback');
    if (!name) {
        feedback.textContent = 'Informe o nome da tarefa.';
        return;
    }
    if (findTask(name)) {
        feedback.textContent = 'Esta tarefa já existe. Selecione-a na lista.';
        return;
    }
    const next = [...taskCatalog, name];
    try {
        localStorage.setItem(TASKS_KEY, JSON.stringify(next.filter(task => !DEMO_TASKS.includes(task))));
        taskCatalog = next;
        renderCatalogs();
        taskInput.value = name;
        taskDialog.close();
        taskInput.focus();
    } catch {
        feedback.textContent = 'Não foi possível salvar a tarefa neste navegador.';
    }
});

const $ = (selector) => document.querySelector(selector);
const form = $('#entry-form');
const dateInput = $('#entry-date');
const projectInput = $('#entry-project');
const taskInput = $('#entry-task');
const hoursInput = $('#entry-hours');
const minutesInput = $('#entry-minutes');
const monthInput = $('#month-filter');
const feedback = $('#form-feedback');
const tableBody = $('#entries-body');
let entries = loadEntries();
let editingId = null;

function todayLocal() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const check = new Date(year, month - 1, day);
    return check.getFullYear() === year && check.getMonth() === month - 1 && check.getDate() === day;
}

function validEntry(item) {
    return item && typeof item.id === 'string' && validDate(item.date) &&
        typeof item.project === 'string' && item.project.trim().length > 0 && item.project.length <= 100 &&
        typeof item.task === 'string' && item.task.trim().length > 0 && item.task.length <= 500 &&
        Number.isInteger(item.minutes) && item.minutes > 0 && item.minutes <= 59999;
}

function loadEntries() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(saved) ? saved.filter(validEntry) : [];
    } catch (error) {
        console.warn('Não foi possível ler os apontamentos salvos.', error);
        return [];
    }
}

function saveEntries(nextEntries) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
        entries = nextEntries;
        return true;
    } catch (error) {
        alert('Não foi possível salvar os dados neste navegador. Verifique o espaço disponível e faça um backup.');
        return false;
    }
}

function formatMinutes(total) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}min`;
}

function formatClock(total) {
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatDate(date) {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
}

function monthEntries() {
    return entries.filter((entry) => entry.date.slice(0, 7) === monthInput.value)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function addCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
}

function render() {
    const visible = monthEntries();
    const total = visible.reduce((sum, entry) => sum + entry.minutes, 0);
    $('#monthly-total').textContent = formatMinutes(total);
    $('#monthly-count').textContent = String(visible.length);
    $('#history-total').textContent = formatMinutes(total);
    tableBody.replaceChildren();

    if (!visible.length) {
        const row = document.createElement('tr');
        row.className = 'empty-row';
        const cell = addCell(row, 'Nenhum apontamento neste mês. Adicione seu primeiro registro!');
        cell.colSpan = 5;
        return;
    }

    for (const entry of visible) {
        const row = document.createElement('tr');
        addCell(row, formatDate(entry.date));
        addCell(row, entry.project);
        addCell(row, entry.task);
        addCell(row, formatClock(entry.minutes));
        const actions = document.createElement('td');
        for (const [label, action] of [['Editar', 'edit'], ['Excluir', 'delete']]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `table-action ${action === 'delete' ? 'delete' : ''}`;
            button.textContent = label;
            button.dataset.action = action;
            button.dataset.id = entry.id;
            actions.appendChild(button);
        }
        row.appendChild(actions);
        tableBody.appendChild(row);
    }
}

function showFeedback(message, type = '') {
    feedback.textContent = message;
    feedback.className = `helper-text ${type}`;
}

function resetForm() {
    editingId = null;
    form.reset();
    dateInput.value = todayLocal();
    hoursInput.value = '0';
    minutesInput.value = '0';
    $('#save-button').textContent = '+ Salvar apontamento';
    $('#cancel-edit').hidden = true;
}

function createId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

form.addEventListener('submit', (event) => {
    event.preventDefault();
    const hours = Number(hoursInput.value);
    const minutes = Number(minutesInput.value);
    const selectedProject = findProject(projectInput.value.trim());
    const selectedTask = findTask(taskInput.value);
    const project = selectedProject?.id || '';
    const task = selectedTask || '';

    if (!validDate(dateInput.value) || !project || !task ||
        !Number.isInteger(hours) || hours < 0 || hours > 999 ||
        !Number.isInteger(minutes) || minutes < 0 || minutes > 59 ||
        hours * 60 + minutes === 0) {
        showFeedback('Selecione um projeto e uma tarefa das listas e informe uma duração válida maior que zero.', 'error');
        return;
    }

    const entry = {
        id: editingId || createId(),
        date: dateInput.value,
        project,
        task,
        minutes: hours * 60 + minutes
    };
    const next = editingId
        ? entries.map((item) => item.id === editingId ? entry : item)
        : [...entries, entry];

    if (!saveEntries(next)) return;
    monthInput.value = entry.date.slice(0, 7);
    resetForm();
    render();
    showFeedback('Apontamento salvo com sucesso!', 'success');
});

tableBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const entry = entries.find((item) => item.id === button.dataset.id);
    if (!entry) return;

    if (button.dataset.action === 'delete') {
        if (!confirm(`Excluir o apontamento de ${formatDate(entry.date)} (${entry.project})?`)) return;
        if (saveEntries(entries.filter((item) => item.id !== entry.id))) {
            if (editingId === entry.id) resetForm();
            render();
            showFeedback('Apontamento excluído.', 'success');
        }
        return;
    }

    editingId = entry.id;
    dateInput.value = entry.date;
    const matchedProject = projectCatalog.find(project => project.id === entry.project);
    projectInput.value = matchedProject ? `${matchedProject.id} — ${matchedProject.name}` : entry.project;
    taskInput.value = entry.task;
    hoursInput.value = String(Math.floor(entry.minutes / 60));
    minutesInput.value = String(entry.minutes % 60);
    $('#save-button').textContent = 'Salvar alterações';
    $('#cancel-edit').hidden = false;
    showFeedback('Editando apontamento. Salve as alterações ou cancele.');
    form.scrollIntoView({behavior: 'smooth', block: 'start'});
    projectInput.focus({preventScroll: true});
});

$('#cancel-edit').addEventListener('click', () => {
    resetForm();
    showFeedback('Edição cancelada.');
});
monthInput.addEventListener('change', render);

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('#export-button').addEventListener('click', () => {
    const visible = monthEntries();
    if (!visible.length) {
        alert('Não existem apontamentos no mês selecionado para exportar.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert('A biblioteca de Excel não foi carregada. Conecte-se à internet e atualize a página.');
        return;
    }

    // O Excel guarda durações como frações de dia; isso permite somar mais de 24h.
    const data = [['Data', 'Projeto', 'Tarefa realizada', 'Duração']];
    for (const entry of visible) {
        const [year, month, day] = entry.date.split('-').map(Number);
        data.push([new Date(year, month - 1, day, 12), entry.project, entry.task, entry.minutes / 1440]);
    }
    const total = visible.reduce((sum, entry) => sum + entry.minutes, 0);
    data.push(['TOTAL', '', '', total / 1440]);
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [{wch: 15}, {wch: 22}, {wch: 65}, {wch: 16}];
    for (let row = 2; row <= data.length; row++) {
        if (row < data.length) {
            sheet[`A${row}`].z = 'dd/mm/yyyy';
        }
        sheet[`D${row}`].z = '[h]:mm';
    }
    sheet['!autofilter'] = {ref: `A1:D${data.length - 1}`};
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Apontamentos');
    XLSX.writeFile(workbook, `TaskTime_${monthInput.value}.xlsx`);
});

$('#backup-button').addEventListener('click', () => {
    const payload = {
        app: 'TaskTime',
        version: 1,
        exportedAt: new Date().toISOString(),
        entries,
        tasks: taskCatalog.filter(task => !DEMO_TASKS.includes(task))
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}),
        `TaskTime_backup_${todayLocal()}.json`);
});

$('#restore-button').addEventListener('click', () => $('#restore-file').click());
$('#restore-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const backup = JSON.parse(await file.text());
        if (backup.app !== 'TaskTime' || backup.version !== 1 || !Array.isArray(backup.entries) ||
            !backup.entries.every(validEntry) ||
            new Set(backup.entries.map((item) => item.id)).size !== backup.entries.length) {
            throw new Error('Formato de backup inválido.');
        }
        if (!confirm('Restaurar este backup substituirá TODOS os apontamentos atuais. Deseja continuar?')) return;
        if (saveEntries(backup.entries)) {
            if (Array.isArray(backup.tasks) && backup.tasks.every(task => typeof task === 'string' && task.trim() && task.length <= 500)) {
                try {
                    localStorage.setItem(TASKS_KEY, JSON.stringify(backup.tasks));
                    taskCatalog = loadTasks();
                    renderCatalogs();
                } catch {
                    alert('Apontamentos restaurados, mas não foi possível restaurar o catálogo de tarefas.');
                }
            }
            resetForm();
            render();
            alert('Backup restaurado com sucesso!');
        }
    } catch (error) {
        alert('Não foi possível restaurar: o arquivo não é um backup válido do TaskTime.');
    } finally {
        event.target.value = '';
    }
});

// Inicialização
renderCatalogs();
resetForm();
monthInput.value = todayLocal().slice(0, 7);
render();

// Navegação do protótipo: Apontamentos e submenu lateral Financeiro.
const apontamentosButton = document.querySelector('[data-view="apontamentos"]');
const financeToggle = document.querySelector('#finance-toggle');
const financeSubmenu = document.querySelector('#finance-submenu');
const financeItems = document.querySelectorAll('.finance-subitem');
const apontamentosView = document.querySelector('#view-apontamentos');
const financeiroView = document.querySelector('#view-financeiro');
const financeContent = {
    receitas: ['Receitas', 'Área reservada para o futuro controle de receitas e notas fiscais dos projetos.'],
    despesas: ['Despesas', 'Área reservada para o futuro controle de despesas vinculadas aos projetos.'],
    aquisicoes: ['Aquisições', 'Área reservada para o futuro controle de compras e contratações de serviços.']
};

function setFinanceMenuOpen(open) {
    financeSubmenu.hidden = !open;
    financeToggle.setAttribute('aria-expanded', String(open));
}

function showApontamentos() {
    apontamentosView.hidden = false;
    financeiroView.hidden = true;
    apontamentosButton.classList.add('active');
    financeToggle.classList.remove('active');
    financeItems.forEach(item => item.classList.remove('selected'));
    document.querySelector('#breadcrumb-current').textContent = 'Apontamentos';
}

function showFinanceSection(section) {
    const content = financeContent[section];
    if (!content) return;
    setFinanceMenuOpen(true);
    apontamentosView.hidden = true;
    financeiroView.hidden = false;
    apontamentosButton.classList.remove('active');
    financeToggle.classList.add('finance-current');
    financeItems.forEach(item => item.classList.toggle('selected', item.dataset.finance === section));
    document.querySelector('#finance-page-title').textContent = content[0];
    document.querySelector('#finance-title').textContent = content[0];
    document.querySelector('#finance-description').textContent = content[1];
    document.querySelector('#breadcrumb-current').textContent = 'Financeiro / ' + content[0];
}

apontamentosButton.addEventListener('click', () => {
    financeToggle.classList.remove('finance-current');
    showApontamentos();
});
financeToggle.addEventListener('click', () => {
    const willOpen = financeSubmenu.hidden;
    setFinanceMenuOpen(willOpen);
    if (willOpen && financeiroView.hidden) showFinanceSection('receitas');
});
financeItems.forEach(item => item.addEventListener('click', () => showFinanceSection(item.dataset.finance)));

const dateLabel = new Intl.DateTimeFormat('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'}).format(new Date());
document.querySelector('#today-label').textContent = '▦  ' + dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
