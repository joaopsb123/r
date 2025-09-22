import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"; // Novo import

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBr9gb7qGFs632l4M9dT6C8sqehQTP8UWE",
  authDomain: "social-media-93276.firebaseapp.com",
  projectId: "social-media-93276",
  storageBucket: "social-media-93276.firebasestorage.app",
  messagingSenderId: "837381193847",
  appId: "1:837381193847:web:0b33f09354a8bbb90a0672",
  measurementId: "G-0JRNSXYYLQ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Inicializa o serviço de autenticação

// Variável para guardar o ID do utilizador logado
let userId;

// ---------- SISTEMA DE AUTENTICAÇÃO ANÓNIMA ----------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Utilizador logado
    userId = user.uid;
    console.log("Utilizador autenticado:", userId);
    // Chama a função para carregar o perfil apenas quando o utilizador estiver pronto
    carregarPerfil(); 
  } else {
    // Nenhum utilizador logado, faz login anónimo
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Erro ao autenticar anonimamente:", error);
    }
  }
});

// ---------- RESTO DO SEU CÓDIGO PERMANECE O MESMO ----------
// ... (o resto do código abaixo deve permanecer o mesmo, usando a variável 'userId')
// ...

// ---------- FEED (já usa 'userId') ----------
const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");

postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const caption = document.getElementById("caption").value;
  if (caption.trim() === "") return;
  await addDoc(collection(db, "posts"), {
    caption,
    createdAt: serverTimestamp(),
    authorId: userId,
    likes: [],
    comments: []
  });
  postForm.reset();
});

const feedQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(feedQuery, snapshot => {
  feedPosts.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const formattedTime = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'agora';
    const div = document.createElement("div");
    div.classList.add("post-card");
    div.innerHTML = `
      <div class="post-header">
        <span class="user-name">@${data.authorId}</span>
        <span class="post-time">${formattedTime}</span>
      </div>
      <p class="post-caption">${data.caption}</p>
      <div class="post-actions">
        <button class="like-btn" data-postid="${doc.id}">
          ❤️ ${data.likes?.length || 0}
        </button>
        <button class="comment-btn" data-postid="${doc.id}">
          💬 Comentar
        </button>
      </div>
      <div class="comments-section">
        ${data.comments.map(c => `<p class="comment-text"><strong>${c.authorId}</strong>: ${c.text}</p>`).join('')}
      </div>
    `;
    feedPosts.appendChild(div);
  });
  
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const postId = e.currentTarget.dataset.postid;
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        likes: arrayUnion(userId)
      });
    });
  });

  document.querySelectorAll('.comment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const postId = e.currentTarget.dataset.postid;
      const commentText = prompt("Escreva o seu comentário:");
      if (commentText) {
        const postRef = doc(db, "posts", postId);
        updateDoc(postRef, {
          comments: arrayUnion({ authorId: userId, text: commentText, timestamp: serverTimestamp() })
        });
      }
    });
  });
});

// ---------- PERFIL (AJUSTADO para carregar apenas após o login) ----------
const profileInfo = document.getElementById("profileInfo");
async function carregarPerfil() {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    profileInfo.innerHTML = `
      <div class="profile-header">
        <img class="profile-pic" src="https://via.placeholder.com/150" alt="Foto de Perfil">
        <h2 class="profile-name">${data.name}</h2>
      </div>
      <p class="profile-bio">${data.bio}</p>
    `;
  } else {
    profileInfo.innerHTML = "<p class='profile-not-found'>Utilizador não encontrado. Verifique se o documento 'meuUserId' existe na sua coleção 'users'.</p>";
  }
}

// ... (todo o resto do seu código, sem alterações)
                   
