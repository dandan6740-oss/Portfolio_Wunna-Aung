try {
    const stored = localStorage.getItem('au_multimedia_portfolio');
    if (stored && stored.length > 3000000) {
        localStorage.removeItem('au_multimedia_portfolio');
    }
} catch(e) {}

let projects = JSON.parse(localStorage.getItem('au_multimedia_portfolio')) || initialProjects;
let isAdmin = false;
let currentProject = null;
let currentMediaIndex = 0;

// Elements
const grid = document.getElementById('portfolioGrid');
const adminToggle = document.getElementById('adminToggle');
const editorPanel = document.getElementById('editorPanel');
const projectForm = document.getElementById('projectForm');
const lightbox = document.getElementById('lightbox');

function formatDoc(cmd, value = null) {
    document.execCommand(cmd, false, value);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function renderProjects(filter = 'all') {
    grid.innerHTML = '';
    
    projects.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const filtered = filter === 'all' 
        ? projects 
        : projects.filter(p => p.tags && p.tags.some(t => t.toLowerCase() === filter.toLowerCase()));

    filtered.forEach(p => {
        const tagsHTML = p.tags ? p.tags.map(t => `<span class="card-tag">${t}</span>`).join('') : '';
        const mainImage = p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/800x600';
        const totalMedia = (p.images ? p.images.length : 0) + (p.video ? 1 : 0);
        const displayDate = p.date ? formatDate(p.date) : '';

        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="card-img-wrapper" onclick="openLightbox('${p.id}')">
                <img src="${mainImage}" alt="${p.title}">
                ${displayDate ? `<div class="date-badge">${displayDate}</div>` : ''}
                <div class="media-count-badge">${totalMedia} Media</div>
                <div class="card-img-overlay">
                    <span class="view-badge">View Gallery</span>
                </div>
            </div>
            <div class="card-content">
                <div class="tags-container">${tagsHTML}</div>
                <h3 class="card-title">${p.title}</h3>
                <div class="card-desc">${p.desc}</div>
                <div class="admin-actions">
                    <button class="edit-btn" onclick="editProject('${p.id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteProject('${p.id}')">Delete</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

adminToggle.addEventListener('click', () => {
    isAdmin = !isAdmin;
    document.body.classList.toggle('admin-mode', isAdmin);
    editorPanel.classList.toggle('open', isAdmin);
    adminToggle.classList.toggle('active', isAdmin);
    adminToggle.innerText = isAdmin ? 'Exit Editor' : 'Editor Mode';
});

projectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const editId = document.getElementById('editProjectId').value;
    const title = document.getElementById('pTitle').value;
    const date = document.getElementById('pDate').value;
    const desc = document.getElementById('pDesc').innerHTML;
    const video = document.getElementById('pVideo').value.trim();
    const imageUrlsInput = document.getElementById('pImages').value.trim();

    const selectedTags = Array.from(document.querySelectorAll('input[name="pTags"]:checked'))
        .map(cb => cb.value);

    if (selectedTags.length === 0) {
        alert('Please select at least one category tag.');
        return;
    }

    let images = [];
    if (imageUrlsInput) {
        images = imageUrlsInput.split(',').map(url => url.trim()).filter(url => url !== '');
    } else if (editId) {
        const existing = projects.find(p => p.id === editId);
        if (existing) images = existing.images;
    }

    if (editId) {
        const index = projects.findIndex(p => p.id === editId);
        if (index !== -1) {
            projects[index] = { id: editId, title, date, tags: selectedTags, desc, images, video };
        }
    } else {
        const newProject = {
            id: Date.now().toString(),
            title,
            date,
            tags: selectedTags,
            desc,
            images,
            video
        };
        projects.push(newProject);
    }

    localStorage.setItem('au_multimedia_portfolio', JSON.stringify(projects));
    renderProjects();
    resetForm();
});

function editProject(id) {
    const item = projects.find(p => p.id === id);
    if (!item) return;

    document.getElementById('editProjectId').value = item.id;
    document.getElementById('pTitle').value = item.title;
    document.getElementById('pDate').value = item.date || '';
    document.getElementById('pDesc').innerHTML = item.desc;
    document.getElementById('pVideo').value = item.video || '';
    document.getElementById('pImages').value = item.images ? item.images.join(', ') : '';

    document.querySelectorAll('input[name="pTags"]').forEach(cb => {
        cb.checked = item.tags ? item.tags.includes(cb.value) : false;
    });

    document.getElementById('formHeader').innerText = 'Edit Published Project';
    document.getElementById('submitBtn').innerText = 'Save Changes';
    document.getElementById('cancelBtn').style.display = 'inline-block';

    window.scrollTo({ top: editorPanel.offsetTop - 20, behavior: 'smooth' });
}

document.getElementById('cancelBtn').addEventListener('click', resetForm);

function resetForm() {
    projectForm.reset();
    document.getElementById('pDesc').innerHTML = '';
    document.getElementById('editProjectId').value = '';
    document.getElementById('formHeader').innerText = 'Add New Project or Event';
    document.getElementById('submitBtn').innerText = 'Publish to Portfolio';
    document.getElementById('cancelBtn').style.display = 'none';
}

function deleteProject(id) {
    if (confirm("Are you sure you want to delete this project?")) {
        projects = projects.filter(p => p.id !== id);
        localStorage.setItem('au_multimedia_portfolio', JSON.stringify(projects));
        renderProjects();
    }
}

document.getElementById('exportBtn').addEventListener('click', () => {
    const jsonString = JSON.stringify(projects, null, 4);
    navigator.clipboard.writeText(jsonString).then(() => {
        alert("Data copied to clipboard! You can paste this JSON array into projects.js to commit your changes permanently to GitHub.");
    });
});

function openLightbox(id) {
    currentProject = projects.find(p => p.id === id);
    if (!currentProject) return;

    currentMediaIndex = 0;
    document.getElementById('lbTitle').innerText = currentProject.title;
    document.getElementById('lbTags').innerHTML = currentProject.tags ? currentProject.tags.map(t => `<span class="card-tag">${t}</span>`).join('') : '';
    document.getElementById('lbDesc').innerHTML = currentProject.desc;

    updateMediaViewer();
    lightbox.classList.add('active');
    document.body.classList.add('modal-open');
}

function updateMediaViewer() {
    const container = document.getElementById('mediaContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    container.innerHTML = '';

    const allMedia = [...(currentProject.images || [])];
    if (currentProject.video) allMedia.push({ type: 'video', url: currentProject.video });

    if (allMedia.length === 0) return;

    if (allMedia.length <= 1) {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    }

    const item = allMedia[currentMediaIndex];

    if (typeof item === 'object' && item.type === 'video') {
        if (item.url.includes('youtube') || item.url.includes('embed')) {
            container.innerHTML = `<iframe src="${item.url}" class="lightbox-video" frameborder="0" allowfullscreen style="width:100%; height:100%;"></iframe>`;
        } else {
            container.innerHTML = `<video src="${item.url}" controls autoplay class="lightbox-video"></video>`;
        }
    } else {
        container.innerHTML = `<img src="${item}" class="lightbox-img" alt="Gallery Media">`;
    }
}

document.getElementById('prevBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const total = (currentProject.images ? currentProject.images.length : 0) + (currentProject.video ? 1 : 0);
    currentMediaIndex = (currentMediaIndex - 1 + total) % total;
    updateMediaViewer();
});

document.getElementById('nextBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const total = (currentProject.images ? currentProject.images.length : 0) + (currentProject.video ? 1 : 0);
    currentMediaIndex = (currentMediaIndex + 1) % total;
    updateMediaViewer();
});

function closeLightboxModal() {
    lightbox.classList.remove('active');
    document.body.classList.remove('modal-open');
}

document.getElementById('closeLightbox').addEventListener('click', closeLightboxModal);
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightboxModal();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderProjects(e.target.dataset.filter);
    });
});

renderProjects();
