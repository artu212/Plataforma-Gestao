'use strict';

// TaskTime v1.0 — apontamentos pessoais no navegador.
const STORAGE_KEY = 'tasktime.entries.v1';
const TASKS_KEY = 'tasktime.tasks.v1';
// Catálogo de demonstração. No sistema real, projetos serão carregados da API.
const DEMO_PROJECTS = [
    {id: '23ADM', name: 'Administrativo'},
    {id: '23PA001', name: 'Projeto ambiental 001'},
    {id: '23PA002', name: 'Projeto ambiental 002'},
    {id: '25PDEMO', name: 'Projeto 2025 (demonstração)'},
    {id: '26PDEMO', name: 'Projeto 2026 (demonstração)'}
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
const durationInput = $('#entry-duration');
const monthInput = $('#month-filter');
const dayInput = $('#day-filter');
let appliedMonth = todayLocal().slice(0, 7);
let appliedDay = '';
const startInput = $('#entry-start');
const endInput = $('#entry-end');

function timeMinutes(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : null;
}

function syncFromPeriod() {
    const start = timeMinutes(startInput.value), end = timeMinutes(endInput.value);
    const valid = start !== null && end !== null && end > start;
    durationInput.value = valid ? formatMinutes(end - start) : '00h 00min';
    endInput.setCustomValidity(start !== null && end !== null && end <= start ? 'O fim deve ser posterior ao início.' : '');
}

startInput.addEventListener('input', syncFromPeriod);
endInput.addEventListener('input', syncFromPeriod);
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
        alert('Não foi possível salvar os dados neste navegador. Verifique o espaço disponível no navegador.');
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
    return entries.filter((entry) => entry.date.slice(0, 7) === appliedMonth)
        ;
}

function addCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
}

