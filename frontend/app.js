
import { api, escapeHtml as e } from './api.js';

const $ = id => document.getElementById(id);

const modules = [
    'Overview',
    'Breed classifier',
    'Skin screening',
    'Health assessment',
    'Disease guide',
    'AI Care Assistant',
    'Productivity',
    'History',
    'Model lab'
];

const descriptions = [
    'Your livestock care workspace',
    'Identify a likely cattle or buffalo breed from a photo.',
    'Analyze visible skin conditions using intelligent image analysis.',
    'Compare observed symptoms with known disease patterns.',
    'Learn about common conditions and recommended care.',
    'Your intelligent companion for cattle health, nutrition and livestock management.',
    'Record and review milk output.',
    'Review your saved assessments.',
    'Explore model architecture, supported classes and validation results.'
];

const icons = [
    '⌂', '◉', '✚', '✓', '▤', '✦', '▥', '◷', '◎'
];

let user = null;
let page = 0;
let generation = 0;

const notice = '';

const title = (name, desc) => `
    <h1>${name}</h1>
    <p>${desc}</p>
`;

function error(err) {
    return `<div class="notice">${e(err.message)}</div>`;
}


// ==========================================
// CHAT RESPONSE FORMATTING
// ==========================================

function cleanAssistantResponse(value) {
    return String(value || '')
        .replace(/\s*\[Gemini[^\]\r\n]*\]/gi, '')
        .replace(/\bgemini-\d+(?:\.\d+)*(?:-[a-z0-9]+)*\b/gi, 'AI Care Assistant')
        .replace(/\bGemini\b/gi, 'SmartLivestock AI AI')
        .trim();
}

function renderInlineMarkdown(node, text) {
    const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*)/g);

    for (const part of parts) {
        if (
            (part.startsWith('**') && part.endsWith('**')) ||
            (part.startsWith('__') && part.endsWith('__'))
        ) {
            const strong = document.createElement('strong');
            strong.textContent = part.slice(2, -2);
            node.appendChild(strong);

        } else if (part.startsWith('`') && part.endsWith('`')) {
            const code = document.createElement('code');
            code.textContent = part.slice(1, -1);
            node.appendChild(code);

        } else if (part.startsWith('*') && part.endsWith('*')) {
            const italic = document.createElement('em');
            italic.textContent = part.slice(1, -1);
            node.appendChild(italic);

        } else {
            node.appendChild(document.createTextNode(part));
        }
    }
}

