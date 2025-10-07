// --- 1. CONFIGURAÇÃO E IMPORTS DO FIREBASE ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";


// Sua configuração (VideoT)
const firebaseConfig = {
    apiKey: "AIzaSyBI_4n8aBT9ZPiLy8cwgiQDtD0_CYSKk4E",
    authDomain: "videot-2fcec.firebaseapp.com",
    projectId: "videot-2fcec",
    storageBucket: "videot-2fcec.firebasestorage.app",
    messagingSenderId: "583396995831",
    appId: "1:583396995831:web:6182575e28ea628cc259f2",
    measurementId: "G-2ERH0XEGSX"
};

// Inicializa os serviços
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const uploadStatus = document.getElementById('uploadStatus');

// --- 2. AUTENTICAÇÃO, LOGIN E CADASTRO (EM TEMPO REAL) ---

async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // 1. Cria/Atualiza o perfil no Firestore
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
            // Se for novo, gera um username básico e salva
            const username = user.displayName.split(" ")[0].toLowerCase() + Math.floor(Math.random() * 999);
            await setDoc(userRef, {
                uid: user.uid,
                username: username,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: new Date()
            });
            alert(`Bem-vindo ao VideoT, @${username}!`);
        }
        
        updateAuthUI(user);

    } catch (error) {
        console.error("Erro no login com Google:", error);
        alert("Falha no login. Verifique o console.");
    }
}

async function logoutUser() {
    await signOut(auth);
    updateAuthUI(null);
    alert("Você saiu do VideoT.");
}

function updateAuthUI(user) {
    const loginBtn = document.getElementById('google-login');
    const logoutBtn = document.getElementById('google-logout');
    
    if (user) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
}

// Escuta o estado da autenticação (chamado quando a página carrega)
onAuthStateChanged(auth, updateAuthUI);


// --- 3. UPLOAD DE VÍDEO (CLOUD STORAGE + FIRESTORE) ---

async function uploadVideo() {
    if (!auth.currentUser) {
        uploadStatus.textContent = "Você precisa fazer login para postar vídeos!";
        return;
    }

    const fileInput = document.getElementById('videoFile');
    const titleInput = document.getElementById('videoTitle');
    const file = fileInput.files[0];
    const title = titleInput.value;

    if (!file || !title) {
        uploadStatus.textContent = "Selecione um arquivo e adicione um título.";
        return;
    }

    try {
        uploadStatus.textContent = "Iniciando upload para o Cloud Storage...";
        
        // 1. UPLOAD PARA O CLOUD STORAGE
        const videoRef = storageRef(storage, `videos/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(videoRef, file);
        const videoURL = await getDownloadURL(videoRef);
        uploadStatus.textContent = "Upload concluído. Postando no Feed...";

        // 2. SALVAR METADADOS NO FIRESTORE
        await addDoc(collection(db, "videos"), {
            userId: auth.currentUser.uid,
            title: title,
            url: videoURL,
            timestamp: new Date(),
            likes: 0,
            comments: 0
        });
        
        uploadStatus.textContent = "Vídeo postado no VideoT com sucesso!";
        loadVideoFeed(); // Recarrega o feed
        hideUploadModal(); // Esconde o modal (assumindo que esta função existe no index.html)

    } catch (error) {
        console.error("Erro no Upload:", error);
        uploadStatus.textContent = "Erro ao postar: " + error.message;
    }
}


// --- 4. CARREGAMENTO DO FEED (PAGINAÇÃO ESSENCIAL) ---

async function loadVideoFeed() {
    const feedElement = document.getElementById('videoFeed');
    feedElement.innerHTML = "<p style='text-align: center; margin-top: 50vh;'>Carregando vídeos...</p>";

    try {
        const videosRef = collection(db, 'videos');
        // Em um app real, você limitaria e ordenaria!
        const q = query(videosRef, /* orderBy("timestamp", "desc"), limit(10) */); 
        const videoSnapshot = await getDocs(q);
        
        feedElement.innerHTML = ''; 

        if (videoSnapshot.empty) {
            feedElement.innerHTML = "<p style='text-align: center; margin-top: 50vh;'>Nenhum vídeo postado. Seja o primeiro!</p>";
            return;
        }

        videoSnapshot.forEach(doc => {
            const videoData = doc.data();
            
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            
            // Aqui você renderizaria a sobreposição de ícones (likes, comentários)
            videoItem.innerHTML = `
                <video src="${videoData.url}" controls autoplay muted loop></video>
                <div style="position: absolute; bottom: 80px; left: 10px; z-index: 15;">
                    <p style="font-weight: bold; margin: 0;">@Usuário ID</p>
                    <p style="margin: 0;">${videoData.title}</p>
                </div>
            `;
            feedElement.appendChild(videoItem);
        });

    } catch (error) {
        console.error("Erro ao carregar o feed:", error);
        feedElement.innerHTML = "<p style='color:red; text-align: center;'>Erro ao carregar o feed. Verifique as regras do Firestore.</p>";
    }
}


// --- 5. ESTRUTURA PARA AMIZADES E MENSAGENS DIRETAS (Conceito) ---

// Coleções essenciais:
// 1. 'users': (UID, username, email)
// 2. 'friendRequests': (senderId, receiverId, status: 'pending'/'accepted')
// 3. 'chats': (participants: [UID1, UID2], lastMessage, timestamp)
// 4. 'messages' (Subcoleção de 'chats'): (senderId, text, timestamp)

// *Para o sistema de mensagens em tempo real, você usaria 'onSnapshot' do Firestore, 
// o que permite receber novas mensagens instantaneamente.*

// Exemplo de Iniciar um Chat:
async function startChat(friendUID) {
    const currentUser = auth.currentUser;
    if (!currentUser) return alert("Faça login para conversar.");
    
    // Cria um ID de chat consistente, ordenando os UIDs
    const participants = [currentUser.uid, friendUID].sort();
    const chatId = participants.join('_'); // Ex: 'UID1_UID2'
    
    const chatRef = doc(db, "chats", chatId);
    await setDoc(chatRef, { 
        participants: participants,
        lastMessage: "Novo chat iniciado!",
        timestamp: new Date()
    }, { merge: true });

    alert(`Chat com ${friendUID} iniciado (ID: ${chatId}).`);
    // Aqui, você navegaria para a tela de mensagens
}

// --- Torna as funções essenciais acessíveis globalmente ---
window.signInWithGoogle = signInWithGoogle;
window.logoutUser = logoutUser;
window.uploadVideo = uploadVideo;
window.loadVideoFeed = loadVideoFeed;

// Inicia o carregamento do feed
loadVideoFeed();
                         