function render() {
    const monthly = monthEntries();
    const visible = monthly.filter(entry => !appliedDay || entry.date === appliedDay)
        .sort((a, b) => (a.date.localeCompare(b.date) || (a.start || '99:99').localeCompare(b.start || '99:99') || a.id.localeCompare(b.id)));
    const total = visible.reduce((sum, entry) => sum + entry.minutes, 0);
    $('#monthly-total').textContent = formatMinutes(monthly.reduce((sum, entry) => sum + entry.minutes, 0));
    $('#monthly-count').textContent = String(monthly.length);
    $('#history-total').textContent = formatMinutes(total);
    tableBody.replaceChildren();

    if (!visible.length) {
        const row = document.createElement('tr');
        row.className = 'empty-row';
        const cell = addCell(row, 'Nenhum apontamento no período selecionado.');
        cell.colSpan = 6;
        return;
    }

    for (const entry of visible) {
        const row = document.createElement('tr');
        addCell(row, formatDate(entry.date));
        addCell(row, entry.project);
        addCell(row, entry.task);
        addCell(row, entry.start && entry.end ? `${entry.start} – ${entry.end}` : "—");
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
    syncFromPeriod();
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
    const selectedProject = findProject(projectInput.value.trim());
    const selectedTask = findTask(taskInput.value);
    const project = selectedProject?.id || '';
    const task = selectedTask || '';

    const start = timeMinutes(startInput.value), end = timeMinutes(endInput.value);
    if (!validDate(dateInput.value) || !project || !task || start === null || end === null || end <= start) {
        showFeedback('Selecione o projeto e a tarefa e informe um período válido no mesmo dia.', 'error');
        return;
    }
    const entry = {
        start: startInput.value || null,
        end: endInput.value || null,
        id: editingId || createId(),
        date: dateInput.value,
        project,
        task,
        minutes: end - start
    };
    const next = editingId
        ? entries.map((item) => item.id === editingId ? entry : item)
        : [...entries, entry];

    if (!saveEntries(next)) return;
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
    projectInput.value = matchedProject ? `${matchedProject.id} — ${matchedProject.name}` : "";
    taskInput.value = entry.task;
    startInput.value = entry.start || '';
    endInput.value = entry.end || '';
    syncFromPeriod();
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
monthInput.addEventListener('change', () => {
    dayInput.value = '';
});
dayInput.addEventListener('change', () => {
    if (dayInput.value) monthInput.value = dayInput.value.slice(0, 7);
});
$('#apply-hours-filter').addEventListener('click', () => {
    if (!monthInput.value) {
        monthInput.reportValidity();
        return;
    }
    appliedMonth = monthInput.value;
    appliedDay = dayInput.value;
    render();
});
$('#clear-day').addEventListener('click', () => {
    dayInput.value = '';
});


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
    receitas: ['Receitas', 'Acompanhe o planejamento, faturamento e recebimento dos projetos.'],
    despesas: ['Despesas', 'Área reservada para o futuro controle de despesas vinculadas aos projetos.']
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
    $('#receipts-panel').hidden = section !== 'receitas';
    if (section === 'receitas') renderRevenue();
    $('#expenses-panel').hidden = section !== 'despesas';
    if (section === 'despesas') renderExpenses();
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

// Financeiro / Despesas - prototipo local, sem integracao com API.
const EXPENSES_KEY = 'hidrogeo.expenses.v1';
const expenseResources = ['Despesas diversas', 'Passagens aéreas', 'Hospedagem', 'Alimentação', 'Combustível', 'Locação de veículos', 'Laboratórios', 'Equipamentos', 'Materiais de consumo', 'EPI', 'Serviços de terceiros', 'Deslocamentos', 'Fretes'];
const expenseProject = $('#expense-project');
const expenseDialog = $('#expense-dialog');
const expenseForm = $('#expense-form');
const expenseMoney = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
let expenseEditingId = null;
let expenseLinkedProject = null;
let expenses = [];
try {
    const saved = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    if (Array.isArray(saved)) expenses = saved.filter(e => e && typeof e.id === 'string' && typeof e.name === 'string' && typeof e.task === 'string' && typeof e.project === 'string' && typeof e.resource === 'string' && ((validDate(e.date || '') && Number.isSafeInteger(e.cents) && e.cents > 0 && Number.isFinite(e.quantity) && e.quantity > 0 && Number.isSafeInteger(Math.round(e.cents * e.quantity))) || (e.planned === true && validDate(e.planDate || '') && Number.isSafeInteger(e.planCents) && e.planCents > 0 && e.cents == null))).map(e => ({
        ...e,
        planned: e.planned === true,
        owner: e.owner || '',
        audit: Array.isArray(e.audit) ? e.audit : []
    }));
} catch (error) {
    console.warn('Não foi possível ler as despesas.', error);
}
for (const project of projectCatalog) {
    expenseProject.add(new Option(`${project.id} — ${project.name}`, project.id));
}
for (const resource of expenseResources) $('#expense-resource').add(new Option(resource, resource));
const expenseUsers = ['Usuário demo 01', 'Usuário demo 02', 'Usuário demo 03'];
for (const id of ['#expense-owner']) {
    for (const user of expenseUsers) $(id).add(new Option(user, user));
}
// Configuração local por projeto; fórmula parametrizada, sem execução de código.
const MARKUP_KEY = 'hidrogeo.markup.v1';
let markupConfigs = {};
try {
    const data = JSON.parse(localStorage.getItem(MARKUP_KEY) || '{}');
    if (data && typeof data === 'object' && !Array.isArray(data)) markupConfigs = data;
} catch { /* fallback */
}
const validMarkup = m => m && Number.isFinite(m.divisor) && m.divisor >= 0.0001 && m.divisor <= 100 && Number.isFinite(m.factor) && m.factor >= 0.0001 && m.factor <= 100;

function projectMarkup(id) {
    const saved = markupConfigs[id];
    if (validMarkup(saved)) return {divisor: saved.divisor, factor: saved.factor};
    if (/^26P/i.test(id)) return {divisor: 0.85, factor: 1.35};
    if (/^25P/i.test(id)) return {divisor: 0.85, factor: 1.25};
    return null;
}

function markupCents(cents, formula) {
    if (cents == null || !validMarkup(formula)) return null;
    const result = Math.round(cents / formula.divisor * formula.factor);
    return Number.isSafeInteger(result) ? result : null;
}

let expenseMarkup = null;
let configProject = null;
const markupDialog = $('#markup-dialog');

function configValues() {
    return {divisor: Number($('#markup-divisor').value), factor: Number($('#markup-factor').value)};
}

function configPreview() {
    const m = configValues();
    $('#markup-config-preview').textContent = validMarkup(m) ? `Exemplo: R$ 100,00 → ${expenseFormat(markupCents(10000, m))}` : 'Informe divisor e multiplicador positivos.';
}

$('#markup-open').addEventListener('click', () => {
    configProject = expenseProject.value;
    if (!configProject) return;
    const m = projectMarkup(configProject);
    $('#markup-project-label').textContent = expenseProject.selectedOptions[0].textContent;
    $('#markup-divisor').value = m?.divisor ?? '';
    $('#markup-factor').value = m?.factor ?? '';
    $('#markup-config-feedback').textContent = '';
    configPreview();
    markupDialog.showModal();
});
$('#markup-divisor').addEventListener('input', configPreview);
$('#markup-factor').addEventListener('input', configPreview);
$('#markup-close').addEventListener('click', () => markupDialog.close());
$('#markup-config').addEventListener('submit', event => {
    event.preventDefault();
    const m = configValues();
    if (!validMarkup(m)) return;
    const old = markupConfigs[configProject];
    const next = {
        ...markupConfigs,
        [configProject]: {
            ...m,
            history: [...(Array.isArray(old?.history) ? old.history : []), {
                at: new Date().toISOString(),
                before: projectMarkup(configProject),
                after: m
            }]
        }
    };
    try {
        localStorage.setItem(MARKUP_KEY, JSON.stringify(next));
        markupConfigs = next;
        markupDialog.close();
        $('#expense-feedback').textContent = 'Markup do projeto atualizado para novos registros.';
    } catch {
        $('#markup-config-feedback').textContent = 'Não foi possível salvar a configuração.';
    }
});
const expenseTotalCents = e => e.cents == null ? null : Math.round(e.cents * e.quantity);
const expenseFormat = cents => cents == null ? '—' : expenseMoney.format(cents / 100);
const expenseDateFormat = date => date ? formatDate(date) : '—';
const auditTime = date => date ? new Date(date).toLocaleString('pt-BR') : '—';

function syncExpenseMode() {
    const planned = $('#expense-planned').checked;
    const actual = !planned || $('#expense-realized').checked;
    $('#expense-plan-fields').hidden = !planned;
    $('#expense-plan-fields').disabled = !planned;
    $('#expense-real-fields').hidden = !actual;
    $('#expense-real-fields').disabled = !actual;
    updateExpensePreview();
}

function expenseSnapshot(e) {
    const {audit, ...data} = e;
    return data;
}

function renderExpenseAudit(e) {
    const list = $('#expense-audit-list');
    list.replaceChildren();
    $('#expense-audit').hidden = !e;
    if (!e) return;
    if (!e.audit.length) list.textContent = 'Registro sem histórico de alterações.';
    for (const item of [...e.audit].reverse()) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = `${item.action} — ${auditTime(item.at)}`;
        details.append(summary);
        const pre = document.createElement('div');
        const fields = {
            name: 'Nome',
            task: 'Tarefa',
            resource: 'Recurso',
            date: 'Data real',
            cents: 'Valor unitário real',
            quantity: 'Quantidade',
            planned: 'Planejada',
            planDate: 'Data planejada',
            planCents: 'Valor planejado (já com markup)',
            owner: 'Responsável',
            description: 'Descrição',
            markup: 'Fórmula de markup'
        };
        const display = (key, value) => value == null || value === '' ? '—' : ['cents', 'planCents'].includes(key) ? expenseFormat(value) : ['date', 'planDate'].includes(key) ? expenseDateFormat(value) : key === 'planned' ? (value ? 'Sim' : 'Não') : key === 'markup' ? `valor / ${value.divisor} × ${value.factor}` : String(value);
        for (const [key, label] of Object.entries(fields)) {
            if (item.before && JSON.stringify(item.before[key]) === JSON.stringify(item.after?.[key])) continue;
            const line = document.createElement('p');
            line.textContent = `${label}: ${item.before ? display(key, item.before[key]) + ' → ' : ''}${display(key, item.after?.[key])}`;
            pre.append(line);
        }
        details.append(pre);
        list.append(details);
    }
}

function persistExpenses(next) {
    try {
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(next));
        expenses = next;
        return true;
    } catch {
        return false;
    }
}

