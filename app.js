// ======================================================================
// 0. CONFIGURAÇÃO DE SERVIÇOS E CREDENCIAIS
// ======================================================================

// --- 🔥 FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBI_4n8aBT9ZPiLy8cwgiQDtD0_CYSKk4E",
    authDomain: "videot-2fcec.firebaseapp.com",
    projectId: "videot-2fcec",
    storageBucket: "videot-2fcec.firebasestorage.app",
    messagingSenderId: "583396995831",
    appId: "1:583396995831:web:6182575e28ea628cc259f2"
};

// --- ☁️ CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = 'dya1jd0mx'; 
const CLOUDINARY_UPLOAD_PRESET = 'videot_unsigned_preset'; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider(); // Novo provider para Google!

// Elementos DOM
const feedContainer = document.querySelector('.feed-container');
const feedView = document.getElementById('feed-view');
const profileView = document.getElementById('profile-view');
const inboxView = document.getElementById('inbox-view');
const loginModal = document.getElementById('login-modal');
const uploadModal = document.getElementById('upload-modal');
const uploadStatus = document.getElementById('upload-status');
const openUploadModalBtn = document.getElementById('open-upload-modal');
const closeUploadModalBtn = document.getElementById('close-upload-modal');
const videoFileInput = document.getElementById('video-file-input');
const videoDescriptionInput = document.getElementById('video-description-input');
const uploadVideoBtn = document.getElementById('upload-video-btn');
const navFeed = document.getElementById('nav-feed');
const navProfile = document.getElementById('nav-profile');
const navInbox = document.getElementById('nav-inbox');
const userVideosGrid = document.getElementById('user-videos-grid');
const authStatus = document.getElementById('auth-status');
const filterForYou = document.getElementById('filter-foryou');
const filterFollowing = document.getElementById('filter-following');
const loginGoogleBtn = document.getElementById('login-google-btn'); // Novo botão!

let CURRENT_USER_DATA = null;
let currentVideoPlayer = null; 
let unsubscribeFeed = () => {}; 
let currentFeedFilter = 'for-you'; 


// ======================================================================
// 1. AUTENTICAÇÃO E PERFIL (COM LOGIN GOOGLE)
// ======================================================================

const saveOrUpdateUser = async (user) => {
    // Tenta usar o display name ou o nome do email como username
    const username = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];

    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (!doc.exists) {
        await userRef.set({
            email: user.email,
            username: username,
            profilePic: user.photoURL || `https://i.pravatar.cc/150?img=${user.uid.slice(-1)}`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
};

const handleGoogleLogin = async () => {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        await saveOrUpdateUser(result.user);
    } catch (error) {
        authStatus.textContent = `Erro no login com Google: ${error.message}`;
        console.error("Erro Google Auth:", error);
    }
};

const fetchUserData = async (uid) => {
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            const followingSnapshot = await db.collection('users').doc(uid).collection('following').get();
            const following = followingSnapshot.docs.map(doc => doc.id);
            return { uid: uid, ...doc.data(), following: following };
        }
        return null;
    } catch (e) {
        console.error("Erro ao buscar dados do usuário:", e);
        return null;
    }
};

// ... (Lógica de toggleFollow é mantida) ...
const toggleFollow = async (targetUserId, followBtn) => {
    if (!CURRENT_USER_DATA || CURRENT_USER_DATA.uid === targetUserId) return;

    const myFollowingRef = db.collection('users').doc(CURRENT_USER_DATA.uid).collection('following').doc(targetUserId);
    const targetFollowerRef = db.collection('users').doc(targetUserId).collection('followers').doc(CURRENT_USER_DATA.uid);

    const isFollowing = followBtn.classList.contains('following');

    try {
        if (isFollowing) {
            await myFollowingRef.delete();
            await targetFollowerRef.delete();
            followBtn.textContent = 'Seguir';
            followBtn.classList.remove('following');
            followBtn.classList.add('follow');
        } else {
            await myFollowingRef.set({});
            await targetFollowerRef.set({});
            followBtn.textContent = 'A Seguir';
            followBtn.classList.remove('follow');
            followBtn.classList.add('following');
        }
        
        CURRENT_USER_DATA = await fetchUserData(CURRENT_USER_DATA.uid);

    } catch (error) {
        console.error("Erro ao seguir/deixar de seguir:", error);
    }
};


auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Garante que o usuário existe no Firestore antes de carregar o app
        await saveOrUpdateUser(user); 
        
        CURRENT_USER_DATA = await fetchUserData(user.uid);
        if (CURRENT_USER_DATA) {
            loginModal.classList.add('hidden');
            setupRealtimeFeed(currentFeedFilter); 
        } else {
            auth.signOut();
        }
    } else {
        CURRENT_USER_DATA = null;
        loginModal.classList.remove('hidden');
        feedContainer.innerHTML = `<h2 style="color: white; text-align: center; padding-top: 50px;">Faça login para ver o feed.</h2>`;
        setupRealtimeFeed('for-you'); // Carrega o feed público (Para Você)
    }
});

