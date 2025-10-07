// --- 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


// Sua configuração (COLEI A QUE VOCÊ FORNECEU)
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

const uploadStatus = document.getElementById('uploadStatus');

// --- 2. FUNÇÃO DE UPLOAD E POSTAGEM ---

async function uploadVideo() {
    const fileInput = document.getElementById('videoFile');
    const titleInput = document.getElementById('videoTitle');
    const file = fileInput.files[0];
    const title = titleInput.value;

    if (!file || !title) {
        uploadStatus.textContent = "Por favor, selecione um arquivo e adicione um título.";
        return;
    }

    try {
        uploadStatus.textContent = "Iniciando upload... (0%)";
        
        // 1. UPLOAD PARA O CLOUD STORAGE
        // Cria uma referência única para o arquivo no Storage (ex: videos/nome_unico.mp4)
        const storageRef = ref(storage, 'videos/' + Date.now() + '_' + file.name);
        
        // Faz o upload. O uploadBytes não tem rastreio de progresso fácil, então vamos simplificar
        await uploadBytes(storageRef, file);
        uploadStatus.textContent = "Upload concluído! Gerando URL...";

        // Pega a URL de download para salvar no Firestore
        const videoURL = await getDownloadURL(storageRef);
        uploadStatus.textContent = "URL gerada. Postando metadados...";

        // 2. SALVAR METADADOS NO FIRESTORE
        // Salva a referência do vídeo e o título na coleção 'videos'
        await addDoc(collection(db, "videos"), {
            title: title,
            url: videoURL,
            timestamp: new Date()
        });
        
        uploadStatus.textContent = "Vídeo postado com sucesso! Recarregando feed...";
        
        // Recarrega o feed para mostrar o novo vídeo
        loadVideoFeed();

    } catch (error) {
        console.error("Erro completo:", error);
        uploadStatus.textContent = "Erro ao fazer upload ou postar: " + error.message;
    }
}


// --- 3. FUNÇÃO PARA CARREGAR O FEED ---

async function loadVideoFeed() {
    const feedElement = document.getElementById('videoFeed');
    feedElement.innerHTML = "Carregando...";

    try {
        const videosCol = collection(db, 'videos');
        // Pega todos os documentos da coleção 'videos' (o ideal seria paginar)
        const videoSnapshot = await getDocs(videosCol);
        
        feedElement.innerHTML = ''; // Limpa o "Carregando..."

        if (videoSnapshot.empty) {
            feedElement.innerHTML = "<p>Nenhum vídeo postado ainda.</p>";
            return;
        }

        videoSnapshot.forEach(doc => {
            const videoData = doc.data();
            
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            
            // Adiciona o player de vídeo e o título
            videoItem.innerHTML = `
                <h3>${videoData.title}</h3>
                <video controls autoplay muted loop>
                    <source src="${videoData.url}" type="video/mp4">
                    Seu navegador não suporta a tag de vídeo.
                </video>
            `;
            feedElement.appendChild(videoItem);
        });

    } catch (error) {
        console.error("Erro ao carregar o feed:", error);
        feedElement.innerHTML = "<p style='color:red;'>Erro ao carregar o feed. Verifique as regras do Firestore.</p>";
    }
}

// Inicializa o carregamento do feed quando a página carrega
loadVideoFeed();

// Torna a função de upload acessível pelo HTML
window.uploadVideo = uploadVideo;