function renderAssistantMarkdown(container, value) {

    const text = cleanAssistantResponse(value);

    container.classList.add('formatted-answer');

    container.style.lineHeight = '1.8';
    container.style.fontSize = '14px';
    container.style.overflowWrap = 'anywhere';

    let activeList = null;
    let activeListType = '';

    for (const rawLine of text.split(/\r?\n/)) {

        const line = rawLine.trim();

        if (!line) {
            activeList = null;
            activeListType = '';
            continue;
        }

        // Horizontal divider
        if (/^([-*_])\1{2,}$/.test(line)) {
            const hr = document.createElement('hr');
            hr.style.margin = '15px 0';
            container.appendChild(hr);

            activeList = null;
            activeListType = '';
            continue;
        }

        // Markdown headings
        const heading = line.match(/^(#{1,6})\s+(.+)$/);

        if (heading) {
            const h = document.createElement('h3');

            h.style.margin = '18px 0 8px';
            h.style.fontSize = '16px';

            renderInlineMarkdown(h, heading[2]);

            container.appendChild(h);

            activeList = null;
            activeListType = '';
            continue;
        }

        // Bullet points and numbered lists
        const item = line.match(/^([-*•+]|\d+[.)])\s+(.+)$/);

        if (item) {

            const listType = /^\d/.test(item[1])
                ? 'ol'
                : 'ul';

            if (!activeList || activeListType !== listType) {

                activeList = document.createElement(listType);
                activeListType = listType;

                activeList.style.paddingLeft = '24px';
                activeList.style.margin = '8px 0 14px';
                activeList.style.listStyleType =
                    listType === 'ol' ? 'decimal' : 'disc';

                if (listType === 'ol') {
                    activeList.start = parseInt(item[1], 10);
                }

                container.appendChild(activeList);
            }

            const li = document.createElement('li');

            li.style.marginBottom = '7px';

            renderInlineMarkdown(li, item[2]);

            activeList.appendChild(li);

            continue;
        }

        activeList = null;
        activeListType = '';

        // Standalone bold heading
        if (/^\*\*[^*]+\*\*$/.test(line)) {

            const headingElement = document.createElement('h3');

            headingElement.style.fontSize = '16px';
            headingElement.style.margin = '16px 0 8px';

            renderInlineMarkdown(headingElement, line);

            container.appendChild(headingElement);

            continue;
        }

        // Normal paragraphs
        const paragraph = document.createElement('p');

        paragraph.style.margin = '8px 0 12px';
        paragraph.style.color = 'inherit';

        renderInlineMarkdown(paragraph, line);

        container.appendChild(paragraph);
    }
}


// ==========================================
// AUTHENTICATION
// ==========================================

function authForm() {

    generation++;

    $('nav').innerHTML = '';
    $('crumb').textContent = 'Account';
    $('account').innerHTML = '';

    $('page').innerHTML =
        title(
            'Welcome to SmartLivestock AI',
            'Sign in or create an account to manage your livestock records.'
        ) + `

        <div class="card">

            <form id="auth">

                <label>
                    Email

                    <input
                        type="email"
                        id="email"
                        required
                    >
                </label>

                <label>
                    Password

                    <input
                        type="password"
                        id="password"
                        minlength="8"
                        required
                    >
                </label>

                <div class="row">

                    <button
                        class="primary"
                        name="mode"
                        value="login"
                    >
                        Sign in
                    </button>

                    <button
                        class="secondary"
                        name="mode"
                        value="register"
                    >
                        Create account
                    </button>

                </div>

            </form>

            <div id="output"></div>

        </div>
    `;

    $('auth').onsubmit = async ev => {

        ev.preventDefault();

        try {

            user = await api(
                '/auth/' + (ev.submitter?.value || 'login'),
                'POST',
                {
                    email: $('email').value,
                    password: $('password').value
                }
            );

            go(0);

        } catch (err) {

            $('output').innerHTML = error(err);
        }
    };
}


// ==========================================
// MAIN NAVIGATION
// ==========================================

async function go(i) {

    page = i;

    const g = ++generation;

    $('crumb').textContent = modules[i];

    $('account').innerHTML = `
        <span>${e(user.email)}</span>

        <button class="secondary" id="logout">
            Sign out
        </button>
    `;

    $('logout').onclick = async () => {

        try {

            await api('/auth/logout', 'POST');

            user = null;

            authForm();

        } catch (err) {

            alert(err.message);
        }
    };

    $('nav').innerHTML = modules.map((m, j) => `

        <button
            data-page="${j}"
            class="${i === j ? 'active' : ''}"
        >
            <span class="navicon">${icons[j]}</span>

            ${e(m)}

        </button>

    `).join('');

    document.querySelectorAll('[data-page]').forEach(b => {

        b.onclick = () => go(Number(b.dataset.page));
    });

    const p = $('page');

    p.innerHTML = title(modules[i], descriptions[i]);

    try {

        // ==========================================
        // OVERVIEW DASHBOARD
        // ==========================================

        if (i === 0) {

            const d = await api('/dashboard');

            if (g !== generation) return;

            const total = Object.values(d.counts)
                .reduce((a, b) => a + b, 0);

            p.innerHTML = `

                <div class="hero">

                    <div>

                        <small>
                            YOUR DIGITAL HERD WORKSPACE
                        </small>

                        <h1>
                            Better care starts<br>
                            with better insight.
                        </h1>

                        <p>
                            Computer vision, health screening
                            and everyday herd management
                            in one place.
                        </p>

                        <button
                            class="primary"
                            data-open="1"
                        >
                            Start breed analysis →
                        </button>

                    </div>



                </div>

                <div class="stats">

                    ${[
                        ['Saved assessments', total],

                        [
                            'Images analyzed',
                            (d.counts.breed || 0) +
                            (d.counts.skin || 0)
                        ],

                        [
                            'Milk recorded',
                            d.milk.total.toFixed(1) + ' L'
                        ],

                        [
                            'Animals in milk log',
                            d.milk.animals
                        ]

                    ].map(([k, v]) => `

                        <article class="card stat">

                            <small>${k}</small>

                            <strong>${v}</strong>

                        </article>

                    `).join('')}

                </div>

                <h2>Explore your workspace</h2>

                <div class="grid">

                    ${modules.slice(1).map((m, j) => `

                        <article class="card module">

                            <span class="symbol">
                                ${icons[j + 1]}
                            </span>

                            <h3>${m}</h3>

                            <p>${descriptions[j + 1]}</p>

                            <button
                                class="secondary"
                                data-open="${j + 1}"
                            >
                                Open module →
                            </button>

                        </article>

                    `).join('')}

                </div>

                <div class="card">

                    <h2>Recent activity</h2>

                    ${table(
                        ['Date (UTC)', 'Module', 'Result'],
                        d.recent.map(r => [
                            r.date,
                            r.type,
                            r.result
                        ])
                    )}

                </div>

            `;

            p.querySelectorAll('[data-open]').forEach(b => {

                b.onclick = () => go(+b.dataset.open);
            });

            return;
        }


        // ==========================================
        // BREED CLASSIFICATION & SKIN SCREENING
        // ==========================================

        if (i === 1 || i === 2) {

            p.innerHTML += `

                <div class="card">

                    <div class="section-label">
                        01 / IMAGE INPUT
                    </div>

                    <h2>Upload a photograph</h2>

                    <p>
                        ${i === 1
                            ? 'Use a clear full-body side view of one animal.'
                            : 'Use a sharp, well-lit photo of the affected area. Supported screening categories include FMD, LSD, mastitis and healthy-like patterns.'
                        }

                        JPG, PNG or WebP, maximum 9 MB.
                    </p>

                    <div class="upload">

                        <div class="upload-icon">↑</div>

                        <strong>
                            Choose a cattle photograph
                        </strong>

                        <p>or drag it here</p>

                        <input
                            id="file"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                        >

                        <img
                            id="preview"
                            class="preview"
                            alt="Uploaded cattle photograph"
                            hidden
                        >

                    </div>

                    <button
                        class="primary"
                        id="run"
                        disabled
                    >
                        Analyze image
                    </button>

                    <div id="output"></div>

                </div>

            `;

            let data = '';

            const zone = p.querySelector('.upload');

            zone.ondragover = ev => {

                ev.preventDefault();

                zone.classList.add('drag');
            };

            zone.ondragleave = () => {

                zone.classList.remove('drag');
            };

            zone.ondrop = ev => {

                ev.preventDefault();

                zone.classList.remove('drag');

                if (ev.dataTransfer.files.length) {

                    $('file').files = ev.dataTransfer.files;

                    $('file').onchange();
                }
            };

            $('file').onchange = () => {

                data = '';

                $('run').disabled = true;

                $('preview').hidden = true;

                $('output').textContent = '';

                const f = $('file').files[0];

                if (!f) return;

                if (f.size > 9000000) {

                    $('output').textContent =
                        'File exceeds 9 MB.';

                    return;
                }

                if (![
                    'image/jpeg',
                    'image/png',
                    'image/webp'
                ].includes(f.type)) {

                    $('output').textContent =
                        'Please upload a JPG, PNG or WebP image.';

                    return;
                }

                const r = new FileReader();

                r.onload = () => {

                    if (g !== generation) return;

                    data = r.result;

                    $('preview').src = data;

                    $('preview').hidden = false;

                    $('run').disabled = false;
                };

                r.onerror = () => {

                    if (g !== generation) return;

                    $('output').textContent =
                        'Unable to read this image.';
                };

                r.readAsDataURL(f);
            };

            $('run').onclick = async () => {

                const out = $('output');

                const btn = $('run');

                btn.disabled = true;

                btn.textContent = 'Analyzing...';

                out.textContent =
                    'Analyzing the uploaded photograph...';

                try {

                    const r = await api(
                        '/predict/' +
                        (i === 1 ? 'breed' : 'skin'),
                        'POST',
                        {
                            image: data
                        }
                    );

                    if (g !== generation) return;

                    out.innerHTML = `

                        <div class="result-panel">

                            <div class="section-label">
                                02 / ANALYSIS RESULT
                            </div>

                            <div class="row">

                                <span class="pill ${r.uncertain ? 'amber' : ''}">

                                    ${r.uncertain
                                        ? 'Inconclusive · review required'
                                        : 'Leading model match'
                                    }

                                </span>

                                <span class="muted">
                                    ${r.elapsed_ms} ms
                                </span>

                            </div>

                            <h2>
                                ${e(r.results[0].label)}
                            </h2>

                            <p>
                                ${e(r.metric)}
                            </p>

                            ${(r.warnings || []).map(w => `

                                <div class="notice">
                                    ${e(w)}
                                </div>

                            `).join('')}

                            ${r.results.map(x => `

                                <div class="scoreline">

                                    <b>${e(x.label)}</b>

                                    <span>
                                        ${(100 * x.score).toFixed(1)}%
                                    </span>

                                </div>

                                <div class="bar">

                                    <i style="width:${
                                        Math.max(
                                            0,
                                            Math.min(
                                                100,
                                                100 * x.score
                                            )
                                        )
                                    }%"></i>

                                </div>

                            `).join('')}

                            <details>

                                <summary>
                                    Classification details
                                </summary>

                                <p>
                                    ${e(r.model.metric_type)}:

                                    ${(r.model.reported_accuracy * 100).toFixed(1)}%.

                                    Reported by the model developer.
                                    Independent validation is pending.
                                </p>

                                <p>
                                    ${r.supported_labels.map(e).join(' · ')}
                                </p>

                            </details>

                            ${i === 2 ? `

                                <p class="muted"
                                   style="font-size:12px;margin-top:15px;">

                                    Screening results require
                                    veterinary confirmation.

                                </p>

                            ` : ''}

                            <button
                                class="secondary"
                                id="nextassessment"
                            >

                                ${i === 2
                                    ? 'Check observed symptoms →'
                                    : 'Explore disease guide →'
                                }

                            </button>

                        </div>

                    `;

                    $('nextassessment').onclick =
                        () => go(i === 2 ? 3 : 4);

                } catch (err) {

                    if (g === generation) {

                        out.innerHTML = error(err);
                    }

                } finally {

                    btn.disabled = false;

                    btn.textContent = 'Analyze image';
                }
            };

            return;
        }


        // ==========================================
        // HEALTH ASSESSMENT & DISEASE GUIDE
        // ==========================================

        if (i === 3 || i === 4) {

            const ds = await api('/diseases');

            if (g !== generation) return;


            // Disease information guide

            if (i === 4) {

                p.innerHTML += `

                    <label>

                        Search conditions

                        <input
                            type="text"
                            id="searchDisease"
                            placeholder="Search disease or symptom"
                        >

                    </label>

                    <div class="grid" id="diseaseCards">

                        ${ds.map(d => `

                            <article class="card">

                                <h2>${e(d.name)}</h2>

                                <p>${e(d.info)}</p>

                                <b>Common symptoms</b>

                                <p>
                                    ${e(d.sym.join(' · '))}
                                </p>

                                <b>Recommended care</b>

                                <p>${e(d.action)}</p>

                            </article>

                        `).join('')}

                    </div>

                `;

                $('searchDisease').oninput = () => {

                    const q = $('searchDisease')
                        .value
                        .toLowerCase();

                    $('diseaseCards')
                        .querySelectorAll('article')
                        .forEach(c => {

                            c.hidden = !c.textContent
                                .toLowerCase()
                                .includes(q);
                        });
                };

                return;
            }


            // Symptom-based health assessment

            p.innerHTML += `

                <div class="card">

                    <h2>Observed symptoms</h2>

                    <p>
                        Select the symptoms you have
                        observed in your animal.
                    </p>

                    <div class="grid">

                        ${[
                            ...new Set(
                                ds.flatMap(d => d.sym)
                            )
                        ].map(s => `

                            <label class="check">

                                <input
                                    type="checkbox"
                                    value="${e(s)}"
                                >

                                ${e(s)}

                            </label>

                        `).join('')}

                    </div>

                    <p id="selectedCount">

                        0 symptoms selected

                    </p>

                    <button
                        class="primary"
                        id="assess"
                    >
                        Assess symptoms
                    </button>

                    <div id="output"></div>

                </div>

            `;

            p.querySelectorAll(
                'input[type=checkbox]'
            ).forEach(c => {

                c.onchange = () => {

                    $('selectedCount').textContent =
                        p.querySelectorAll(
                            'input:checked'
                        ).length + ' symptoms selected';
                };
            });

            $('assess').onclick = async () => {

                const out = $('output');

                const btn = $('assess');

                const symptoms = [
                    ...p.querySelectorAll('input:checked')
                ].map(x => x.value);

                if (!symptoms.length) {

                    out.innerHTML = `
                        <p>Please select at least one symptom.</p>
                    `;

                    return;
                }

                btn.disabled = true;

                btn.textContent = 'Assessing...';

                try {

                    const r = await api(
                        '/assess',
                        'POST',
                        {
                            symptoms
                        }
                    );

                    if (g !== generation) return;

                    out.innerHTML = `

                        <h2>
                            Possible condition matches
                        </h2>

                        <p>
                            Results are based on
                            matching observed symptoms.
                        </p>

                        ${r.map(d => `

                            <div class="card">

                                <h3>${e(d.name)}</h3>

                                <p>
                                    ${d.matched} of
                                    ${d.sym.length}
                                    signs matched.
                                </p>

                                <p>${e(d.action)}</p>

                            </div>

                        `).join('')}

                        <p class="muted"
                           style="font-size:12px;">

                            Consult a veterinarian to confirm
                            the animal's condition.

                        </p>

                    `;

                } catch (err) {

                    if (g === generation) {

                        out.innerHTML = error(err);
                    }

                } finally {

                    btn.disabled = false;

                    btn.textContent = 'Assess symptoms';
                }
            };

            return;
        }


        // ==========================================
        // AI CARE ASSISTANT
        // ==========================================

        if (i === 5) {

            const conversation = [];

            p.innerHTML += `

                <div class="card">

                    <div id="chat" class="chat">

                        <div class="bubble">

                            <strong>
                                Welcome to SmartLivestock AI AI Care Assistant!
                            </strong>

                            <p style="margin:10px 0;">

                                I'm here to help you with
                                cattle health, nutrition,
                                disease prevention and
                                livestock management.

                            </p>

                            <p>

                                Ask your questions in
                                English, Hindi or Marathi.

                            </p>

                        </div>

                    </div>

                    <div class="row prompts">

                        ${[
                            'How can I improve feeding?',
                            'How do I prevent disease?',
                            'Why has milk yield decreased?',
                            'How can I improve cattle health?'

                        ].map(q => `

                            <button
                                class="secondary"
                                data-question="${q}"
                            >
                                ${q}
                            </button>

                        `).join('')}

                    </div>

                    <form
                        id="questionForm"
                        class="row"
                    >

                        <input
                            id="question"
                            type="text"
                            required
                            maxlength="1000"
                            placeholder="Ask your AI care assistant..."
                            autocomplete="off"
                        >

                        <button
                            class="primary"
                            id="sendQuestion"
                        >
                            Send
                        </button>

                    </form>

                </div>

            `;

            const chat = $('chat');

            const input = $('question');

            const sendButton = $('sendQuestion');

            let processing = false;

            const prompts = [
                ...p.querySelectorAll('[data-question]')
            ];

            prompts.forEach(b => {

                b.onclick = () => {

                    if (!processing) {

                        input.value = b.dataset.question;

                        input.focus();
                    }
                };
            });

            const add = (
                text,
                mine = false,
                formatted = false
            ) => {

                const bubble =
                    document.createElement('div');

                bubble.className =
                    'bubble' + (mine ? ' mine' : '');

                if (formatted) {

                    renderAssistantMarkdown(bubble, text);

                } else {

                    bubble.textContent = text;

                    bubble.style.whiteSpace = 'pre-wrap';
                }

                chat.appendChild(bubble);

                chat.scrollTop = chat.scrollHeight;

                return bubble;
            };

            $('questionForm').onsubmit = async ev => {

                ev.preventDefault();

                const q = input.value.trim();

                if (!q || processing) return;

                processing = true;

                input.value = '';

                input.disabled = true;

                sendButton.disabled = true;

                prompts.forEach(b => {

                    b.disabled = true;
                });

                sendButton.textContent = 'Processing...';

                add(q, true);

                const loading = add(
                    'Analyzing your question...'
                );

                loading.style.opacity = '0.7';

                try {

                    const r = await api(
                        '/chat',
                        'POST',
                        {
                            question: q,
                            history: conversation.slice(-12)
                        }
                    );

                    if (
                        typeof r.answer !== 'string' ||
                        !r.answer.trim()
                    ) {

                        throw new Error(
                            'Empty assistant response'
                        );
                    }

                    const answer =
                        cleanAssistantResponse(r.answer);

                    if (!answer) {

                        throw new Error(
                            'Empty assistant response'
                        );
                    }

                    conversation.push(
                        {
                            role: 'user',
                            text: q
                        },
                        {
                            role: 'model',
                            text: answer.slice(0, 4000)
                        }
                    );

                    loading.remove();

                    if (g === generation) {

                        // Display only the formatted answer.
                        // Provider and model metadata are omitted.

                        add(answer, false, true);
                    }

                } catch (err) {

                    loading.remove();

                    console.error(
                        'AI assistant request failed:',
                        err
                    );

                    if (g === generation) {

                        add(
                            'The AI Care Assistant is temporarily unavailable. Please try again in a moment.'
                        );

                        input.value = q;
                    }

                } finally {

                    processing = false;

                    input.disabled = false;

                    sendButton.disabled = false;

                    prompts.forEach(b => {

                        b.disabled = false;
                    });

                    sendButton.textContent = 'Send';

                    if (g === generation) {

                        input.focus();
                    }
                }
            };

            return;
        }


        // ==========================================
        // MILK PRODUCTIVITY
        // ==========================================

        if (i === 6) {

            p.innerHTML += `

                <div class="card">

                    <h2>Record milk productivity</h2>

                    <form id="milkForm">

                        <label>

                            Animal name or ID

                            <input
                                id="animal"
                                type="text"
                                required
                                maxlength="100"
                            >

                        </label>

                        <label>

                            Milk yield (litres)

                            <input
                                id="litres"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                required
                            >

                        </label>

                        <button class="primary">

                            Save milk record

                        </button>

                    </form>

                    <div id="output"></div>

                    <div id="records"></div>

                </div>

            `;

            const refresh = async () => {

                const rows = await api('/milk');

                if (g !== generation) return;

                const total = rows.reduce(
                    (a, r) => a + r.litres,
                    0
                );

                $('records').innerHTML = `

                    <h3>

                        ${rows.length} milk records ·
                        ${total.toFixed(1)} L total

                    </h3>

                    <div class="milkchart">

                        ${rows.slice(0, 10)
                            .reverse()
                            .map(r => `

                            <div>

                                <span>${e(r.animal)}</span>

                                <i style="width:${
                                    Math.max(
                                        0,
                                        Math.min(
                                            100,
                                            r.litres /
                                            Math.max(
                                                1,
                                                ...rows.map(
                                                    x => x.litres
                                                )
                                            ) * 100
                                        )
                                    )
                                }%"></i>

                                <b>${r.litres} L</b>

                            </div>

                        `).join('')}

                    </div>

                    ${table(
                        ['Date (UTC)', 'Animal', 'Litres'],
                        rows.map(r => [
                            r.date,
                            r.animal,
                            r.litres
                        ])
                    )}

                `;
            };

            $('milkForm').onsubmit = async ev => {

                ev.preventDefault();

                try {

                    await api(
                        '/milk',
                        'POST',
                        {
                            animal: $('animal').value,
                            litres: Number($('litres').value)
                        }
                    );

                    if (g !== generation) return;

                    $('litres').value = '';

                    $('output').innerHTML = `

                        <p style="color:#236344;">

                            Milk record saved successfully.

                        </p>

                    `;

                    await refresh();

                } catch (err) {

                    if (g === generation) {

                        $('output').innerHTML = error(err);
                    }
                }
            };

            await refresh();

            return;
        }


        // ==========================================
        // MODEL LAB
        // ==========================================

        if (i === 8) {

            const models = await api('/models');

            if (g !== generation) return;

            p.innerHTML += `

                <div class="grid">

                    ${Object.entries(models).map(([k, m]) => `

                        <article class="card">

                            <span class="section-label">

                                ${e(k)} model

                            </span>

                            <h2>${e(m.architecture)}</h2>

                            <div class="big-number">

                                ${(m.reported_accuracy * 100).toFixed(1)}%

                            </div>

                            <p>${e(m.metric_type)}</p>

                            <p>
                                ${m.classes} supported classes
                            </p>

                            <a
                                href="${e(m.source)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Source documentation ↗
                            </a>

                        </article>

                    `).join('')}

                </div>

                <div class="card">

                    <h2>Independent validation</h2>

                    <p>

                        Independent model performance
                        has not yet been measured in
                        this application.

                        The included evaluation script
                        can be used with independently
                        labelled cattle images.

                    </p>

                    <code>
                        python -m scripts.evaluate breed path/to/test_images
                    </code>

                </div>

            `;

            return;
        }


        // ==========================================
        // ASSESSMENT HISTORY
        // ==========================================

        const rows = await api('/history');

        if (g !== generation) return;

        p.innerHTML += `

            <div class="card">

                <div class="row">

                    <button
                        class="secondary"
                        id="export"
                    >
                        Export CSV
                    </button>

                    <button
                        class="secondary"
                        id="clear"
                    >
                        Clear assessment history
                    </button>

                </div>

                ${table(
                    ['Date (UTC)', 'Module', 'Result'],
                    rows.map(r => [
                        r.date,
                        r.type,
                        r.result
                    ])
                )}

            </div>

        `;

        $('export').onclick = () => {

            const csv = [

                ['Date', 'Module', 'Result'],

                ...rows.map(r => [
                    r.date,
                    r.type,
                    r.result
                ])

            ].map(row =>

                row.map(v => {

                    let value = String(v);

                    if (/^[=+\-@\t\r]/.test(value)) {
                        value = "'" + value;
                    }

                    return '"' +
                        value.replaceAll('"', '""') +
                        '"';

                }).join(',')

            ).join('\n');

            const a = document.createElement('a');

            a.href = URL.createObjectURL(
                new Blob(
                    [csv],
                    {
                        type: 'text/csv;charset=utf-8'
                    }
                )
            );

            a.download = 'cattlesense-history.csv';

            a.click();

            setTimeout(
                () => URL.revokeObjectURL(a.href),
                1000
            );
        };

        $('clear').onclick = async () => {

            if (
                confirm('Delete your assessment history?')
            ) {

                try {

                    await api('/history', 'DELETE');

                    go(7);

                } catch (err) {

                    alert(err.message);
                }
            }
        };

    } catch (err) {

        if (g === generation) {

            p.innerHTML += error(err);
        }
    }
}


