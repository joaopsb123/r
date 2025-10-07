// AVISO: Este código é um exemplo educacional em JavaScript Vanilla/Firebase v9 (compat).

// ----------------------------------------------------------------------
// 0. CONFIGURAÇÃO DE SERVIÇOS (COLOQUE SUAS CHAVES AQUI)
// ----------------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyBI_4n8aBT9ZPiLy8cwgiQDtD0_CYSKk4E",
    authDomain: "videot-2fcec.firebaseapp.com",
    projectId: "videot-2fcec",
    storageBucket: "videot-2fcec.firebasestorage.app",
    messagingSenderId: "583396995831",
    appId: "1:583396995831:web:6182575e28ea628cc259f2"
};
const CLOUDINARY_CLOUD_NAME = 'dya1jd0mx';
const CLOUDINARY_UPLOAD_PRESET = 'videot_unsigned_preset'; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();

// Elementos DOM
const feedContainer = document.querySelector('.feed-container');
const loginModal = document.getElementById('login-modal');
const uploadModal = document.getElementById('upload-modal');
const uploadStatus = document.getElementById('upload-status');
const openUploadModalBtn = document.getElementById('open-upload-modal');

let CURRENT_USER_DATA = null;
let currentVideoPlayer = null; // Para controle de Play/Pause

// ----------------------------------------------------------------------
// 1. FUNÇÕES DE INTERAÇÃO (LIKES E COMENTÁRIOS)
// ----------------------------------------------------------------------

const handleLike = async (videoId, likeBtnElement) => {
    if (!CURRENT_USER_DATA) {
        alert("Faça login para dar 'gosto'!");
        return;
    }

    const userId = CURRENT_USER_DATA.uid;
    const videoRef = db.collection('videos').doc(videoId);
    const likeRef = videoRef.collection('likes').doc(userId);
    
    // O onSnapshot cuida de atualizar a contagem, nós só cuidamos do estado local
    const icon = likeBtnElement.querySelector('i');

    try {
        const likeDoc = await likeRef.get();

        if (likeDoc.exists) {
            // Retirar Like
            await likeRef.delete();
            await videoRef.update({ 
                likesCount: firebase.firestore.FieldValue.increment(-1) 
            });
            icon.style.color = 'white';
        } else {
            // Dar Like
            await likeRef.set({ userId: userId, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            await videoRef.update({ 
                likesCount: firebase.firestore.FieldValue.increment(1) 
            });
            icon.style.color = '#ff0050'; 
        }

    } catch (error) {
        console.error("Erro ao processar Like:", error);
    }
};

const handleComment = (videoId) => {
    if (!CURRENT_USER_DATA) {
        alert("Faça login para comentar.");
        return;
    }
    
    const commentText = prompt("Adicione seu comentário:");
    if (commentText) {
        // 1. Adicionar comentário à subcoleção 'comments'
        db.collection('videos').doc(videoId).collection('comments').add({
            userId: CURRENT_USER_DATA.uid,
            username: CURRENT_USER_DATA.username,
            text: commentText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
             // 2. Atualizar contagem no documento principal
             db.collection('videos').doc(videoId).update({ 
                commentsCount: firebase.firestore.FieldValue.increment(1) 
            });
        }).catch(error => {
            console.error("Erro ao adicionar comentário:", error);
        });
    }
};

// ----------------------------------------------------------------------
// 2. CONTROLE DE VÍDEO (Play/Pause na Rolagem e Clique)
// ----------------------------------------------------------------------

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
            
            // Pausa o vídeo anterior
            if (currentVideoPlayer) {
                currentVideoPlayer.pause();
                const oldIcon = currentVideoPlayer.parentElement.querySelector('.play-pause-icon');
                if (oldIcon) oldIcon.style.opacity = '1';
            }

            // Toca o novo vídeo
            newVideoPlayer.play().catch(console.error);
            currentVideoPlayer = newVideoPlayer;
            const newIcon = currentVideoPlayer.parentElement.querySelector('.play-pause-icon');
            if (newIcon) newIcon.style.opacity = '0';
        }
    }
};

const setupVideoControl = () => {
    const videoCards = document.querySelectorAll('.video-card');

    // Listener para Play/Pause no clique
    videoCards.forEach(card => {
        const video = card.querySelector('.video-player');
        const playPauseIcon = card.querySelector('.play-pause-icon');

        // Garante que o listener só seja adicionado uma vez por card
        card.removeEventListener('click', togglePlayPause); 
        card.addEventListener('click', togglePlayPause);

        function togglePlayPause() {
            if (video.paused) {
                video.play();
                playPauseIcon.style.opacity = '0';
            } else {
                video.pause();
                playPauseIcon.style.opacity = '1';
            }
        }
    });

    // Toca o vídeo visível ao carregar/atualizar o feed
    handleScroll();
};


// ----------------------------------------------------------------------
// 3. CORREÇÃO: ADICIONAR LISTENERS APÓS RENDERIZAÇÃO
// ----------------------------------------------------------------------

// Função que adiciona todos os listeners aos novos botões
const setupInteractionListeners = () => {
    // 1. Botões de Like
    document.querySelectorAll('.like-btn').forEach(btn => {
        // Clonamos o nó para garantir que qualquer listener anterior seja removido
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(event) {
            const videoId = event.currentTarget.dataset.videoId;
            handleLike(videoId, event.currentTarget);
        });
    });

    // 2. Botões de Comentário
    document.querySelectorAll('.comment-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function(event) {
            const videoId = event.currentTarget.dataset.videoId;
            handleComment(videoId);
        });
    });
};


// ----------------------------------------------------------------------
// 4. FEED EM TEMPO REAL E RENDERIZAÇÃO
// ----------------------------------------------------------------------

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

const setupRealtimeFeed = () => {
    // O onSnapshot é a chave para o "tempo real"
    db.collection('videos').orderBy('timestamp', 'desc')
        .onSnapshot(async (snapshot) => {
            feedContainer.innerHTML = '';
            
            const videoPromises = snapshot.docs.map(async (doc) => {
                const videoData = { id: doc.id, ...doc.data() };
                
                // Verifica o estado do Like para renderizar a cor correta
                if (CURRENT_USER_DATA) {
                    const likeDoc = await db.collection('videos').doc(videoData.id)
                        .collection('likes').doc(CURRENT_USER_DATA.uid).get();
                    videoData.isLiked = likeDoc.exists;
                }
                
                return createVideoCard(videoData);
            });

            const videoCards = await Promise.all(videoPromises);
            videoCards.forEach(card => feedContainer.appendChild(card));
            
            // CHAVE DA CORREÇÃO: Chamar estes dois após re-renderizar o DOM
            setupVideoControl(); 
            setupInteractionListeners(); 
        });
};

// ----------------------------------------------------------------------
// 5. UPLOAD E AUTENTICAÇÃO (MANTIDAS DO CÓDIGO ANTERIOR)
// ----------------------------------------------------------------------

const uploadVideoToCloudinary = async (file) => {
    // ... (lógica do upload) ...
};

const handleVideoUpload = async () => {
    // ... (lógica do handleVideoUpload) ...
};

const fetchUserData = async (uid) => {
    // ... (lógica do fetchUserData) ...
};

// Eventos de Login/Registro/Upload (Repetição da lógica anterior)
// ...

// Listener do Estado de Autenticação
auth.onAuthStateChanged(async (user) => {
    // ... (lógica do onAuthStateChanged) ...
});

// Listener de Rolagem Principal
document.querySelector('.feed-container').addEventListener('scroll', handleScroll);
                 
