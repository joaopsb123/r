// AVISO: Este código é um exemplo educacional em JavaScript Vanilla/Firebase v9 (compat).

// ----------------------------------------------------------------------
// 0. CONFIGURAÇÃO DE SERVIÇOS (REPETIR SUAS CREDENCIAIS AQUI)
// ----------------------------------------------------------------------
const firebaseConfig = { /* ... COLOQUE SUAS CHAVES DO FIREBASE AQUI ... */ };
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


// ----------------------------------------------------------------------
// 1. SISTEMA DE LIKES EM TEMPO REAL (O SEU FOGUINHO)
// ----------------------------------------------------------------------

const handleLike = async (videoId, likeBtnElement) => {
    if (!CURRENT_USER_DATA) {
        alert("Faça login para dar 'gosto'!");
        return;
    }

    const userId = CURRENT_USER_DATA.uid;
    const videoRef = db.collection('videos').doc(videoId);
    const likeRef = videoRef.collection('likes').doc(userId);

    try {
        const likeDoc = await likeRef.get();
        const icon = likeBtnElement.querySelector('i');

        // Lógica: Se o documento de like existe, o usuário está retirando o gosto.
        if (likeDoc.exists) {
            // 1. Retirar Like
            await likeRef.delete();
            // Atualizar contagem no documento principal (decremento)
            await videoRef.update({ 
                likesCount: firebase.firestore.FieldValue.increment(-1) 
            });
            icon.style.color = 'white';
        } else {
            // 2. Dar Like
            await likeRef.set({ userId: userId, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            // Atualizar contagem no documento principal (incremento)
            await videoRef.update({ 
                likesCount: firebase.firestore.FieldValue.increment(1) 
            });
            icon.style.color = '#ff0050'; // Cor vermelha do 'gosto'
        }

    } catch (error) {
        console.error("Erro ao processar Like:", error);
    }
};

// ----------------------------------------------------------------------
// 2. SISTEMA DE COMENTÁRIOS BÁSICO
// ----------------------------------------------------------------------

// NOTA: Em um aplicativo real, isso abriria um modal de comentários.
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
            // 2. Opcional: Atualizar contagem no documento principal (incremento)
             db.collection('videos').doc(videoId).update({ 
                commentsCount: firebase.firestore.FieldValue.increment(1) 
            });
        }).catch(error => {
            console.error("Erro ao adicionar comentário:", error);
        });
    }
};

// ----------------------------------------------------------------------
// 3. RENDERIZAÇÃO E FEED EM TEMPO REAL (AGORA COM LIKES E COMENTÁRIOS)
// ----------------------------------------------------------------------

// Função que cria o HTML para um único vídeo
const createVideoCard = (video) => {
    const card = document.createElement('div');
    card.className = 'video-card';

    // O Public ID seria '5e4898bea9a5d984c3ba51352583e8' se fosse um exemplo estático.
    // Usamos o video.videoUrl que já contém o ID gerado pelo Cloudinary.
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

// Listener em Tempo Real Aprimorado
const setupRealtimeFeed = () => {
    db.collection('videos').orderBy('timestamp', 'desc')
        .onSnapshot(async (snapshot) => {
            feedContainer.innerHTML = '';
            
            const videoPromises = snapshot.docs.map(async (doc) => {
                const videoData = { id: doc.id, ...doc.data() };
                
                // Verifica se o usuário logado já deu like
                if (CURRENT_USER_DATA) {
                    const likeDoc = await db.collection('videos').doc(videoData.id)
                        .collection('likes').doc(CURRENT_USER_DATA.uid).get();
                    videoData.isLiked = likeDoc.exists;
                }
                
                return createVideoCard(videoData);
            });

            const videoCards = await Promise.all(videoPromises);
            videoCards.forEach(card => feedContainer.appendChild(card));
            
            setupVideoControl(); // Re-adiciona o controle de play/pause
            setupInteractionListeners(); // **Novo**: Adiciona listeners de Like/Comentário
        });
};


// ----------------------------------------------------------------------
// 4. CONFIGURAÇÃO DE LISTENERS (LIKES E COMENTÁRIOS)
// ----------------------------------------------------------------------

const setupInteractionListeners = () => {
    // 1. Botões de Like
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.removeEventListener('click', handleLikeWrapper); // Remove listeners anteriores
        btn.addEventListener('click', handleLikeWrapper);
    });

    // Wrapper para passar o elemento do botão para a função handleLike
    function handleLikeWrapper(event) {
        const videoId = event.currentTarget.dataset.videoId;
        handleLike(videoId, event.currentTarget);
    }
    
    // 2. Botões de Comentário
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.removeEventListener('click', handleCommentWrapper); // Remove listeners anteriores
        btn.addEventListener('click', handleCommentWrapper);
    });

    function handleCommentWrapper(event) {
        const videoId = event.currentTarget.dataset.videoId;
        handleComment(videoId);
    }
};


// ----------------------------------------------------------------------
// 5. OUTRAS FUNÇÕES (UPLOAD, LOGIN, PLAY/PAUSE) - Mantidas do código anterior
// ----------------------------------------------------------------------

// (O resto do seu código de handleVideoUpload, login/registro, e setupVideoControl vai aqui...)

// Exemplo da função handleVideoUpload com o uso do Public ID implícito na URL:
/*
const handleVideoUpload = async () => {
    // ... (restante da lógica de validação) ...
    try {
        // 1. Upload para Cloudinary (retorna URL completa, que contém o Public ID)
        const videoUrl = await uploadVideoToCloudinary(file);
        
        // 2. Gravar metadados no Firestore
        await db.collection('videos').add({
            // ... (campos) ...
            videoUrl: videoUrl, // Usamos a URL completa, que é suficiente para exibir
            // ...
        });
        // ...
    } catch (error) {
        // ...
    }
};
*/

// Inicialização:
// auth.onAuthStateChanged(...) e document.addEventListener('DOMContentLoaded', ...)
    
