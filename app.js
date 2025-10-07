// AVISO: Este código é um exemplo educacional. Em produção, use um framework (React)
// e proteja suas variáveis de ambiente e o Upload Preset do Cloudinary.

// ----------------------------------------------------------------------
// 0. CONFIGURAÇÃO DE SERVIÇOS
// ----------------------------------------------------------------------

// Suas credenciais Firebase (já configuradas no index.html)
const app = firebase.app();
const auth = app.auth();
const db = app.firestore();
const analytics = firebase.analytics ? firebase.analytics() : null; // Analítica opcional

// SUAS CONFIGURAÇÕES CLOUDINARY (Cloud-name e Upload Preset)
const CLOUDINARY_CLOUD_NAME = 'ml_default';
// **Crie esta preset como "Unsigned" no seu painel do Cloudinary!**
const CLOUDINARY_UPLOAD_PRESET = 'videot_unsigned_preset'; 
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

// Elementos DOM
const feedContainer = document.querySelector('.feed-container');
const loginModal = document.getElementById('login-modal');
const uploadModal = document.getElementById('upload-modal');
const openUploadModalBtn = document.getElementById('open-upload-modal');
const uploadStatus = document.getElementById('upload-status');
let CURRENT_USER_DATA = null;


// ----------------------------------------------------------------------
// 1. LÓGICA DE UPLOAD (CLOUD BINARY + FIRESTORE)
// ----------------------------------------------------------------------

const uploadVideoToCloudinary = async (file) => {
    uploadStatus.textContent = "Iniciando upload para Cloudinary...";
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.secure_url;
    } catch (error) {
        uploadStatus.textContent = `Erro no Cloudinary: ${error.message}`;
        throw error;
    }
};

const handleVideoUpload = async () => {
    const fileInput = document.getElementById('video-file-input');
    const descriptionInput = document.getElementById('video-description-input');
    const file = fileInput.files[0];
    const description = descriptionInput.value;

    if (!file || !description || !CURRENT_USER_DATA) {
        alert("Selecione um arquivo e adicione uma descrição.");
        return;
    }
    
    document.getElementById('upload-video-btn').disabled = true;

    try {
        // 1. Upload para Cloudinary
        const videoUrl = await uploadVideoToCloudinary(file);
        
        // 2. Gravar metadados no Firestore
        uploadStatus.textContent = "Upload concluído! Salvando dados no Firestore...";
        
        await db.collection('videos').add({
            userId: CURRENT_USER_DATA.uid,
            username: CURRENT_USER_DATA.username, // Usa o nome salvo no Firestore
            videoUrl: videoUrl,
            description: description,
            likesCount: 0,
            commentsCount: 0,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        uploadStatus.textContent = "Vídeo enviado com sucesso para o VideoT!";
        setTimeout(() => {
            uploadModal.classList.add('hidden');
            document.getElementById('upload-video-btn').disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error("Erro fatal no upload:", error);
        uploadStatus.textContent = `Falha no upload. Tente novamente.`;
        document.getElementById('upload-video-btn').disabled = false;
    }
};

// Listener para o botão de upload
document.getElementById('upload-video-btn').addEventListener('click', handleVideoUpload);
openUploadModalBtn.addEventListener('click', () => {
    if (CURRENT_USER_DATA) {
        uploadModal.classList.remove('hidden');
        uploadStatus.textContent = "";
    } else {
        alert("Faça login para adicionar vídeos.");
    }
});


// ----------------------------------------------------------------------
// 2. RENDERIZAÇÃO E FEED EM TEMPO REAL (FIRESTORE)
// ----------------------------------------------------------------------

// Função que cria o HTML para um único vídeo
const createVideoCard = (video) => {
    const card = document.createElement('div');
    card.className = 'video-card';
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
                    <i class="fas fa-heart"></i>
                    <span>${video.likesCount}</span>
                </div>
                <div class="action-button"><i class="fas fa-comment-dots"></i><span>${video.commentsCount}</span></div>
                <div class="action-button"><i class="fas fa-share"></i><span>0</span></div>
                <div class="action-button profile-music-disk">
                    <img src="https://i.pravatar.cc/150?img=${video.userId.slice(-1)}" alt="Perfil" class="profile-pic-disk">
                </div>
            </div>
        </div>
    `;
    return card;
};


// Listener em Tempo Real (A Mágica do Realtime)
const setupRealtimeFeed = () => {
    // Ordena os vídeos pelo mais recente (timestamp)
    db.collection('videos').orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            // Limpa o feed anterior
            feedContainer.innerHTML = '';
            
            // Re-renderiza o feed completo com os novos dados
            snapshot.forEach((doc) => {
                const videoData = { id: doc.id, ...doc.data() };
                const card = createVideoCard(videoData);
                feedContainer.appendChild(card);
            });
            
            // Re-adiciona os listeners de rolagem e clique após a atualização do DOM
            setupVideoControl();
        });
};


// ----------------------------------------------------------------------
// 3. CONTROLE DE VÍDEO E AUTENTICAÇÃO (Play/Pause e Login)
// ----------------------------------------------------------------------

let currentVideoPlayer = null;

const setupVideoControl = () => {
    const videoCards = document.querySelectorAll('.video-card');

    // Lógica de Autoplay/Pause na rolagem
    const handleScroll = () => {
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

    // Lógica de Play/Pause no clique
    videoCards.forEach(card => {
        const video = card.querySelector('.video-player');
        const playPauseIcon = card.querySelector('.play-pause-icon');

        card.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                playPauseIcon.style.opacity = '0';
            } else {
                video.pause();
                playPauseIcon.style.opacity = '1';
            }
        });
    });

    // Inicia a verificação de rolagem
    handleScroll();
};


// ----------------------------------------------------------------------
// 4. INICIALIZAÇÃO E AUTENTICAÇÃO
// ----------------------------------------------------------------------

// Função para buscar dados do usuário (necessário para o upload)
const fetchUserData = async (uid) => {
    try {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? { uid: uid, ...doc.data() } : null;
    } catch (e) {
        console.error("Erro ao buscar dados do usuário:", e);
        return null;
    }
};

// Listener do Estado de Autenticação
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Usuário logado
        CURRENT_USER_DATA = await fetchUserData(user.uid);
        if (CURRENT_USER_DATA) {
            loginModal.classList.add('hidden');
            setupRealtimeFeed(); // Começa a carregar o feed em tempo real!
        } else {
            // Se o documento do usuário não existir (erro no registro), força o logout
            auth.signOut();
        }
    } else {
        // Usuário deslogado
        CURRENT_USER_DATA = null;
        loginModal.classList.remove('hidden');
        feedContainer.innerHTML = `<h2 style="color: white; text-align: center; padding-top: 50px;">Faça login para ver o feed.</h2>`;
    }
});

// Eventos de login/cadastro (usados do exercício anterior)
const authStatus = document.getElementById('auth-status');
document.getElementById('login-btn').addEventListener('click', async () => { /* ... (mesma lógica de login) ... */ });
document.getElementById('register-btn').addEventListener('click', async () => { /* ... (mesma lógica de cadastro, mas aprimorada para salvar no Firestore) ... */ });

// Adiciona o listener de rolagem após o DOM carregar
document.querySelector('.feed-container').addEventListener('scroll', setupVideoControl);
            