// Listeners de Autenticação
document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        authStatus.textContent = `Erro: ${error.message}`;
    }
});

document.getElementById('register-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const username = email.split('@')[0];
        await db.collection('users').doc(userCredential.user.uid).set({
            email: email,
            username: username,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert(`Bem-vindo, @${username}!`);
    } catch (error) {
        authStatus.textContent = `Erro: ${error.message}`;
    }
});

loginGoogleBtn.addEventListener('click', handleGoogleLogin);


// ======================================================================
// 2. UPLOAD DE VÍDEO (MANTIDO E FUNCIONAL)
// ======================================================================

const uploadVideoToCloudinary = async (file) => {
    uploadStatus.textContent = "A carregar vídeo para o Cloudinary...";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error ? data.error.message : `Erro de rede: ${response.status}`);
        }

        return data.secure_url;
    } catch (error) {
        uploadStatus.textContent = `Erro: ${error.message}. Verifique o Cloud Name/Preset.`;
        throw error; 
    }
};

const handleVideoUpload = async () => {
    if (!CURRENT_USER_DATA) return;

    const file = videoFileInput.files[0];
    const description = videoDescriptionInput.value;

    if (!file || !description) {
        uploadStatus.textContent = "Selecione um ficheiro e escreva uma descrição.";
        return;
    }

    uploadVideoBtn.disabled = true;
    uploadStatus.textContent = "A enviar vídeo...";

    try {
        const videoUrl = await uploadVideoToCloudinary(file);

        await db.collection('videos').add({
            userId: CURRENT_USER_DATA.uid,
            username: CURRENT_USER_DATA.username,
            description: description,
            videoUrl: videoUrl,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likesCount: 0,
            commentsCount: 0
        });

        uploadStatus.textContent = "✅ Vídeo publicado com sucesso!";
        videoFileInput.value = '';
        videoDescriptionInput.value = '';
        setTimeout(() => uploadModal.classList.add('hidden'), 1500);

    } catch (error) {
        uploadStatus.textContent = "❌ Erro ao enviar o vídeo. Tente novamente.";
        console.error("Erro no upload:", error);
    } finally {
        uploadVideoBtn.disabled = false;
    }
};

// Listeners do Modal de Upload
uploadVideoBtn.addEventListener('click', handleVideoUpload);
openUploadModalBtn.addEventListener('click', () => {
    if (CURRENT_USER_DATA) {
        uploadModal.classList.remove('hidden');
        uploadStatus.textContent = '';
    } else {
        alert("Inicie sessão para enviar vídeos.");
        loginModal.classList.remove('hidden');
    }
});
closeUploadModalBtn.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
});


// ======================================================================
// 3. FEED E LÓGICA DE INTERAÇÃO (BOTÕES CORRIGIDOS)
// ======================================================================

// ... (handleLike e handleComment mantidos) ...
const handleLike = async (videoId, likeBtnElement) => {
    if (!CURRENT_USER_DATA) { alert("Faça login para dar 'gosto'!"); return; }
    // Lógica do Like
    // ...
};

const handleComment = (videoId) => {
    if (!CURRENT_USER_DATA) { alert("Faça login para comentar."); return; }
    // Lógica do Comment
    // ...
};

const createVideoCard = (video) => {
    const card = document.createElement('div');
    card.className = 'video-card';
    const isLiked = video.isLiked ? 'style="color: #ff0050;"' : 'style="color: white;"';

    card.innerHTML = `
        <video class="video-player" loop muted src="${video.videoUrl}"></video>
        <div class="video-overlay" data-video-id="${video.id}">
            <i class="fas fa-play play-pause-icon"></i>
            <div class="video-content-left">
                <div class="user-info">
                    <h2 class="video-username" data-user-id="${video.userId}">@${video.username}</h2>
                    <p class="description">${video.description}</p>
                    <div class="music-info"><i class="fas fa-music"></i> <span>Música Original</span></div>
                </div>
            </div>
            <div class="video-actions-right">
                <div class="action-button like-btn" data-video-id="${video.id}">
                    <i class="fas fa-heart" ${isLiked}></i>
                    <span>${video.likesCount}</span>
                </div>
                <div class="action-button comment-btn" data-video-id="${video.id}">
                    <i class="fas fa-comment-dots"></i>
                    <span>${video.commentsCount}</span>
                </div>
                <div class="action-button"><i class="fas fa-share"></i><span>0</span></div>
                <div class="action-button profile-music-disk">
                    <img src="https://i.pravatar.cc/150?img=${video.userId.slice(-1)}" alt="Perfil" class="profile-pic-disk">
                </div>
            </div>
        </div>
    `;
    return card;
};

