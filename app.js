// AVISO: Este arquivo usa o Firebase v9 (compat) e JavaScript nativo.
// Para um app real, o recomendado é usar frameworks (React/Next.js) e Webpack.

// ----------------------------------------------------------------------
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ----------------------------------------------------------------------

// Suas configurações do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBI_4n8aBT9ZPiLy8cwgiQDtD0_CYSKk4E",
    authDomain: "videot-2fcec.firebaseapp.com",
    projectId: "videot-2fcec",
    storageBucket: "videot-2fcec.firebasestorage.app",
    messagingSenderId: "583396995831",
    appId: "1:583396995831:web:6182575e28ea628cc259f2",
    measurementId: "G-2ERH0XEGSX"
};

// Inicializa o Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();
// const analytics = app.analytics(); // Opcional

// ----------------------------------------------------------------------
// 2. FUNÇÕES DE AUTENTICAÇÃO (Login e Cadastro)
// ----------------------------------------------------------------------

const loginModal = document.getElementById('login-modal');
const authStatus = document.getElementById('auth-status');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');

const displayAuthError = (message) => {
    authStatus.textContent = message;
    authStatus.style.color = '#ff0050';
};

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        displayAuthError(`Erro no Login: ${error.message}`);
    }
});

registerBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        // Após o cadastro, salva dados básicos no Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            email: email,
            username: email.split('@')[0],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Cadastro realizado com sucesso! Bem-vindo ao VideoT.');
    } catch (error) {
        displayAuthError(`Erro no Cadastro: ${error.message}`);
    }
});

// Listener do Estado de Autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Usuário logado:", user.uid);
        loginModal.classList.add('hidden'); // Esconde o modal
        // Lógica para carregar o feed real aqui
    } else {
        console.log("Nenhum usuário logado. Mostrando modal.");
        loginModal.classList.remove('hidden'); // Mostra o modal
    }
});

// ----------------------------------------------------------------------
// 3. CONTROLE DE VÍDEO (Play/Pause e Visibilidade)
// ----------------------------------------------------------------------

const videoCards = document.querySelectorAll('.video-card');
let currentVideo = null;

// Função principal de autoplay baseada na rolagem
const handleScroll = () => {
    const viewportHeight = window.innerHeight;
    let closestCard = null;
    let minDistance = Infinity;

    videoCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        // Centraliza a visão na metade da tela
        const cardCenter = rect.top + rect.height / 2; 
        const viewportCenter = viewportHeight / 2;
        const distance = Math.abs(cardCenter - viewportCenter);

        if (distance < minDistance) {
            minDistance = distance;
            closestCard = card;
        }
    });

    // Pausa o vídeo anterior e toca o novo
    if (closestCard) {
        const newVideoPlayer = closestCard.querySelector('.video-player');
        
        if (newVideoPlayer && currentVideo !== newVideoPlayer) {
            // 1. Pausa o vídeo anterior (se houver)
            if (currentVideo) {
                currentVideo.pause();
                const oldPlayIcon = currentVideo.parentElement.querySelector('.play-pause-icon');
                if (oldPlayIcon) oldPlayIcon.classList.remove('hidden'); // Mostra ícone de pause
            }

            // 2. Toca o novo vídeo
            newVideoPlayer.play().catch(error => {
                console.log("Autoplay bloqueado, mas o vídeo será pausado/tocado no clique.");
                newVideoPlayer.muted = false; // Tenta desmutar, se permitido
            });
            currentVideo = newVideoPlayer;
        }
    }
};

// Evento de Play/Pause ao clicar no vídeo
videoCards.forEach(card => {
    const video = card.querySelector('.video-player');
    const playPauseIcon = card.querySelector('.play-pause-icon');

    card.addEventListener('click', () => {
        if (video.paused) {
            video.play();
            // Efeito de fade-out no ícone de play
            playPauseIcon.style.opacity = '0';
        } else {
            video.pause();
            // Efeito de fade-in no ícone de pause
            playPauseIcon.style.opacity = '1';
        }
    });
});


// Inicialização dos Eventos
document.addEventListener('DOMContentLoaded', () => {
    // Toca o primeiro vídeo ao carregar
    handleScroll(); 
    
    // Adiciona o listener de rolagem
    document.querySelector('.feed-container').addEventListener('scroll', handleScroll);
});