function renderExpenses() {
    const search = $('#expense-search').value.trim().toLocaleLowerCase('pt-BR');
    const rows = expenses.filter(e => !e.deleted && e.project === expenseProject.value && `${e.name} ${e.task} ${e.resource}`.toLocaleLowerCase('pt-BR').includes(search)).sort((a, b) => (b.date || b.planDate || "").localeCompare(a.date || a.planDate || ""));
    const body = $('#expense-body');
    body.replaceChildren();
    for (const e of rows) {
        const row = document.createElement('tr');
        const actual = expenseTotalCents(e);
        const last = e.audit.at(-1);
        for (const value of [e.name, e.task, expenseDateFormat(e.date), e.project, e.resource, expenseFormat(e.cents), e.quantity == null ? '—' : e.quantity.toLocaleString('pt-BR'), expenseFormat(actual), expenseFormat(markupCents(actual, e.markup)), expenseDateFormat(e.planDate), expenseFormat(e.planCents), expenseFormat(e.planned && actual != null && markupCents(actual, e.markup) != null ? markupCents(actual, e.markup) - e.planCents : null), e.owner || 'Não informado', last ? auditTime(last.at) : 'Não registrado']) addCell(row, value);
        const actions = addCell(row, '');
        for (const [action, label] of [['edit', 'Editar'], ['delete', 'Excluir']]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `table-action ${action === 'delete' ? 'delete' : ''}`;
            button.dataset.expenseAction = action;
            button.dataset.id = e.id;
            button.textContent = label;
            actions.appendChild(button);
        }
        body.appendChild(row);
    }
    if (!rows.length) {
        const row = document.createElement('tr');
        row.className = 'empty-row';
        addCell(row, 'Nenhuma despesa para exibir.').colSpan = 15;
        body.appendChild(row);
    }
    $('#expense-count').textContent = `${rows.length} despesa(s)`;
    $('#expense-total').textContent = `Planejado: ${expenseFormat(rows.reduce((sum, e) => sum + (e.planned ? e.planCents : 0), 0))} | Real sem markup: ${expenseFormat(rows.reduce((sum, e) => sum + (expenseTotalCents(e) ?? 0), 0))} | Real com markup: ${rows.some(e => expenseTotalCents(e) != null && markupCents(expenseTotalCents(e), e.markup) == null) ? "Incompleto (markup pendente)" : expenseFormat(rows.reduce((sum, e) => sum + (markupCents(expenseTotalCents(e), e.markup) ?? 0), 0))}`;
}

