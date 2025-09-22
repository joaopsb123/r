import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// ---------- FEED (CORRIGIDO E ADICIONADO LIKES/COMENTÁRIOS) ----------
const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");
const userId = "meuUserId"; // ID fixo para exemplo, em app real, seria dinâmico

postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const caption = document.getElementById("caption").value;
  if (caption.trim() === "") return;
  await addDoc(collection(db, "posts"), {
    caption,
    createdAt: serverTimestamp(),
    authorId: userId, // Adicionado autor para identificação
    likes: [], // Array para guardar os IDs dos utilizadores que gostaram
    comments: [] // Array para guardar os comentários
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
  
  // Adiciona listeners para os botões de like e comentário
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const postId = e.currentTarget.dataset.postid;
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        likes: arrayUnion(userId) // Adiciona o ID do utilizador ao array de likes
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
    `;
  } else {
    profileInfo.innerHTML = "<p class='profile-not-found'>Utilizador não encontrado. Verifique se o documento 'meuUserId' existe na sua coleção 'users'.</p>";
  }
}
carregarPerfil();

// ---------- MENSAGENS (CORRIGIDO) ----------
const msgForm = document.getElementById("msgForm");
const chatBox = document.getElementById("chatBox");

msgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = document.getElementById("msgInput").value;
  if (text.trim() === "") return;
  // Para que as mensagens sejam privadas, é necessário ter um ID de conversa
  // Exemplo: `doc(db, "conversations", "conversationId123")`
  await addDoc(collection(db, "messages"), { senderId: userId, text, timestamp: serverTimestamp() });
  msgForm.reset();
});

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

// ---------- STORIES (SEM ALTERAÇÕES) ----------
const storiesBox = document.getElementById("storiesBox");
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

// ---------- GRUPOS (SEM ALTERAÇÕES) ----------
const groupsBox = document.getElementById("groupsBox");
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

// ---------- PESQUISA (SEM ALTERAÇÕES) ----------
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");

let allUsers = [];
const usersCol = collection(db, "users");

onSnapshot(usersCol, snapshot => {
  allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  filterAndRenderUsers();
});

searchInput.addEventListener("input", () => {
  filterAndRenderUsers();
});

function filterAndRenderUsers() {
  const qText = searchInput.value.toLowerCase();
  results.innerHTML = "";
  const filteredUsers = allUsers.filter(user => user.name.toLowerCase().includes(qText));
  filteredUsers.forEach(user => {
    const div = document.createElement("div");
    div.classList.add("search-result-item");
    div.textContent = user.name;
    results.appendChild(div);
  });
                                }
