/**
 * MEDCONNECT SPA - APPLICATION LOGIC
 */

const MC_APP = {
    token: localStorage.getItem('mc_token'),
    user: JSON.parse(localStorage.getItem('mc_user') || '{}'),
    posts: [],
    
    init() {
        if (!this.token) {
            window.location.href = '/';
            return;
        }

        this.setupEventListeners();
        this.updateUserInfo();
        this.loadFeed();
        this.fetchNotifications();
        
        // Polling for notifications
        setInterval(() => this.fetchNotifications(), 30000);
    },

    setupEventListeners() {
        // Bottom Nav navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const viewId = btn.dataset.view;
                this.showView(viewId);
                
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Open/Close Create Post Modal
        document.getElementById('open-post-modal').addEventListener('click', () => {
            document.getElementById('post-modal').classList.remove('hidden');
        });

        document.getElementById('close-post-modal').addEventListener('click', () => {
            document.getElementById('post-modal').classList.add('hidden');
        });

        // Handle Create Post
        document.getElementById('create-post-form').addEventListener('submit', (e) => this.handleCreatePost(e));

        // Close Comment Modal
        document.getElementById('close-comment-modal').addEventListener('click', () => {
            document.getElementById('comment-modal').classList.add('hidden');
        });

        // Add Comment
        document.getElementById('add-comment-form').addEventListener('submit', (e) => this.handleAddComment(e));

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('mc_token');
            localStorage.removeItem('mc_user');
            window.location.href = '/';
        });

        // Search Tabs
        document.querySelectorAll('#search-view .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#search-view .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.handleSearch(); 
            });
        });

        // Search trigger
        document.getElementById('search-submit-btn').addEventListener('click', () => this.handleSearch());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Profile Tabs
        document.querySelectorAll('#profile-view .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#profile-view .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.loadProfileContent();
            });
        });
    },

    updateUserInfo() {
        const initials = this.user.name ? this.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
        document.getElementById('user-avatar-initials').innerText = initials;
        document.getElementById('user-name-display').innerText = this.user.name;
        document.getElementById('user-specialty-display').innerText = this.user.specialty;
        
        document.getElementById('profile-avatar-lg').innerText = initials;
        document.getElementById('profile-name').innerText = this.user.name;
        document.getElementById('profile-spec').innerText = this.user.specialty;
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
            v.classList.add('hidden');
        });
        const target = document.getElementById(viewId);
        target.classList.remove('hidden');
        target.classList.add('active');

        if (viewId === 'profile-view') {
            this.loadProfileContent();
        }
    },

    async loadFeed() {
        const listContainer = document.getElementById('posts-list');
        const loading = document.getElementById('feed-loading');
        
        try {
            const res = await fetch('/api/medconnect/posts');
            const posts = await res.json();
            this.posts = posts;
            
            loading.classList.add('hidden');
            this.renderPosts(posts, listContainer);

            // Load suggested posts for cardiology/specialty
            this.loadSuggested();
        } catch (err) {
            console.error('Feed load error:', err);
        }
    },

    async loadSuggested() {
        const suggestedContainer = document.getElementById('suggested-list');
        try {
            const res = await fetch(`/api/medconnect/suggested/${this.user.id}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const posts = await res.json();
            
            if (posts.length === 0) {
                document.getElementById('suggested-posts').classList.add('hidden');
                return;
            }

            suggestedContainer.innerHTML = posts.map(p => `
                <div class="suggested-card" onclick="MC_APP.showPostDetails('${p._id}')">
                    <h4>${p.authorName}</h4>
                    <p>${p.text}</p>
                </div>
            `).join('');
        } catch (err) {
            console.error('Suggested error:', err);
        }
    },

    renderPosts(posts, container, type = 'normal') {
        if (!posts || posts.length === 0) {
            if (type === 'normal') {
                container.innerHTML = '<div class="placeholder-text">The nexus is quiet. Share some knowledge!</div>';
            }
            return;
        }

        const html = posts.map(p => {
            const initials = p.authorName ? p.authorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
            const hasAgreed = p.agrees.includes(this.user.id);
            const hasDisagreed = p.disagrees.includes(this.user.id);

            return `
                <div class="post-card glass-panel" id="post-${p._id}">
                    ${type === 'related' ? '<div class="match-badge">Related Data (Partial Match)</div>' : ''}
                    <div class="post-author">
                        <div class="avatar-circle" style="width:40px; height:40px; font-size:12px;">${initials}</div>
                        <div class="author-info">
                            <h4>${p.authorName}</h4>
                            <p>${p.authorSpecialty} • ${new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <div class="post-medical-data">
                        ${p.symptoms ? `<div class="med-item symptoms"><strong>Symptoms:</strong> ${p.symptoms}</div>` : ''}
                        <div class="vitals-row">
                            ${p.age ? `<span class="vital-badge">Age: ${p.age}</span>` : ''}
                            ${p.gender ? `<span class="vital-badge">Gender: ${p.gender}</span>` : ''}
                            ${p.bp ? `<span class="vital-badge">BP: ${p.bp}</span>` : ''}
                            ${p.sugar ? `<span class="vital-badge">Sugar: ${p.sugar}</span>` : ''}
                            ${p.heartRate ? `<span class="vital-badge">HR: ${p.heartRate}</span>` : ''}
                        </div>
                    </div>

                    <div class="post-text">${p.text}</div>
                    
                    <div class="post-attachments">
                        ${p.imageUrl ? `<img src="/uploads/${p.imageUrl}" class="post-image" alt="Post data">` : ''}
                        ${(p.labTestFindingImages || []).map(img => `<img src="/uploads/${img}" class="post-image-small" title="Lab Test">`).join('')}
                        ${(p.scanningReportsImages || []).map(img => `<img src="/uploads/${img}" class="post-image-small" title="Scanning Report">`).join('')}
                        ${(p.clinicalNotesImages || []).map(img => `<img src="/uploads/${img}" class="post-image-small" title="Clinical Notes">`).join('')}
                    </div>

                    <div class="post-tags">
                        ${p.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
                    </div>
                    <div class="post-actions">
                        <button class="action-btn ${hasAgreed ? 'active-agree' : ''}" onclick="MC_APP.togglePostReaction('${p._id}', 'agree')">
                            <span>👍</span> <span class="count">${p.agrees.length}</span> Agree
                        </button>
                        <button class="action-btn ${hasDisagreed ? 'active-disagree' : ''}" onclick="MC_APP.togglePostReaction('${p._id}', 'disagree')">
                            <span>👎</span> <span class="count">${p.disagrees.length}</span> Disagree
                        </button>
                        <button class="action-btn" onclick="MC_APP.openComments('${p._id}')">
                            <span>💬</span> <span>${p.comments.length}</span> Perspective
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (type === 'related') {
            container.innerHTML += html;
        } else {
            container.innerHTML = html;
        }
    },

    async handleCreatePost(e) {
        e.preventDefault();
        const text = document.getElementById('post-text').value;
        const tags = document.getElementById('post-tags').value;
        const symptoms = document.getElementById('post-symptoms').value;
        const duration = document.getElementById('post-duration').value;
        const age = document.getElementById('post-age').value;
        const gender = document.getElementById('post-gender').value;
        const bp = document.getElementById('post-bp').value;
        const sugar = document.getElementById('post-sugar').value;
        const hr = document.getElementById('post-hr').value;
        
        const imageFile = document.getElementById('post-image').files[0];
        const labFile = document.getElementById('post-lab-tests').files[0];
        const scanFile = document.getElementById('post-scanning').files[0];
        const clinicalFile = document.getElementById('post-clinical').files[0];
        
        const formData = new FormData();
        formData.append('text', text);
        formData.append('tags', tags);
        formData.append('symptoms', symptoms);
        formData.append('duration', duration);
        formData.append('age', age);
        formData.append('gender', gender);
        formData.append('bp', bp);
        formData.append('sugar', sugar);
        formData.append('heartRate', hr);

        if (imageFile) formData.append('image', imageFile);
        if (labFile) formData.append('labTests', labFile);
        if (scanFile) formData.append('scanningReports', scanFile);
        if (clinicalFile) formData.append('clinicalNotes', clinicalFile);

        try {
            document.getElementById('post-submit-btn').innerText = 'LINKING...';
            const res = await fetch('/api/medconnect/posts', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` },
                body: formData
            });

            if (res.ok) {
                document.getElementById('post-modal').classList.add('hidden');
                document.getElementById('create-post-form').reset();
                this.loadFeed();
            } else {
                alert('Connection failure. Post not sent.');
            }
        } catch (err) {
            console.error('Post error:', err);
        } finally {
            document.getElementById('post-submit-btn').innerText = 'POST TO NEXUS';
        }
    },

    async togglePostReaction(postId, type) {
        try {
            const res = await fetch(`/api/medconnect/posts/${postId}/${type}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            
            // Refresh post UI
            const postEl = document.getElementById(`post-${postId}`);
            if (postEl) {
                const agreeBtn = postEl.querySelector('.action-btn:nth-child(1)');
                const disagreeBtn = postEl.querySelector('.action-btn:nth-child(2)');
                
                agreeBtn.querySelector('.count').innerText = data.agrees;
                disagreeBtn.querySelector('.count').innerText = data.disagrees;
                
                agreeBtn.classList.toggle('active-agree', data.userAgreed);
                disagreeBtn.classList.toggle('active-disagree', data.userDisagreed);
            }
        } catch (err) {
            console.error('Reaction error:', err);
        }
    },

    async openComments(postId) {
        document.getElementById('comment-post-id').value = postId;
        const list = document.getElementById('comments-list');
        list.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';
        document.getElementById('comment-modal').classList.remove('hidden');

        try {
            // Re-fetch post to get latest comments
            const post = this.posts.find(p => p._id === postId);
            if (post) {
                this.renderComments(post.comments);
            }
        } catch (e) {}
    },

    renderComments(comments) {
        const list = document.getElementById('comments-list');
        if (comments.length === 0) {
            list.innerHTML = '<div class="placeholder-text" style="font-size:12px; margin-top:10px;">No medical perspectives shared yet.</div>';
            return;
        }
        
        list.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-author">${c.authorName} (${c.authorSpecialty})</div>
                <div class="comment-text">${c.text}</div>
            </div>
        `).join('');
    },

    async handleAddComment(e) {
        e.preventDefault();
        const postId = document.getElementById('comment-post-id').value;
        const text = document.getElementById('comment-text').value;

        try {
            const res = await fetch(`/api/medconnect/posts/${postId}/comment`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (res.ok) {
                const updatedPost = await res.json();
                this.renderComments(updatedPost.comments);
                document.getElementById('comment-text').value = '';
                
                // Update count in feed
                const postEl = document.getElementById(`post-${postId}`);
                if (postEl) {
                    postEl.querySelector('.action-btn:nth-child(3) span:nth-child(2)').innerText = updatedPost.comments.length;
                }
                
                // Update local model
                const idx = this.posts.findIndex(p => p._id === postId);
                if (idx !== -1) this.posts[idx] = updatedPost;
            }
        } catch (err) {
            console.error('Comment error:', err);
        }
    },

    async handleSearch() {
        const resultsContainer = document.getElementById('search-results');
        const activeTab = document.querySelector('#search-view .tab-btn.active').dataset.tab;

        // Collect all metrics
        const params = new URLSearchParams();
        const q = document.getElementById('search-input').value.trim();
        const symptoms = document.getElementById('search-symptoms').value.trim();
        const age = document.getElementById('search-age').value.trim();
        const gender = document.getElementById('search-gender').value;
        const bp = document.getElementById('search-bp').value.trim();
        const sugar = document.getElementById('search-sugar').value.trim();
        const hr = document.getElementById('search-hr').value.trim();
        const duration = document.getElementById('search-duration').value.trim();

        if (q) params.append('q', q);
        if (symptoms) params.append('symptoms', symptoms);
        if (age) params.append('age', age);
        if (gender) params.append('gender', gender);
        if (bp) params.append('bp', bp);
        if (sugar) params.append('sugar', sugar);
        if (hr) params.append('heartRate', hr);
        if (duration) params.append('duration', duration);

        if (params.toString() === '') {
            resultsContainer.innerHTML = '<div class="placeholder-text">Enter search criteria to query the nexus.</div>';
            return;
        }

        resultsContainer.innerHTML = '<div class="spinner"></div>';

        try {
            const res = await fetch(`/api/medconnect/search?${params.toString()}`);
            const data = await res.json();

            if (data.message === "No data available") {
                resultsContainer.innerHTML = `<div class="placeholder-text">${data.message}</div>`;
                return;
            }

            if (activeTab === 'posts') {
                resultsContainer.innerHTML = '';
                this.renderPosts(data.posts, resultsContainer, 'normal');
                if (data.relatedPosts && data.relatedPosts.length > 0) {
                    this.renderPosts(data.relatedPosts, resultsContainer, 'related');
                }
            } else {
                if (data.doctors.length === 0) {
                    resultsContainer.innerHTML = '<div class="placeholder-text">No doctors matching criteria found.</div>';
                    return;
                }
                resultsContainer.innerHTML = data.doctors.map(d => {
                    const initials = d.name ? d.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
                    return `
                        <div class="doctor-result-card glass-panel">
                            <div class="avatar-circle">${initials}</div>
                            <div class="author-info">
                                <h4>${d.name}</h4>
                                <p>${d.specialty}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (err) {
            console.error('Search error:', err);
        }
    },

    async loadProfileContent() {
        const container = document.getElementById('profile-content');
        const activeTab = document.querySelector('#profile-view .tab-btn.active').dataset.tab;

        container.innerHTML = '<div class="spinner"></div>';

        try {
            const res = await fetch(`/api/medconnect/profile/${this.user.id}`);
            const data = await res.json();

            if (activeTab === 'my-posts') {
                this.renderPosts(data.posts, container);
            } else {
                if (data.user.notifications.length === 0) {
                    container.innerHTML = '<div class="placeholder-text" style="margin-top:20px;">No new alerts at this time.</div>';
                    return;
                }
                // Sort by newest
                const sortedNotifs = [...data.user.notifications].reverse();
                container.innerHTML = sortedNotifs.map(n => {
                    let text = '';
                    if (n.type === 'agree') text = `<strong>${n.fromDoctorName}</strong> agreed with your post: "${n.postTextSnippet}..."`;
                    else if (n.type === 'disagree') text = `<strong>${n.fromDoctorName}</strong> disagreed with your post: "${n.postTextSnippet}..."`;
                    else if (n.type === 'comment') text = `<strong>${n.fromDoctorName}</strong> shared a perspective on your post: "${n.postTextSnippet}..."`;

                    return `
                        <div class="notification-item ${n.read ? 'read' : ''}">
                            <div class="notif-text">${text}</div>
                            <div class="notif-sub">${new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                    `;
                }).join('');
                
                // Reset badge on read
                document.getElementById('notif-badge').classList.add('hidden');
                document.getElementById('notif-badge').innerText = '0';
            }
        } catch (err) {
            console.error('Profile load error:', err);
        }
    },

    async fetchNotifications() {
        try {
            const res = await fetch('/api/medconnect/notifications', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            
            const badge = document.getElementById('notif-badge');
            if (data.unread > 0) {
                badge.innerText = data.unread;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        } catch (e) {}
    },

    showPostDetails(postId) {
        // Simple view switch for horizontal scroll items
        document.querySelector('.nav-item[data-view="feed-view"]').click();
        const el = document.getElementById(`post-${postId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
};

window.onload = () => MC_APP.init();