function updateExpensePreview() {
    const cents = Math.round(Number($('#expense-value').value) * 100);
    const quantity = Number($('#expense-quantity').value);
    const actual = !$('#expense-real-fields').disabled;
    $('#markup-unit').value = actual && cents > 0 ? expenseFormat(markupCents(cents, expenseMarkup)) : '—';
    $('#markup-total').textContent = actual && cents > 0 && quantity > 0 ? expenseFormat(markupCents(Math.round(cents * quantity), expenseMarkup)) : '—';
    $('#markup-formula').textContent = expenseMarkup ? `Fórmula: valor / ${expenseMarkup.divisor.toLocaleString('pt-BR')} × ${expenseMarkup.factor.toLocaleString('pt-BR')}` : 'Markup não configurado para este projeto. Configure antes de lançar novas despesas.';
    if (!actual) {
        $('#expense-preview').textContent = 'Não realizado';
        return;
    }
    $('#expense-preview').textContent = expenseMoney.format(cents > 0 && quantity > 0 ? Math.round(cents * quantity) / 100 : 0);
}

function openExpense(e = null) {
    expenseForm.reset();
    expenseEditingId = e?.id || null;
    expenseLinkedProject = e?.project || expenseProject.value;
    expenseMarkup = e && validMarkup(e.markup) ? e.markup : projectMarkup(expenseLinkedProject);
    const project = projectCatalog.find(p => p.id === expenseLinkedProject);
    if (!project) return;
    $('#expense-linked-project').value = `${project.id} — ${project.name}`;
    $('#expense-remove').hidden = !e;
    $('#expense-title').textContent = e ? 'Editar despesa' : 'Adicionar despesa';
    $('#expense-name').value = e?.name || '';
    $('#expense-task').value = e?.task || '';
    $('#expense-date').value = e ? (e.date || '') : todayLocal();
    $('#expense-resource').value = e?.resource || '';
    $('#expense-value').value = e?.cents != null ? (e.cents / 100).toFixed(2) : '';
    $('#expense-quantity').value = e?.quantity || 1;
    $('#expense-description').value = e?.description || '';
    $('#expense-form-feedback').textContent = '';
    $('#expense-planned').checked = !!e?.planned;
    $('#expense-plan-date').value = e?.planDate || '';
    $('#expense-plan-value').value = e?.planCents != null ? (e.planCents / 100).toFixed(2) : '';
    $('#expense-realized').checked = e?.cents != null;
    $('#expense-owner').value = e?.owner || '';
    renderExpenseAudit(e);
    syncExpenseMode();
    expenseDialog.showModal();
    $('#expense-name').focus();
}