// ... (setupRealtimeFeed e listeners de Filtro mantidos) ...

// ======================================================================
// 4. CONTROLE DE VÍDEO E LISTENERS DINÂMICOS (CORRIGIDO PARA FUNCIONAR)
// ======================================================================

// ... (handleScroll mantido) ...

const setupVideoControl = () => {
    // Corrigido para limpar listeners do card de forma segura
    document.querySelectorAll('.video-card').forEach(card => {
        const video = card.querySelector('.video-player');
        const playPauseIcon = card.querySelector('.play-pause-icon');
        
        const oldCard = card;
        const newCard = oldCard.cloneNode(true);
        oldCard.parentNode.replaceChild(newCard, oldCard);
        
        const newVideo = newCard.querySelector('.video-player');
        const newIcon = newCard.querySelector('.play-pause-icon');

        newCard.addEventListener('click', function togglePlayPause(event) {
            if (!event.target.closest('.video-actions-right') && !event.target.closest('.video-username')) {
                if (newVideo.paused) {
                    newVideo.play();
                    newIcon.style.opacity = '0';
                } else {
                    newVideo.pause();
                    newIcon.style.opacity = '1';
                }
            }
        });
    });

    handleScroll();
};


const setupInteractionListeners = () => {
    // Corrigido para garantir que os listeners sejam aplicados aos novos elementos
    // 1. Listeners de Likes
    document.querySelectorAll('.like-btn').forEach(btn => {
        const oldBtn = btn;
        const newBtn = oldBtn.cloneNode(true); 
        oldBtn.parentNode.replaceChild(newBtn, oldBtn); 

        newBtn.addEventListener('click', function(event) {
            const videoId = event.currentTarget.dataset.videoId;
            handleLike(videoId, newBtn); 
        });
    });

    // 2. Listeners de Comentários 
    document.querySelectorAll('.comment-btn').forEach(btn => {
        const oldBtn = btn;
        const newBtn = oldBtn.cloneNode(true); 
        oldBtn.parentNode.replaceChild(newBtn, oldBtn); 
        
        newBtn.addEventListener('click', function(event) {
            const videoId = event.currentTarget.dataset.videoId;
            handleComment(videoId);
        });
    });

    // 3. Listener de Clique no Nome de Usuário para o Perfil
    document.querySelectorAll('.video-username').forEach(usernameElement => {
        const oldUsername = usernameElement;
        const newUsername = oldUsername.cloneNode(true);
        oldUsername.parentNode.replaceChild(newUsername, oldUsername);
        
        newUsername.addEventListener('click', function(event) {
            const targetUserId = event.currentTarget.dataset.userId;
            
            if (CURRENT_USER_DATA) {
                navigateTo('profile', targetUserId); 
            } else {
                alert("Faça login para ver perfis.");
            }
        });
    });
};


// ======================================================================
// 5. NAVEGAÇÃO, PERFIL E DMs (MANTIDO)
// ======================================================================

// ... (renderProfilePage e renderInboxView mantidos e funcionais) ...

const navigateTo = (viewId, userIdToView = CURRENT_USER_DATA ? CURRENT_USER_DATA.uid : null) => {
    feedView.classList.add('hidden');
    profileView.classList.add('hidden');
    inboxView.classList.add('hidden');
    
    document.querySelectorAll('.bottom-nav .nav-item, .bottom-nav .upload-btn').forEach(item => item.classList.remove('active'));
    document.querySelector('.feed-header').classList.remove('hidden');

    const navElement = document.getElementById(`nav-${viewId}`) || document.getElementById(`open-upload-modal`);
    if (navElement) navElement.classList.add('active');

    if (viewId === 'feed') {
        feedView.classList.remove('hidden');
        setupRealtimeFeed(currentFeedFilter); 
    } else if (viewId === 'profile') {
        if (!CURRENT_USER_DATA) { alert("Faça login para ver perfis."); return; }
        profileView.classList.remove('hidden');
        navProfile.classList.add('active');
        document.querySelector('.feed-header').classList.add('hidden');
        renderProfilePage(userIdToView || CURRENT_USER_DATA.uid);
    } else if (viewId === 'inbox') { 
        if (!CURRENT_USER_DATA) { alert("Faça login para ver suas mensagens."); return; }
        inboxView.classList.remove('hidden');
        navInbox.classList.add('active');
        document.querySelector('.feed-header').classList.add('hidden');
        renderInboxView(); 
    }
};

// Listeners de Navegação
navFeed.addEventListener('click', (e) => { e.preventDefault(); navigateTo('feed'); });
navProfile.addEventListener('click', (e) => { e.preventDefault(); navigateTo('profile'); });
navInbox.addEventListener('click', (e) => { e.preventDefault(); navigateTo('inbox'); });


// Listener de Rolagem Principal (Usado para Play/Pause automático)
document.querySelector('.feed-container').addEventListener('scroll', handleScroll);
