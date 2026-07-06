/**
 * CodeDrop public pack review queue.
 * Admin-only UI for pending custom packs.
 */

const AdminPacks = (() => {
    const API_BASE = (typeof window !== 'undefined' && window.CODEDROP_API_BASE) || '/games/codedrop';
    const ui = {};
    const stateRef = {
        packs: [],
        selectedId: null,
        selectedPack: null,
        loading: false,
        intent: '',
        intentConsumed: false,
        statusKey: 'admin.pendingQueue',
        statusArgs: {},
        statusDanger: false
    };

    function $(id) {
        return document.getElementById(id);
    }

    function apiPath(path) {
        return `${API_BASE}${path}`;
    }

    function escapeText(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function tr(key, replacements = {}) {
        if (window.CodeDropI18n && typeof window.CodeDropI18n.t === 'function') {
            return window.CodeDropI18n.t(key, replacements);
        }
        let text = key;
        Object.entries(replacements).forEach(([name, value]) => {
            text = text.replaceAll(`{${name}}`, value);
        });
        return text;
    }

    function statusLabel(status) {
        const normalized = String(status || 'pending').toLowerCase();
        if (normalized === 'approved') return tr('admin.approved');
        if (normalized === 'rejected') return tr('admin.rejected');
        return tr('admin.pending');
    }

    function currentToken() {
        try {
            const user = JSON.parse(localStorage.getItem('codedrop_user') || '{}');
            return typeof user.token === 'string' ? user.token : '';
        } catch {
            return '';
        }
    }

    function authHeaders() {
        const token = currentToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    function targetPackIdFromUrl() {
        return Number(new URLSearchParams(window.location.search).get('pack')) || null;
    }

    function intentFromUrl() {
        const intent = new URLSearchParams(window.location.search).get('intent');
        return intent === 'approve' || intent === 'reject' ? intent : '';
    }

    function setStatusText(message, danger = false) {
        if (!ui.status) return;
        ui.status.textContent = message;
        ui.status.classList.toggle('danger', danger);
    }

    function setStatus(key, replacements = {}, danger = false) {
        stateRef.statusKey = key;
        stateRef.statusArgs = { ...replacements };
        stateRef.statusDanger = danger;
        setStatusText(tr(key, replacements), danger);
    }

    function setErrorStatus(message) {
        stateRef.statusKey = '';
        stateRef.statusArgs = {};
        stateRef.statusDanger = true;
        setStatusText(message, true);
    }

    function clearNode(node) {
        while (node && node.firstChild) node.removeChild(node.firstChild);
    }

    function syncChrome() {
        if (typeof window.syncCodeDropChrome === 'function') window.syncCodeDropChrome();
    }

    async function dialog(options) {
        if (typeof showCommandDialog === 'function') {
            return showCommandDialog(options);
        }
        setErrorStatus(`${options.title}: ${options.message}`);
        return { accepted: false, value: '' };
    }

    async function requestJson(path, options = {}) {
        const res = await fetch(apiPath(path), {
            ...options,
            headers: {
                ...(options.headers || {}),
                ...authHeaders()
            },
            cache: 'no-store'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(data.error || `Request failed: ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return data;
    }

    function renderLoginPrompt(error = '') {
        stateRef.selectedPack = null;
        clearNode(ui.list);
        const message = error || tr('admin.loginRequiredMessage');
        ui.detail.innerHTML = `
            <div class="admin-login-card">
                <div class="admin-login-title">${escapeText(tr('admin.loginTitle'))}</div>
                <p>${escapeText(tr('admin.loginSubtitle'))}</p>
                <form id="admin-login-form" class="admin-login-form">
                    <input id="admin-login-nick" type="text" autocomplete="username" placeholder="${escapeText(tr('auth.nickname'))}">
                    <input id="admin-login-pass" type="password" autocomplete="current-password" placeholder="${escapeText(tr('auth.password'))}">
                    <button class="btn-small" id="admin-login-submit" type="submit">${escapeText(tr('admin.loginAction'))}</button>
                </form>
                <div class="admin-login-error">${escapeText(message)}</div>
            </div>
        `;
        const form = $('admin-login-form');
        const nick = $('admin-login-nick');
        const pass = $('admin-login-pass');
        form?.addEventListener('submit', handleAdminLogin);
        nick?.focus();
        if (!ui.list.textContent.trim()) {
            const empty = document.createElement('div');
            empty.className = 'admin-pack-empty';
            empty.textContent = tr('admin.loginRequired');
            ui.list.appendChild(empty);
        }
    }

    async function handleAdminLogin(event) {
        event.preventDefault();
        const nick = $('admin-login-nick');
        const pass = $('admin-login-pass');
        const button = $('admin-login-submit');
        const nickname = nick?.value.trim() || '';
        const password = pass?.value || '';
        if (!nickname || !password) {
            renderLoginPrompt(tr('admin.loginRequiredMessage'));
            return;
        }

        if (button) button.disabled = true;
        setStatus('admin.loadingQueue');
        try {
            const res = await fetch(apiPath('/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname, password }),
                cache: 'no-store'
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.token) {
                throw new Error(data.error || tr('admin.loginFailed'));
            }
            localStorage.setItem('codedrop_user', JSON.stringify({
                id: data.user_id,
                nickname: data.nickname,
                token: data.token
            }));
            await loadQueue(targetPackIdFromUrl());
        } catch (err) {
            setStatus('admin.loginRequired', {}, true);
            renderLoginPrompt(err.message || tr('admin.loginFailed'));
        } finally {
            if (button) button.disabled = false;
        }
    }

    function renderList() {
        clearNode(ui.list);

        if (!stateRef.packs.length) {
            const empty = document.createElement('div');
            empty.className = 'admin-pack-empty';
            empty.textContent = tr('admin.noPacks', { status: statusLabel(ui.filter.value) });
            ui.list.appendChild(empty);
            return;
        }

        stateRef.packs.forEach(pack => {
            const button = document.createElement('button');
            button.className = 'admin-pack-list-item';
            button.type = 'button';
            button.dataset.packId = pack.id;
            button.classList.toggle('active', Number(pack.id) === Number(stateRef.selectedId));
            button.innerHTML = `
                <div class="admin-pack-list-title">${escapeText(pack.title)}</div>
                <div class="admin-pack-list-meta">
                    ${escapeText(tr('admin.owner'))} ${escapeText(pack.ownerNickname || '-')} · ${escapeText(tr('admin.items', { count: Number(pack.itemCount || 0) }))}<br>
                    ${escapeText(statusLabel(pack.status))} · ${escapeText(tr('admin.missingSource', { count: Number(pack.missingSourceCount || 0) }))}
                </div>
            `;
            button.addEventListener('click', () => selectPack(pack.id));
            ui.list.appendChild(button);
        });
    }

    function sourceLink(source) {
        if (!source || !source.url) return `<span style="color:rgba(224,230,237,.45);">${escapeText(tr('admin.sourceMissing'))}</span>`;
        return `<a href="${escapeText(source.url)}" target="_blank" rel="noopener noreferrer">${escapeText(source.title || source.url)}</a>`;
    }

    function renderDetail(pack) {
        stateRef.selectedPack = pack;
        const items = Array.isArray(pack.items) ? pack.items : [];
        const missing = items.filter(item => !Array.isArray(item.sources) || item.sources.length === 0).length;
        const approveDisabled = pack.status === 'approved' ? 'disabled' : '';
        const rejectDisabled = pack.status === 'rejected' ? 'disabled' : '';
        ui.detail.innerHTML = `
            <div class="admin-pack-detail-head">
                <div>
                    <h2>${escapeText(pack.title)}</h2>
                    <div class="admin-pack-badges">
                        <span class="admin-pack-badge">${escapeText(statusLabel(pack.status))}</span>
                        <span class="admin-pack-badge">${escapeText(tr('admin.items', { count: items.length }))}</span>
                        <span class="admin-pack-badge">${escapeText(tr('admin.owner'))} ${escapeText(pack.ownerNickname || '-')}</span>
                        <span class="admin-pack-badge">${escapeText(tr('admin.missingSource', { count: missing }))}</span>
                    </div>
                </div>
                <div class="admin-pack-actions">
                    <button class="btn-small" id="admin-pack-approve" type="button" ${approveDisabled}>${escapeText(tr('admin.approve'))}</button>
                    <button class="btn-small btn-danger" id="admin-pack-reject" type="button" ${rejectDisabled}>${escapeText(tr('admin.reject'))}</button>
                </div>
            </div>
            <div class="admin-pack-empty" style="padding:0 0 14px;">${escapeText(pack.description || '')}</div>
            <div class="admin-pack-table-wrap">
                <table class="admin-pack-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>${escapeText(tr('admin.term'))}</th>
                            <th>${escapeText(tr('admin.description'))}</th>
                            <th>${escapeText(tr('admin.source'))}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, index) => `
                            <tr>
                                <td>${String(index + 1).padStart(2, '0')}</td>
                                <td>${escapeText(item.term)}</td>
                                <td>${escapeText(item.desc)}</td>
                                <td>${sourceLink((item.sources || [])[0])}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        $('admin-pack-approve')?.addEventListener('click', () => reviewPack(pack.id, 'approve'));
        $('admin-pack-reject')?.addEventListener('click', () => reviewPack(pack.id, 'reject'));
    }

    async function selectPack(id) {
        stateRef.selectedId = Number(id);
        renderList();
        ui.detail.innerHTML = `<div class="admin-pack-empty">${escapeText(tr('admin.loadingDetail'))}</div>`;
        try {
            const data = await requestJson(`/api/packs/${id}`);
            renderDetail(data.pack);
            setStatus('admin.loaded', { id });
            maybeRunIntent(id);
        } catch (err) {
            ui.detail.innerHTML = `<div class="admin-pack-empty">${escapeText(err.message)}</div>`;
            setErrorStatus(err.message);
        }
    }

    async function loadQueue(preferredId = null) {
        if (!currentToken()) {
            setStatus('admin.loginRequired', {}, true);
            renderLoginPrompt();
            return;
        }

        stateRef.loading = true;
        setStatus('admin.loadingQueue');
        try {
            const status = ui.filter.value || 'pending';
            const data = await requestJson(`/api/admin/packs?status=${encodeURIComponent(status)}`);
            stateRef.packs = Array.isArray(data.packs) ? data.packs : [];
            const targetId = preferredId || targetPackIdFromUrl() || stateRef.packs[0]?.id || null;
            stateRef.selectedId = targetId ? Number(targetId) : null;
            renderList();
            setStatus('admin.queueCount', { count: stateRef.packs.length, status: statusLabel(status) });
            if (targetId) await selectPack(targetId);
            else {
                stateRef.selectedPack = null;
                ui.detail.innerHTML = `<div class="admin-pack-empty">${escapeText(tr('admin.selectPack'))}</div>`;
            }
        } catch (err) {
            stateRef.packs = [];
            stateRef.selectedPack = null;
            renderList();
            const isForbidden = err.status === 403;
            if (isForbidden) {
                localStorage.removeItem('codedrop_user');
                window.dispatchEvent(new CustomEvent('codedrop:auth', { detail: null }));
                renderLoginPrompt(tr('admin.adminRequired'));
                setStatus('admin.adminRequired', {}, true);
            }
            else setErrorStatus(err.message);
        } finally {
            stateRef.loading = false;
        }
    }

    function maybeRunIntent(id) {
        const intent = stateRef.intent || intentFromUrl();
        if (!intent || stateRef.intentConsumed || Number(id) !== Number(targetPackIdFromUrl())) return;
        stateRef.intentConsumed = true;
        window.setTimeout(() => reviewPack(id, intent), 120);
    }

    async function reviewPack(id, action) {
        const isApprove = action === 'approve';
        const result = await dialog({
            title: isApprove ? tr('admin.approveTitle') : tr('admin.rejectTitle'),
            message: isApprove
                ? tr('admin.approveMessage')
                : tr('admin.rejectMessage'),
            okText: isApprove ? tr('admin.approve') : tr('admin.reject'),
            cancelText: tr('admin.cancel'),
            input: !isApprove,
            requireValue: false,
            placeholder: tr('admin.rejectReason'),
            danger: !isApprove
        });
        if (!result.accepted) return;

        setStatus(isApprove ? 'admin.approving' : 'admin.rejecting');
        try {
            const data = await requestJson(`/api/packs/${id}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    reason: result.value || ''
                })
            });
            renderDetail(data.pack);
            await loadQueue(id);
            setStatus(isApprove ? 'admin.approvedStatus' : 'admin.rejectedStatus');
        } catch (err) {
            setErrorStatus(err.message);
        }
    }

    function syncLanguage() {
        if (!ui.screen) return;
        renderList();
        if (stateRef.selectedPack) {
            renderDetail(stateRef.selectedPack);
        } else if (ui.detail && !ui.detail.textContent.trim()) {
            ui.detail.innerHTML = `<div class="admin-pack-empty">${escapeText(tr('admin.selectPack'))}</div>`;
        }
        if (stateRef.statusKey) {
            setStatus(stateRef.statusKey, stateRef.statusArgs, stateRef.statusDanger);
        }
    }

    function open() {
        if (!ui.screen) bind();
        if (!ui.screen) return;
        ui.screen.classList.remove('hidden');
        syncChrome();
        stateRef.intent = intentFromUrl();
        stateRef.intentConsumed = false;
        if (stateRef.intent === 'approve') setStatus('admin.approveIntent');
        else if (stateRef.intent === 'reject') setStatus('admin.rejectIntent');
        loadQueue();
    }

    function close() {
        if (!ui.screen) return;
        ui.screen.classList.add('hidden');
        syncChrome();
    }

    function bind() {
        ui.screen = $('admin-pack-screen');
        ui.close = $('admin-pack-close');
        ui.status = $('admin-pack-status');
        ui.filter = $('admin-pack-status-filter');
        ui.refresh = $('admin-pack-refresh');
        ui.list = $('admin-pack-list');
        ui.detail = $('admin-pack-detail');
        if (!ui.screen) return;
        ui.close?.addEventListener('click', event => {
            event.preventDefault();
            window.location.assign('/games/codedrop/');
        });
        ui.refresh?.addEventListener('click', () => loadQueue());
        ui.filter?.addEventListener('change', () => loadQueue());
        window.addEventListener('codedrop:auth', () => {
            if (!ui.screen.classList.contains('hidden')) loadQueue();
        });
        window.addEventListener('codedrop:language', syncLanguage);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }

    return { open, close, reload: loadQueue, syncLanguage };
})();

window.AdminPacks = AdminPacks;