$('#expense-add').addEventListener('click', () => openExpense());
$('#expense-close').addEventListener('click', () => expenseDialog.close());
$('#expense-cancel').addEventListener('click', () => expenseDialog.close());
$('#expense-search').addEventListener('input', renderExpenses);
expenseProject.addEventListener('change', renderExpenses);
$('#expense-value').addEventListener('input', updateExpensePreview);
$('#expense-plan-value').addEventListener('input', updateExpensePreview);
$('#expense-quantity').addEventListener('input', updateExpensePreview);
$('#expense-planned').addEventListener('change', syncExpenseMode);
$('#expense-realized').addEventListener('change', syncExpenseMode);
expenseForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#expense-name').value.trim();
    const task = findTask($('#expense-task').value);
    const planned = $('#expense-planned').checked;
    const realized = !planned || $('#expense-realized').checked;
    const date = realized ? $('#expense-date').value : null;
    const resource = $('#expense-resource').value;
    const cents = realized ? Math.round(Number($('#expense-value').value) * 100) : null;
    const quantity = realized ? Number($('#expense-quantity').value) : null;
    const planDate = planned ? $('#expense-plan-date').value : null;
    const planCents = planned ? Math.round(Number($('#expense-plan-value').value) * 100) : null;
    const owner = $('#expense-owner').value;
    if (!name || !task || !expenseResources.includes(resource) || !projectCatalog.some(p => p.id === expenseLinkedProject) || !expenseUsers.includes(owner) || (planned && (!validDate(planDate) || !Number.isSafeInteger(planCents) || planCents <= 0)) || (realized && (!validDate(date) || !Number.isSafeInteger(cents) || cents <= 0 || !Number.isFinite(quantity) || quantity <= 0 || !Number.isSafeInteger(Math.round(cents * quantity))))) {
        $('#expense-form-feedback').textContent = 'Confira os campos obrigatórios, os valores e o usuário responsável.';
        return;
    }
    if (realized && (!validMarkup(expenseMarkup) || markupCents(Math.round(cents * quantity), expenseMarkup) == null)) {
        $('#expense-form-feedback').textContent = 'Configure um markup válido para este projeto e confira os valores.';
        return;
    }
    const old = expenses.find(e => e.id === expenseEditingId);
    const record = {
        id: expenseEditingId || createId(),
        project: expenseLinkedProject,
        name,
        task,
        date,
        resource,
        cents,
        quantity,
        planned,
        planDate,
        planCents,
        owner,
        markup: validMarkup(expenseMarkup) ? {...expenseMarkup} : null,
        description: $('#expense-description').value.trim()
    };
    record.audit = [...(old?.audit || []), {
        action: old ? 'Alteração' : 'Criação',
        at: new Date().toISOString(),
        before: old ? expenseSnapshot(old) : null,
        after: expenseSnapshot(record)
    }];
    const next = expenseEditingId ? expenses.map(e => e.id === expenseEditingId ? record : e) : [...expenses, record];
    if (!persistExpenses(next)) {
        $('#expense-form-feedback').textContent = 'Não foi possível salvar neste navegador.';
        return;
    }
    expenseDialog.close();
    renderExpenses();
    $('#expense-feedback').textContent = 'Despesa salva com sucesso.';
});
$('#expense-body').addEventListener('click', event => {
    const button = event.target.closest('button[data-expense-action]');
    if (!button) return;
    const e = expenses.find(item => item.id === button.dataset.id);
    if (!e) return;
    if (button.dataset.expenseAction === 'edit') openExpense(e);
    else {
        openExpense(e);
        $('#expense-form-feedback').textContent = 'Clique em Excluir registro para confirmar.';
    }
});
$('#expense-remove').addEventListener('click', () => {
    const e = expenses.find(item => item.id === expenseEditingId);
    if (!e) return;
    if (confirm(`Excluir a despesa ${e.name}?`)) {
        const removed = {...e, deleted: true};
        removed.audit = [...e.audit, {
            action: 'Exclusão',
            at: new Date().toISOString(),
            before: expenseSnapshot(e),
            after: expenseSnapshot(removed)
        }];
        if (persistExpenses(expenses.map(item => item.id === e.id ? removed : item))) {
            expenseDialog.close();
            renderExpenses();
            $('#expense-feedback').textContent = 'Despesa excluída.';
        } else $('#expense-feedback').textContent = 'Não foi possível excluir a despesa.';
    }
});
renderExpenses();

