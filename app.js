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

// ======================================================================
// 1. VARIÁVEIS DE ESTADO E ELEMENTOS DOM
// ======================================================================

const appContent = document.getElementById('app-content');
const bottomNav = document.getElementById('bottom-nav');
const loadingScreen = document.getElementById('loading-screen');
const feedContainer = document.querySelector('.feed-container');
const feedView = document.getElementById('feed-view');
const profileView = document.getElementById('profile-view');
const inboxView = document.getElementById('inbox-view');
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
const filterForYou = document.getElementById('filter-foryou');
const filterFollowing = document.getElementById('filter-following');
const logoutBtn = document.getElementById('logout-btn');

let CURRENT_USER_DATA = null;
let currentVideoPlayer = null; 
let unsubscribeFeed = () => {}; 
let currentFeedFilter = 'for-you'; 


// ======================================================================
// 2. AUTENTICAÇÃO E CONTROLE DE SESSÃO (SOLUÇÃO DE CARREGAMENTO)
// ======================================================================

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

// Lógica de Redirecionamento e Controle de Visibilidade
auth.onAuthStateChanged(async (user) => {
    // 💡 SOLUÇÃO CARREGAMENTO INFINITO: Esconde o ecrã de loading assim que o estado é verificado
    loadingScreen.classList.add('hidden'); 
    
    if (user) {
        // Logado: Carrega os dados e mostra a aplicação
        CURRENT_USER_DATA = await fetchUserData(user.uid);
        if (CURRENT_USER_DATA) {
            appContent.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            navigateTo('feed');
        } else {
            // Se o perfil do Firestore falhar (raro), forçamos o logout
            auth.signOut();
        }
    } else {
        // Não Logado: Redireciona para a página de login
        window.location.href = 'login.html';
    }
});

// Listener do Botão Terminar Sessão (no Perfil)
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            // O onAuthStateChanged fará o redirecionamento.
        } catch (error) {
            console.error("Erro ao terminar sessão:", error);
            alert("Erro ao terminar sessão. Tente novamente.");
        }
    });
}

// ... (toggleFollow é mantida) ...

// ======================================================================
// 3. UPLOAD DE VÍDEO
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
    uploadModal.classList.remove('hidden');
    uploadStatus.textContent = '';
});
closeUploadModalBtn.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
});


// ======================================================================
// 4. FEED E LÓGICA DE INTERAÇÃO (BOTÕES CORRIGIDOS)
// ======================================================================

const handleLike = async (videoId, likeBtnElement) => {
    if (!CURRENT_USER_DATA) { return; } 
    const userId = CURRENT_USER_DATA.uid;
    const videoRef = db.collection('videos').doc(videoId);
    const likeRef = videoRef.collection('likes').doc(userId);
    
    try {
        const likeDoc = await likeRef.get();
        if (likeDoc.exists) {
            await likeRef.delete();
            await videoRef.update({ likesCount: firebase.firestore.FieldValue.increment(-1) });
        } else {
            await likeRef.set({ userId: userId, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            await videoRef.update({ likesCount: firebase.firestore.FieldValue.increment(1) });
        }
    } catch (error) {
        console.error("Erro ao processar Like:", error);
    }
};

const handleComment = (videoId) => {
    if (!CURRENT_USER_DATA) { return; } 
    
    const commentText = prompt("Adicione seu comentário:");
    if (commentText) {
        db.collection('videos').doc(videoId).collection('comments').add({
            userId: CURRENT_USER_DATA.uid,
            username: CURRENT_USER_DATA.username,
            text: commentText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
             db.collection('videos').doc(videoId).update({ commentsCount: firebase.firestore.FieldValue.increment(1) });
        }).catch(console.error);
    }
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

const setupRealtimeFeed = (filter = 'for-you') => {
    if (unsubscribeFeed) unsubscribeFeed(); 
    
    let query = db.collection('videos').orderBy('timestamp', 'desc');

    if (filter === 'following' && CURRENT_USER_DATA && CURRENT_USER_DATA.following.length > 0) {
        query = query.where('userId', 'in', CURRENT_USER_DATA.following);
    } else if (filter === 'following') {
        feedContainer.innerHTML = `<h2 style="color: white; text-align: center; padding-top: 50px;">Siga alguém para ver este feed!</h2>`;
        setupVideoControl(); 
        setupInteractionListeners();
        return;
    }

    unsubscribeFeed = query.onSnapshot(async (snapshot) => {
        feedContainer.innerHTML = '';
        
        const videoPromises = snapshot.docs.map(async (doc) => {
            const videoData = { id: doc.id, ...doc.data() };
            
            if (CURRENT_USER_DATA) {
                const likeDoc = await db.collection('videos').doc(videoData.id)
                    .collection('likes').doc(CURRENT_USER_DATA.uid).get();
                videoData.isLiked = likeDoc.exists;
            }
            return createVideoCard(videoData);
        });

        const videoCards = await Promise.all(videoPromises);
        videoCards.forEach(card => feedContainer.appendChild(card));
        
        setupVideoControl(); 
        setupInteractionListeners(); 
    });
};

// Listeners de Filtro
filterForYou.addEventListener('click', () => {
    filterFollowing.classList.remove('active');
    filterForYou.classList.add('active');
    currentFeedFilter = 'for-you';
    setupRealtimeFeed('for-you');
});

filterFollowing.addEventListener('click', () => {
    if (!CURRENT_USER_DATA) {
        return;
    }
    filterForYou.classList.remove('active');
    filterFollowing.classList.add('active');
    currentFeedFilter = 'following';
    setupRealtimeFeed('following');
});


// ======================================================================
// 5. CONTROLE DE VÍDEO E LISTENERS DINÂMICOS (CORREÇÃO DE BOTÕES)
// ======================================================================

const handleScroll = () => {
    const videoCards = document.querySelectorAll('.video-card');
    const viewportHeight = window.innerHeight;
    let closestCard = null;
    let minDistance = Infinity;

    videoCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2; 
        const viewportCenter = viewportHeight / 2;
        const distance = Math.abs(cardCenter - viewportCenter);

        if (distance < minDistance) {
            minDistance = distance;
            closestCard = card;
        }
    });

    if (closestCard) {
        const newVideoPlayer = closestCard.querySelector('.video-player');
        if (newVideoPlayer && currentVideoPlayer !== newVideoPlayer) {
            if (currentVideoPlayer) {
                currentVideoPlayer.pause();
                const oldIcon = currentVideoPlayer.parentElement.querySelector('.play-pause-icon');
                if (oldIcon) oldIcon.style.opacity = '1';
            }

            // Nota: O play() pode falhar se não houver interação do usuário.
            newVideoPlayer.play().catch(console.error); 
            currentVideoPlayer = newVideoPlayer;
            const newIcon = currentVideoPlayer.parentElement.querySelector('.play-pause-icon');
            if (newIcon) newIcon.style.opacity = '0';
        }
    }
};

const setupVideoControl = () => {
    // CORREÇÃO DE BOTÕES: Clonagem para garantir que o listener de clique no card seja único.
    document.querySelectorAll('.video-card').forEach(card => {
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
    // CORREÇÃO DE BOTÕES: Clonagem para garantir que os listeners dos botões sejam únicos e funcionais.
    
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
            navigateTo('profile', targetUserId); 
        });
    });
};


