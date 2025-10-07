// ======================================================================
// 0. CONFIGURAÇÃO DE SERVIÇOS E CREDENCIAIS
// ======================================================================

// 🚨 1. SUAS CREDENCIAIS FIREBASE 
const firebaseConfig = {
    apiKey: "AIzaSyBI_4n8aBT9ZPiLy8cwgiQDtD0_CYSKk4E", // Substitua pelo seu valor
    authDomain: "videot-2fcec.firebaseapp.com",
    projectId: "videot-2fcec",
    storageBucket: "videot-2fcec.firebasestorage.app",
    messagingSenderId: "583396995831",
    appId: "1:583396995831:web:6182575e28ea628cc259f2"
};
// 🚨 2. SUAS CREDENCIAIS CLOUDINARY
const CLOUDINARY_CLOUD_NAME = 'dya1jd0mx'; // Substitua pelo seu Cloud Name
const CLOUDINARY_UPLOAD_PRESET = 'videot_unsigned_preset'; // Use o Preset Não Assinado que você criou
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();

// Elementos DOM
const feedContainer = document.querySelector('.feed-container');
const feedView = document.getElementById('feed-view');
const profileView = document.getElementById('profile-view');
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
const userVideosGrid = document.getElementById('user-videos-grid');
const authStatus = document.getElementById('auth-status');

let CURRENT_USER_DATA = null;
let currentVideoPlayer = null; 


// ======================================================================
// 1. AUTENTICAÇÃO E INICIALIZAÇÃO
// ======================================================================

const fetchUserData = async (uid) => {
    try {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? { uid: uid, ...doc.data() } : null;
    } catch (e) {
        console.error("Erro ao buscar dados do usuário:", e);
        return null;
    }
};

auth.onAuthStateChanged(async (user) => {
    if (user) {
        CURRENT_USER_DATA = await fetchUserData(user.uid);
        if (!CURRENT_USER_DATA) {
            // Se o usuário existir no Auth, mas não no Firestore (erro de registro), força logout
            auth.signOut();
            return;
        }
        loginModal.classList.add('hidden');
        setupRealtimeFeed(); // Inicia o feed
    } else {
        CURRENT_USER_DATA = null;
        loginModal.classList.remove('hidden');
        feedContainer.innerHTML = `<h2 style="color: white; text-align: center; padding-top: 50px;">Faça login para ver o feed.</h2>`;
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
// 2. UPLOAD DE VÍDEO (CLOUD BINARY + FIRESTORE)
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

        if (!response.ok) {
            throw new Error(`Cloudinary retornou erro ${response.status}`);
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        uploadStatus.textContent = `Erro no Cloudinary: ${error.message}`;
        throw error;
    }
};

const handleVideoUpload = async () => {
    if (!CURRENT_USER_DATA) return;

    const file = videoFileInput.files[0];
    const description = videoDescriptionInput.value;

    if (!file || !description) {
        uploadStatus.textContent = "Selecione um arquivo e adicione a descrição.";
        return;
    }

    uploadVideoBtn.disabled = true;
    uploadStatus.textContent = "A iniciar o upload...";

    try {
        const videoUrl = await uploadVideoToCloudinary(file);
        
        // 2. Gravar metadados no Firestore
        await db.collection('videos').add({
            userId: CURRENT_USER_DATA.uid,
            username: CURRENT_USER_DATA.username,
            description: description,
            videoUrl: videoUrl,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likesCount: 0,
            commentsCount: 0
        });

        uploadStatus.textContent = "Vídeo postado com sucesso!";
        videoFileInput.value = '';
        videoDescriptionInput.value = '';
        setTimeout(() => uploadModal.classList.add('hidden'), 1500);

    } catch (error) {
        uploadStatus.textContent = "Falha ao postar vídeo. Tente novamente.";
        console.error("Erro no processo de upload:", error);
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
        alert("Por favor, faça login para postar um vídeo.");
        loginModal.classList.remove('hidden');
    }
});
closeUploadModalBtn.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
});


// ======================================================================
// 3. INTERAÇÕES E FEED EM TEMPO REAL (LIKES E COMENTÁRIOS)
// ======================================================================

