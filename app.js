// ======================================================================
// ⚙️ CONFIGURAÇÃO DO PROJETO "VideoT"
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
// ⚠️ Nota: A API Key/Secret só seriam necessárias para uploads *assinados* do backend.
// Para uploads diretos do frontend, usamos apenas o Cloud Name e o Preset não assinado.
const CLOUDINARY_API_KEY = '638656759857113'; 
const CLOUDINARY_API_SECRET = '-jx-m4UFNlLlpvJWycV6Ldb9tn4'; 
const CLOUDINARY_UPLOAD_PRESET = 'videot_unsigned_preset'; // Usando o nome correto para um preset não assinado.

// ✅ URL para upload (unsigned)
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`; // Corrigido para /video/upload

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();


// ======================================================================
// 1. VARIÁVEIS DE ESTADO E ELEMENTOS DOM
// ======================================================================

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

// Variáveis de Estado
let CURRENT_USER_DATA = null;
let currentVideoPlayer = null; 
let unsubscribeFeed = () => {}; 
let currentFeedFilter = 'for-you'; 


// ======================================================================
// 2. AUTENTICAÇÃO E PERFIL (COM SEGUIR/DEIXAR DE SEGUIR)
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
        CURRENT_USER_DATA = await fetchUserData(user.uid);
        if (CURRENT_USER_DATA) {
            loginModal.classList.add('hidden');
            setupRealtimeFeed(); 
        } else {
            auth.signOut();
        }
    } else {
        CURRENT_USER_DATA = null;
        loginModal.classList.remove('hidden');
        feedContainer.innerHTML = `<h2 style="color: white; text-align: center; padding-top: 50px;">Faça login para ver o feed.</h2>`;
        setupRealtimeFeed(currentFeedFilter);
    }
});

// Lógica de Login/Cadastro (Simplificada)
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


// ======================================================================
// 3. UPLOAD DE VÍDEOS PARA O CLOUDINARY (MANTIDO DA SUA VERSÃO)
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
            // Adicionado a mensagem de erro do Cloudinary para melhor diagnóstico
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

// ======================================================================
// 4. GESTÃO DO MODAL DE UPLOAD (MANTIDO)
// ======================================================================
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
// 5. INTERAÇÕES E FEED EM TEMPO REAL (LIKES, COMENTÁRIOS, FILTROS)
// ======================================================================

const handleLike = async (videoId, likeBtnElement) => {
    if (!CURRENT_USER_DATA) { alert("Faça login para dar 'gosto'!"); return; }

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
    if (!CURRENT_USER_DATA) { alert("Faça login para comentar."); return; }
    
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
        alert("Faça login para usar o filtro 'Seguindo'.");
        return;
    }
    filterForYou.classList.remove('active');
    filterFollowing.classList.add('active');
    currentFeedFilter = 'following';
    setupRealtimeFeed('following');
});


// ======================================================================
// 6. CONTROLE DE VÍDEO E LISTENERS DINÂMICOS
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

            newVideoPlayer.play().catch(console.error);
            currentVideoPlayer = newVideoPlayer;
            const newIcon = currentVideoPlayer.parentElement.querySelector('.play-pause-icon');
            if (newIcon) newIcon.style.opacity = '0';
        }
    }
};

const setupVideoControl = () => {
    const videoCards = document.querySelectorAll('.video-card');
    
    videoCards.forEach(card => {
        const video = card.querySelector('.video-player');
        const playPauseIcon = card.querySelector('.play-pause-icon');
        
        const oldCard = card.cloneNode(true);
        card.parentNode.replaceChild(oldCard, card);
        
        oldCard.addEventListener('click', function togglePlayPause(event) {
            if (!event.target.closest('.video-actions-right')) {
                if (video.paused) {
                    video.play();
                    playPauseIcon.style.opacity = '0';
                } else {
                    video.pause();
                    playPauseIcon.style.opacity = '1';
                }
            }
        });
    });

    handleScroll();
};


const setupInteractionListeners = () => {
    // 1. Listeners de Likes e Comentários 
    document.querySelectorAll('.like-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(event) {
            const videoId = event.currentTarget.dataset.videoId;
            handleLike(videoId, event.currentTarget);
        });
    });

    document.querySelectorAll('.comment-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(event) {
            const videoId = event.currentTarget.dataset.videoId;
            handleComment(videoId);
        });
    });

    // 2. Listener de Clique no Nome de Usuário para o Perfil
    document.querySelectorAll('.video-username').forEach(usernameElement => {
        const newUsername = usernameElement.cloneNode(true);
        usernameElement.parentNode.replaceChild(newUsername, usernameElement);
        
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
// 7. PÁGINA DE PERFIL E DMs
// ======================================================================

const renderProfilePage = async (targetUserId) => {
    if (!targetUserId) return;
    
    const targetUserDoc = await db.collection('users').doc(targetUserId).get();
    if (!targetUserDoc.exists) return;

    const userData = targetUserDoc.data();
    
    // Lógica para o botão Seguir
    const followBtn = document.getElementById('follow-toggle-btn');
    followBtn.onclick = null; 
    followBtn.classList.remove('hidden', 'follow', 'following');

    if (CURRENT_USER_DATA && targetUserId === CURRENT_USER_DATA.uid) {
        followBtn.classList.add('hidden');
    } else if (CURRENT_USER_DATA) {
        const isFollowing = CURRENT_USER_DATA.following.includes(targetUserId);
        followBtn.textContent = isFollowing ? 'A Seguir' : 'Seguir';
        followBtn.classList.add(isFollowing ? 'following' : 'follow');
        followBtn.onclick = () => toggleFollow(targetUserId, followBtn);
    } else {
        followBtn.classList.add('hidden');
    }

    // 1. Atualizar informações do cabeçalho
    document.getElementById('profile-username').textContent = `@${userData.username}`;
    document.getElementById('profile-pic').src = `https://i.pravatar.cc/150?img=${targetUserId.slice(-1)}`;
    document.getElementById('profile-stats').textContent = `0 Seguidores • 0 Seguind