// ======================================================================
// 6. NAVEGAÇÃO E PERFIL
// ======================================================================

const renderProfilePage = async (targetUserId) => {
    if (!targetUserId) return;
    
    // Simulação de busca de dados do perfil para renderização...

    db.collection('videos')
        .where('userId', '==', targetUserId)
        .orderBy('timestamp', 'desc')
        .get()
        .then((snapshot) => {
            userVideosGrid.innerHTML = '';
            if (snapshot.empty) {
                userVideosGrid.innerHTML = '<p style="padding: 20px; text-align: center;">Nenhum vídeo publicado ainda.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const video = doc.data();
                const thumbnail = document.createElement('img');
                thumbnail.className = 'video-thumbnail';
                const thumbnailUrl = video.videoUrl.replace('/upload/', '/upload/w_300,h_533,c_fill,e_preview:duration_1/');
                thumbnail.src = thumbnailUrl;
                userVideosGrid.appendChild(thumbnail);
            });
        })
        .catch(console.error);
};

const renderInboxView = () => {
    inboxView.innerHTML = `
        <h2 style="padding: 20px; border-bottom: 1px solid #333;">Caixa de Entrada</h2>
        <div id="chats-list">
            <p style="padding: 20px; color: #aaa;">Esta é a sua caixa de entrada.</p>
            <p style="padding: 0 20px;">*Este é um sistema de DMs conceitual. </p>
        </div>
    `;
};


const navigateTo = (viewId, userIdToView = CURRENT_USER_DATA ? CURRENT_USER_DATA.uid : null) => {
    // Esconde todas as vistas
    feedView.classList.add('hidden');
    profileView.classList.add('hidden');
    inboxView.classList.add('hidden');
    
    // Limpa estado de navegação
    document.querySelectorAll('.bottom-nav .nav-item, .bottom-nav .upload-btn').forEach(item => item.classList.remove('active'));
    document.querySelector('.feed-header').classList.remove('hidden');

    const navElement = document.getElementById(`nav-${viewId}`) || document.getElementById(`open-upload-modal`);
    if (navElement) navElement.classList.add('active');
    
    // Mostra a vista correta
    if (viewId === 'feed') {
        feedView.classList.remove('hidden');
        setupRealtimeFeed(currentFeedFilter); 
    } else if (viewId === 'profile') {
        profileView.classList.remove('hidden');
        navProfile.classList.add('active');
        document.querySelector('.feed-header').classList.add('hidden');
        renderProfilePage(userIdToView || CURRENT_USER_DATA.uid);
    } else if (viewId === 'inbox') { 
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


// Listener de Rolagem Principal 
document.querySelector('.feed-container').addEventListener('scroll', handleScroll);
            