const handleLike = async (videoId, likeBtnElement) => {
    if (!CURRENT_USER_DATA) { alert("Faça login para dar 'gosto'!"); return; }

    const userId = CURRENT_USER_DATA.uid;
    const videoRef = db.collection('videos').doc(videoId);
    const likeRef = videoRef.collection('likes').doc(userId);
    
    try {
        const likeDoc = await likeRef.get();
        if (likeDoc.exists) {
            // Retirar Like
            await likeRef.delete();
            await videoRef.update({ likesCount: firebase.firestore.FieldValue.increment(-1) });
        } else {
            // Dar Like
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

// Cria o HTML do Card de Vídeo
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
                    <h2>@${video.username}</h2>
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

// Listener do Feed em Tempo Real
const setupRealtimeFeed = () => {
    if (unsubscribeFeed) unsubscribeFeed(); // Evita múltiplos listeners

    const unsubscribeFeed = db.collection('videos').orderBy('timestamp', 'desc')
        .onSnapshot(async (snapshot) => {
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


// ======================================================================
// 4. CONTROLE DE VÍDEO E LISTENERS (CORREÇÃO DOS BOTÕES)
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
    
    // Configura o Play/Pause no Clique (para todos os cards novos)
    videoCards.forEach(card => {
        const video = card.querySelector('.video-player');
        const playPauseIcon = card.querySelector('.play-pause-icon');
        
        // CORREÇÃO: Remove e Adiciona o Listener para garantir o funcionamento
        const oldCard = card.cloneNode(true);
        card.parentNode.replaceChild(oldCard, card);
        
        oldCard.addEventListener('click', function togglePlayPause() {
            if (video.paused) {
                video.play();
                playPauseIcon.style.opacity = '0';
            } else {
                video.pause();
                playPauseIcon.style.opacity = '1';
            }
        });
    });

    handleScroll();
};


const setupInteractionListeners = () => {
    // CORREÇÃO: Adiciona Listeners de Like
    document.querySelectorAll('.like-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(event) {
            const videoId = event.currentTarget.dataset.videoId;
            handleLike(videoId, event.currentTarget);
        });
    });

    // CORREÇÃO: Adiciona Listeners de Comentário
    document.querySelectorAll('.comment-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(event) {
            const videoId = event.currentTarget.dataset.videoId;
            handleComment(videoId);
        });
    });
};


// ======================================================================
// 5. NAVEGAÇÃO E PERFIL FUNCIONAL
// ======================================================================

const renderProfilePage = async () => {
    if (!CURRENT_USER_DATA) return;

    // 1. Atualizar informações do cabeçalho
    document.getElementById('profile-username').textContent = `@${CURRENT_USER_DATA.username}`;
    document.getElementById('profile-pic').src = `https://i.pravatar.cc/150?img=${CURRENT_USER_DATA.uid.slice(-1)}`;
    document.getElementById('profile-stats').textContent = `0 Seguidores • 0 Seguindo • 0 Likes`; // Stats estáticos por enquanto
    
    // 2. Buscar vídeos do usuário logado
    userVideosGrid.innerHTML = '<p style="padding: 20px; text-align: center;">A carregar vídeos...</p>';

    db.collection('videos')
        .where('userId', '==', CURRENT_USER_DATA.uid)
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
                
                // Transforma a URL do vídeo para uma miniatura
                const thumbnailUrl = video.videoUrl.replace('/upload/', '/upload/w_300,h_533,c_fill,e_preview:duration_1/');
                
                thumbnail.src = thumbnailUrl;
                userVideosGrid.appendChild(thumbnail);
            });
        })
        .catch(console.error);
};

const navigateTo = (viewId) => {
    feedView.classList.add('hidden');
    profileView.classList.add('hidden');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    if (viewId === 'feed') {
        feedView.classList.remove('hidden');
        navFeed.classList.add('active');
        // Toca o vídeo ao voltar para o feed
        setTimeout(() => handleScroll(), 100); 
    } else if (viewId === 'profile') {
        profileView.classList.remove('hidden');
        navProfile.classList.add('active');
        renderProfilePage(); // Carrega os dados do perfil
    }
};

// Listeners de Navegação
navFeed.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('feed');
});

navProfile.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('profile');
});

// Listener de Rolagem Principal (Usado para Play/Pause automático)
document.querySelector('.feed-container').addEventListener('scroll', handleScroll);
    
