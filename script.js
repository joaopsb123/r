import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const auth = getAuth(app);

let userId; // Variável para guardar o ID do utilizador logado

// ---------- AUTENTICAÇÃO E INICIALIZAÇÃO ----------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userId = user.uid;
    console.log("Utilizador autenticado:", userId);
    // Carrega os dados após a autenticação
    carregarPerfil();
    carregarFeed();
    carregarMensagens();
    carregarStories();
    carregarGrupos();
    carregarPesquisa();
  } else {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Erro ao autenticar anonimamente:", error);
    }
  }
});

// ---------- FEED ----------
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

function carregarFeed() {
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
        await updateDoc(postRef, { likes: arrayUnion(userId) });
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
}

// ---------- PERFIL (AJUSTADO) ----------
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
      <button onclick="editarPerfil()" class="edit-profile-btn">Editar Perfil</button>
    `;
  } else {
    profileInfo.innerHTML = "<p class='profile-not-found'>Utilizador não encontrado. Crie um documento com o seu ID.</p>";
  }
}

async function editarPerfil() {
  const newBio = prompt("Introduza a nova biografia:");
  if (newBio !== null) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      bio: newBio
    });
    carregarPerfil(); // Recarrega o perfil para mostrar a alteração
  }
}

// ---------- MENSAGENS (CORRIGIDO) ----------
const msgForm = document.getElementById("msgForm");
const chatBox = document.getElementById("chatBox");

msgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = document.getElementById("msgInput").value;
  if (text.trim() === "") return;
  await addDoc(collection(db, "messages"), { senderId: userId, text, timestamp: serverTimestamp() });
  msgForm.reset();
});

function carregarMensagens() {
  const msgQuery = query(collection(db, "messages"), orderBy("timestamp", "asc"));
  onSnapshot(msgQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        const div = document.createElement("div");
        div.classList.add("chat-message", data.senderId === userId ? "sent" : "received");
        div.innerHTML = `<span class="message-text">${data.text}</span>`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    });
  });
}

// ---------- STORIES ----------
const storiesBox = document.getElementById("storiesBox");
function carregarStories() {
  const storiesQuery = query(collection(db, "stories"), orderBy("expiresAt", "desc"));
  onSnapshot(storiesQuery, snapshot => {
    storiesBox.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const storyDiv = document.createElement("div");
      storyDiv.classList.add("story-item");
      storyDiv.innerHTML = `
        <img src="https://via.placeholder.com/60" alt="Story de ${data.userId}">
        <span class="story-user-name">${data.userId}</span>
      `;
      storiesBox.appendChild(storyDiv);
    });
  });
}

// ---------- GRUPOS ----------
const groupsBox = document.getElementById("groupsBox");
function carregarGrupos() {
  const groupsQuery = query(collection(db, "groups"));
  onSnapshot(groupsQuery, snapshot => {
    groupsBox.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.classList.add("group-item");
      div.innerHTML = `<span class="group-name">${data.name}</span>`;
      groupsBox.appendChild(div);
    });
  });
}

// ---------- PESQUISA (AGORA COM BOTÃO DE SEGUIR) ----------
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");

let allUsers = [];
function carregarPesquisa() {
  const usersCol = collection(db, "users");
  onSnapshot(usersCol, snapshot => {
    allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    filterAndRenderUsers();
  });
}

searchInput.addEventListener("input", () => {
  filterAndRenderUsers();
});

function filterAndRenderUsers() {
  const qText = searchInput.value.toLowerCase();
  results.innerHTML = "";
  const filteredUsers = allUsers.filter(user => user.name.toLowerCase().includes(qText) && user.id !== userId);
  filteredUsers.forEach(user => {
    const div = document.createElement("div");
    div.classList.add("search-result-item");
    div.innerHTML = `
      <span>${user.name}</span>
      <button class="follow-btn" data-userid="${user.id}">Seguir</button>
    `;
    results.appendChild(div);
  });
  
  // Adiciona listeners aos botões de seguir
  document.querySelectorAll('.follow-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userToFollowId = e.target.dataset.userid;
      await seguirUtilizador(userToFollowId);
      alert(`Você começou a seguir ${userToFollowId}!`);
    });
  });
}

async function seguirUtilizador(userToFollowId) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    following: arrayUnion(userToFollowId)
  });
}
