import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, setDoc, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
const storage = getStorage(app); // Inicializa o serviço de armazenamento

let userId;

// ---------- UI ELEMENTS ----------
const authSection = document.getElementById("auth");
const appSection = document.getElementById("app");
const authForm = document.getElementById("authForm");
const authBtn = document.getElementById("authBtn");
const toggleAuthLink = document.getElementById("toggleAuth");
const logoutBtn = document.getElementById("logoutBtn");

let isLoginMode = true;

// ---------- AUTENTICAÇÃO E INICIALIZAÇÃO ----------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userId = user.uid;
    console.log("Utilizador autenticado:", userId);
    authSection.style.display = "none";
    appSection.style.display = "block";

    carregarPerfil();
    carregarFeed();
    carregarMensagens();
    carregarStories();
    carregarGrupos();
    carregarPesquisa();
  } else {
    authSection.style.display = "block";
    appSection.style.display = "none";
  }
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    if (isLoginMode) {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login bem-sucedido!");
    } else {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: email.split('@')[0],
        bio: "",
        following: [],
        followers: []
      });
      console.log("Registo bem-sucedido!");
    }
  } catch (error) {
    console.error("Erro de autenticação:", error.message);
    alert(`Erro de autenticação: ${error.message}`);
  }
});

toggleAuthLink.addEventListener("click", (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    authBtn.textContent = "Entrar";
    toggleAuthLink.textContent = "Criar conta";
  } else {
    authBtn.textContent = "Criar conta";
    toggleAuthLink.textContent = "Entrar";
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  console.log("Sessão terminada.");
});

// ---------- FEED (AGORA COM FOTOS) ----------
const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");

postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const caption = document.getElementById("caption").value;
  const imageFile = document.getElementById("postImage").files[0];
  if (!caption && !imageFile) return;

  try {
    let imageUrl = null;
    if (imageFile) {
      const storageRef = ref(storage, `images/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(snapshot.ref);
    }

    await addDoc(collection(db, "posts"), {
      caption,
      imageUrl,
      createdAt: serverTimestamp(),
      authorId: userId,
      likes: [],
      comments: []
    });
    postForm.reset();
    alert("Post publicado!");
  } catch (error) {
    console.error("Erro ao publicar post:", error);
    alert("Erro ao publicar post.");
  }
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
        ${data.imageUrl ? `<img src="${data.imageUrl}" class="post-image" alt="Imagem do post">` : ''}
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

// ---------- PERFIL (COMPLETO) ----------
const profileInfo = document.getElementById("profileInfo");
const myPhotosGrid = document.getElementById("myPhotos");
async function carregarPerfil() {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  // Garantir que o documento de utilizador existe
  if (!userSnap.exists()) {
    await setDoc(userRef, { name: auth.currentUser.email.split('@')[0], bio: "", following: [], followers: [] });
    carregarPerfil();
    return;
  }

  const userData = userSnap.data();
  const creationDate = new Date(auth.currentUser.metadata.creationTime).toLocaleDateString();

  profileInfo.innerHTML = `
    <div class="profile-header">
      <img class="profile-pic" src="https://via.placeholder.com/150" alt="Foto de Perfil">
      <h2 class="profile-name">${userData.name}</h2>
    </div>
    <p class="profile-bio">${userData.bio}</p>
    <div class="profile-stats">
      <span><strong>${userData.following?.length || 0}</strong> a seguir</span>
      <span><strong>${userData.followers?.length || 0}</strong> seguidores</span>
    </div>
    <div class="profile-meta">
      <p>Membro desde: ${creationDate}</p>
    </div>
    <button onclick="editarPerfil()" class="edit-profile-btn">Editar Perfil</button>
  `;

  // Carregar as fotos do utilizador
  carregarMinhasFotos();
}

async function editarPerfil() {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  const newName = prompt("Introduza o seu novo nome:", userData.name);
  const newBio = prompt("Introduza a sua nova biografia:", userData.bio);
  
  if (newName !== null && newBio !== null) {
    await updateDoc(userRef, {
      name: newName,
      bio: newBio
    });
    carregarPerfil();
  }
}

function carregarMinhasFotos() {
  const myPostsQuery = query(collection(db, "posts"), where("authorId", "==", userId), orderBy("createdAt", "desc"));
  onSnapshot(myPostsQuery, (snapshot) => {
    myPhotosGrid.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.imageUrl) {
        const img = document.createElement("img");
        img.src = data.imageUrl;
        img.classList.add("my-photo");
        myPhotosGrid.appendChild(img);
      }
    });
  });
}

// ---------- MENSAGENS ----------
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

// ---------- PESQUISA (COM SEGUIR/DEIXAR DE SEGUIR) ----------
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
  const filteredUsers = allUsers.filter(user => user.name?.toLowerCase().includes(qText) && user.id !== userId);
  filteredUsers.forEach(user => {
    const div = document.createElement("div");
    div.classList.add("search-result-item");
    
    // Verifica se o utilizador já segue
    const isFollowing = allUsers.find(u => u.id === userId)?.following?.includes(user.id);
    const btnText = isFollowing ? "A seguir" : "Seguir";
    const btnClass = isFollowing ? "unfollow-btn" : "follow-btn";

    div.innerHTML = `
      <span>${user.name}</span>
      <button class="${btnClass}" data-userid="${user.id}">${btnText}</button>
    `;
    results.appendChild(div);
  });
  
  document.querySelectorAll('.follow-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userToFollowId = e.target.dataset.userid;
      await seguirUtilizador(userToFollowId);
    });
  });

  document.querySelectorAll('.unfollow-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const userToUnfollowId = e.target.dataset.userid;
      await deixarDeSeguirUtilizador(userToUnfollowId);
    });
  });
}

async function seguirUtilizador(userToFollowId) {
  const userRef = doc(db, "users", userId);
  const userToFollowRef = doc(db, "users", userToFollowId);
  await updateDoc(userRef, { following: arrayUnion(userToFollowId) });
  await updateDoc(userToFollowRef, { followers: arrayUnion(userId) });
}

async function deixarDeSeguirUtilizador(userToUnfollowId) {
  const userRef = doc(db, "users", userId);
  const userToUnfollowRef = doc(db, "users", userToUnfollowId);
  // Remove o ID dos arrays
  await updateDoc(userRef, { following: arrayRemove(userToUnfollowId) });
  await updateDoc(userToUnfollowRef, { followers: arrayRemove(userId) });
}

// ... Outras funções (stories, grupos, mensagens)
const storiesBox = document.getElementById("storiesBox");
function carregarStories() {
  const storiesQuery = query(collection(db, "stories"), orderBy("expiresAt", "desc"));
  onSnapshot(storiesQuery, snapshot => {
    storiesBox.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const storyDiv = document.createElement("div");
      storyDiv.classList.add("story-item");
      storyDiv.innerHTML = `<img src="https://via.placeholder.com/60" alt="Story de ${data.userId}"><span class="story-user-name">${data.userId}</span>`;
      storiesBox.appendChild(storyDiv);
    });
  });
}
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
                                                                      