// Financeiro / Receitas. Dados e anexos em IndexedDB, separados por projeto.
const rrProject = $('#rr-project');
const rrDialog = $('#rr-dialog');
const rrForm = $('#rr-form');
let rrEditing = null, rrLinked = null, rrRemoveFile = false, rrBusy = false;
let rrData = {contracts: {}, receipts: []};
const rrDb = new Promise((resolve, reject) => {
    const req = indexedDB.open('hidrogeo-receitas', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('data');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

async function rrStore(next) {
    const db = await rrDb;
    await new Promise((resolve, reject) => {
        const tx = db.transaction('data', 'readwrite');
        tx.objectStore('data').put(next, 'state');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
    rrData = next;
}

const rrReady = rrDb.then(db => new Promise((resolve, reject) => {
    const req = db.transaction('data').objectStore('data').get('state');
    req.onsuccess = () => {
        if (req.result) rrData = req.result;
        resolve();
    };
    req.onerror = () => reject(req.error);
})).then(() => {
    renderRevenue();
    return true;
}).catch(() => {
    $('#rr-feedback').textContent = 'Armazenamento indisponível. Não será possível salvar receitas.';
    return false;
});
for (const p of projectCatalog) rrProject.add(new Option(`${p.id} — ${p.name}`, p.id));
for (const user of expenseUsers) for (const id of ['rc-owner', 'rr-owner']) $('#' + id).add(new Option(user, user));
const rcFields = ['contract', 'gross', 'released', 'net', 'resources', 'proposal', 'proposal-date', 'type', 'owner', 'comment'];
const rrFields = ['name', 'task', 'plan-date', 'plan', 'bm', 'billing', 'invoice', 'actual', 'due', 'paid-date', 'paid', 'owner', 'comment'];
const rrAmounts = ['plan', 'actual', 'paid'];
const rrRead = (prefix, fields) => Object.fromEntries(fields.map(k => [k, $('#' + prefix + '-' + k).value.trim()]));
const rrFill = (prefix, fields, data) => fields.forEach(k => $('#' + prefix + '-' + k).value = data?.[k] ?? '');
const rrCents = v => v === '' || v == null ? null : Math.round(Number(v) * 100);
const rrSum = (rows, k) => rows.reduce((s, r) => s + (rrCents(r[k]) ?? 0), 0);

function rrStatus(r) {
    if (r['paid-date']) return rrCents(r.paid) < rrCents(r.actual) ? 'Recebido parcialmente' : 'Recebido';
    if (r.actual && r.invoice) return 'NF registrada';
    if (r.billing) return 'Enviado à contabilidade';
    if (r.bm) return 'BM enviado';
    return 'Planejado';
}

function renderRevenue() {
    const id = rrProject.value;
    const contract = rrData.contracts[id] || {};
    const project = projectCatalog.find(p => p.id === id);
    $('#rc-client').value = project ? `${project.id} — ${project.name}` : id;
    const billingType = $('#rc-type');
    for (const option of [...billingType.options]) if (option.dataset.legacy) option.remove();
    if (contract.type && ![...billingType.options].some(o => o.value === contract.type)) {
        const option = new Option(contract.type, contract.type);
        option.dataset.legacy = 'true';
        billingType.add(option);
    }
    rrFill('rc', rcFields, contract);
    const all = rrData.receipts.filter(r => r.project === id);
    const planned = rrSum(all, 'plan'), actual = rrSum(all, 'actual'), paid = rrSum(all, 'paid');
    const gross = rrCents(contract.gross);
    const cards = [['Bruto contratado', gross], ['Total previsto', planned], ['Total NF emitidas / registradas', actual], ['Total recebido', paid], ['Saldo a faturar', gross == null ? null : gross - actual], ['Diferença previsão x contrato', gross == null ? null : planned - gross], ['Desvio NF x previsão (notas registradas)', actual - rrSum(all.filter(r => r.actual), 'plan')], ['Saldo das notas a receber', actual - paid]];
    const kpis = $('#rr-kpis');
    kpis.replaceChildren();
    for (const [label, value] of cards) {
        const card = document.createElement('div');
        card.className = 'revenue-kpi';
        const small = document.createElement('small');
        small.textContent = label;
        const strong = document.createElement('strong');
        strong.textContent = expenseFormat(value);
        card.append(small, strong);
        kpis.append(card);
    }
    renderRevenueRows();
}

function renderRevenueRows() {
    const query = $('#rr-search').value.toLocaleLowerCase('pt-BR');
    const rows = rrData.receipts.filter(r => r.project === rrProject.value && `${r.name} ${r.invoice} ${r.task}`.toLocaleLowerCase('pt-BR').includes(query)).sort((a, b) => a['plan-date'].localeCompare(b['plan-date']));
    const body = $('#rr-body');
    body.replaceChildren();
    if (!rows.length) {
        const row = body.insertRow();
        const cell = addCell(row, 'Nenhuma receita cadastrada.');
        cell.colSpan = 13;
        return;
    }
    for (const r of rows) {
        const row = body.insertRow();
        for (const v of [r.name, expenseDateFormat(r['plan-date']), expenseFormat(rrCents(r.plan)), expenseDateFormat(r.bm), expenseDateFormat(r.billing), r.invoice || '—', expenseFormat(rrCents(r.actual)), expenseFormat(r.actual ? rrCents(r.actual) - rrCents(r.plan) : null), expenseDateFormat(r.due), expenseDateFormat(r['paid-date']), expenseFormat(rrCents(r.paid)), rrStatus(r)]) addCell(row, v);
        const cell = row.insertCell();
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'table-action';
        button.textContent = 'Editar / baixar';
        button.onclick = () => rrOpen(r);
        cell.append(button);
    }
}

rrProject.addEventListener('change', () => {
    $('#rc-feedback').textContent = '';
    renderRevenue();
});
$('#rr-search').addEventListener('input', renderRevenueRows);

function rrTab(flow) {
    for (const [id, active] of [['rr-main-tab', !flow], ['rr-flow-tab', flow]]) {
        const b = $('#' + id);
        b.classList.toggle('button-primary', active);
        b.classList.toggle('button-outline', !active);
        b.setAttribute('aria-pressed', String(active));
    }
    $('#rr-main').hidden = flow;
    $('#rr-flow').hidden = !flow;
}

$('#rr-main-tab').onclick = () => rrTab(false);
$('#rr-flow-tab').onclick = () => rrTab(true);
$('#rc-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (rrBusy) return;
    rrBusy = true;
    const project = rrProject.value;
    const data = rrRead('rc', rcFields);
    try {
        if (!await rrReady) throw Error();
        await rrStore({
            ...rrData,
            contracts: {...rrData.contracts, [project]: {...rrData.contracts[project], ...data}}
        });
        renderRevenue();
        $('#rc-feedback').textContent = 'Dados contratuais salvos.';
    } catch {
        $('#rc-feedback').textContent = 'Não foi possível salvar.';
    } finally {
        rrBusy = false;
    }
});

function rrAttachment(r) {
    const box = $('#rr-attachment');
    box.replaceChildren();
    if (!r?.attachment || rrRemoveFile) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'button button-outline';
    b.textContent = 'Baixar ' + r.attachment.name;
    b.onclick = () => downloadBlob(r.attachment.blob, r.attachment.name);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button button-outline';
    remove.textContent = 'Remover anexo';
    remove.onclick = () => {
        rrRemoveFile = true;
        rrAttachment(r);
    };
    box.append(b, remove);
}

function rrOpen(r) {
    if (rrBusy) return;
    rrForm.reset();
    rrEditing = r?.id || null;
    rrLinked = r?.project || rrProject.value;
    rrRemoveFile = false;
    $('#rr-linked').value = projectCatalog.find(p => p.id === rrLinked)?.name || rrLinked;
    rrFill('rr', rrFields, r);
    $('#rr-title').textContent = r ? 'Editar / dar baixa na receita' : 'Adicionar receita';
    $('#rr-delete').hidden = !r;
    $('#rr-error').textContent = '';
    rrAttachment(r);
    rrDialog.showModal();
}

$('#rr-add').onclick = () => rrOpen();
$('#rr-close').onclick = () => {
    if (!rrBusy) rrDialog.close();
};
rrDialog.addEventListener('cancel', e => {
    if (rrBusy) e.preventDefault();
});
rrForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (rrBusy) return;
    const r = rrRead('rr', rrFields);
    const error = $('#rr-error');
    error.textContent = '';
    if (!r.name || !validDate(r['plan-date']) || !rrCents(r.plan) || rrAmounts.some(k => r[k] && (!Number.isSafeInteger(rrCents(r[k])) || rrCents(r[k]) <= 0))) {
        error.textContent = 'Confira os valores e a previsão.';
        return;
    }
    if ((r.actual && !r.invoice) || (!r.actual && r.invoice)) {
        error.textContent = 'Informe número e valor da nota juntos.';
        return;
    }
    if (Boolean(r.paid) !== Boolean(r['paid-date']) || (r.paid && !r.actual)) {
        error.textContent = 'Para dar baixa, informe nota, data e valor recebido.';
        return;
    }
    const file = $('#rr-file').files[0];
    if (file && (file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))) {
        error.textContent = 'Selecione PDF, PNG ou JPEG de até 10 MB.';
        return;
    }
    if (file && !r.invoice) {
        error.textContent = 'Informe os dados da nota antes de anexar.';
        return;
    }
    rrBusy = true;
    $('#rr-save').disabled = true;
    try {
        if (!await rrReady) throw Error();
        const old = rrData.receipts.find(x => x.id === rrEditing);
        const attachment = file ? {name: file.name, blob: file} : rrRemoveFile ? null : old?.attachment || null;
        if (attachment && !r.invoice) {
            error.textContent = 'Remova o anexo antes de apagar a nota.';
            return;
        }
        const record = {
            ...r,
            id: rrEditing || createId(),
            project: rrLinked,
            attachment,
            createdAt: old?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await rrStore({
            ...rrData,
            receipts: old ? rrData.receipts.map(x => x.id === old.id ? record : x) : [...rrData.receipts, record]
        });
        rrDialog.close();
        renderRevenue();
        $('#rr-feedback').textContent = 'Receita salva.';
    } catch {
        error.textContent = 'Não foi possível salvar a receita ou o anexo.';
    } finally {
        rrBusy = false;
        $('#rr-save').disabled = false;
    }
});
$('#rr-delete').onclick = async () => {
    if (rrBusy || !rrEditing || !confirm('Excluir esta receita e seu anexo?')) return;
    rrBusy = true;
    try {
        if (!await rrReady) throw Error();
        await rrStore({...rrData, receipts: rrData.receipts.filter(r => r.id !== rrEditing)});
        rrDialog.close();
        renderRevenue();
    } catch {
        $('#rr-error').textContent = 'Não foi possível excluir.';
    } finally {
        rrBusy = false;
    }
};