// ==========================================
// REUSABLE TABLE COMPONENT
// ==========================================

function table(headers, rows) {

    return `

        <div class="table-scroll">

            <table>

                <thead>

                    <tr>

                        ${headers.map(h => `

                            <th>${e(h)}</th>

                        `).join('')}

                    </tr>

                </thead>

                <tbody>

                    ${rows.map(r => `

                        <tr>

                            ${r.map(v => `

                                <td>${e(v)}</td>

                            `).join('')}

                        </tr>

                    `).join('') || `

                        <tr>

                            <td colspan="${headers.length}">

                                No records yet.

                            </td>

                        </tr>

                    `}

                </tbody>

            </table>

        </div>

    `;
}


// ==========================================
// REMOVE OLD GLOBAL FOOTER
// ==========================================

document.querySelectorAll('footer').forEach(footer => {

    if (
        /educational prototype|not a substitute for veterinary examination/i
            .test(footer.textContent)
    ) {

        footer.remove();
    }
});

const sidefoot = document.querySelector('.sidefoot');

if (sidefoot) {

    sidefoot.innerHTML = `

        SMART LIVESTOCK MANAGEMENT

        <br>

        AI-Powered Cattle Care

    `;
}


// ==========================================
// INITIALIZE APPLICATION
// ==========================================

try {

    user = await api('/auth/me');

    go(0);

} catch {

    authForm();
}

