import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, setDoc, where, getDocs, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// Remova o import do Firebase Storage
// import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
// Remova a inicialização do Storage
// const storage = getStorage(app);

// --- CONFIGURAÇÃO DO CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = 'dya1jd0mx';
const CLOUDINARY_UPLOAD_PRESET = 'Social';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;
// --- FIM DA CONFIGURAÇÃO ---

let userId;
let currentProfileId;
let currentDmId = null;

// ---------- UI ELEMENTS ----------
const authSection = document.getElementById("auth");
const appSection = document.getElementById("app");
const authForm = document.getElementById("authForm");
const authBtn = document.getElementById("authBtn");
const toggleAuthLink = document.getElementById("toggleAuth");
const logoutBtn = document.getElementById("logoutBtn");
const notificationBtn = document.getElementById("notificationBtn");
const notificationModal = document.getElementById("notificationModal");
const notificationList = document.getElementById("notificationList");
const closeBtn = document.querySelector(".close-btn");
const notificationCount = document.getElementById("notificationCount");

let isLoginMode = true;

// ---------- AUTENTICAÇÃO E INICIALIZAÇÃO ----------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userId = user.uid;
    console.log("Utilizador autenticado:", userId);
    authSection.style.display = "none";
    appSection.style.display = "block";
    currentProfileId = userId;

    carregarFeed();
    carregarMensagensPublicas();
    carregarStories();
    carregarGrupos();
    carregarPesquisa();
    carregarPerfil(userId);
    carregarNotificacoes();
    carregarDmUserList();
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
        profilePicUrl: null,
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

// ---------- NOTIFICAÇÕES ----------
notificationBtn.addEventListener("click", () => {
  notificationModal.style.display = "block";
});
closeBtn.addEventListener("click", () => {
  notificationModal.style.display = "none";
});

function carregarNotificacoes() {
  const notifQuery = query(collection(db, "notifications"), where("targetId", "==", userId), orderBy("createdAt", "desc"));
  onSnapshot(notifQuery, (snapshot) => {
    notificationList.innerHTML = "";
    let unreadCount = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.classList.add("notification-item");
      if (!data.read) {
        div.classList.add("unread");
        unreadCount++;
      }
      div.innerHTML = `<p>${data.message}</p>`;
      notificationList.appendChild(div);
    });
    notificationCount.textContent = unreadCount > 0 ? unreadCount : "";
  });
}

// ---------- FEED (AGORA COM FOTOS CLOUDINARY) ----------
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
      // --- CÓDIGO DE UPLOAD PARA CLOUDINARY ---
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      imageUrl = data.secure_url; // URL da imagem segura
      // --- FIM DO CÓDIGO CLOUDINARY ---
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
          <img src="${data.profilePicUrl || 'https://via.placeholder.com/50'}" class="post-profile-pic" alt="Foto de perfil">
          <span class="user-name" onclick="mostrarPerfil('${data.authorId}')">@${data.authorId}</span>
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
const profileHeader = document.getElementById("profileHeader");
const profilePhotos = document.getElementById("profilePhotos");

function mostrarPerfil(targetUserId) {
  currentProfileId = targetUserId;
  mostrar('profile');
  carregarPerfil(targetUserId);
}

async function carregarPerfil(targetUserId) {
  const userRef = doc(db, "users", targetUserId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    profileHeader.innerHTML = "<p>Utilizador não encontrado.</p>";
    profilePhotos.innerHTML = "";
    return;
  }

  const userData = userSnap.data();
  const isMyProfile = targetUserId === userId;

  profileHeader.innerHTML = `
    <div class="profile-header">
      <img class="profile-pic" src="${userData.profilePicUrl || 'https://via.placeholder.com/150'}" alt="Foto de Perfil">
      <h2 class="profile-name">${userData.name}</h2>
    </div>
    <p class="profile-bio">${userData.bio}</p>
    <div class="profile-stats">
      <span><strong>${userData.following?.length || 0}</strong> a seguir</span>
      <span><strong>${userData.followers?.length || 0}</strong> seguidores</span>
    </div>
    ${isMyProfile ? `
      <div class="profile-meta">
        <p>Membro desde: ${new Date(auth.currentUser.metadata.creationTime).toLocaleDateString()}</p>
      </div>
      <button onclick="editarPerfil()" class="edit-profile-btn">Editar Perfil</button>
    ` : `
      <button class="follow-btn" data-userid="${targetUserId}">${userData.followers?.includes(userId) ? 'A seguir' : 'Seguir'}</button>
    `}
  `;
  
  if (isMyProfile) {
    const photoUploader = document.createElement('div');
    photoUploader.innerHTML = `<input type="file" id="profilePicInput" accept="image/*">`;
    profileHeader.appendChild(photoUploader);
    document.getElementById('profilePicInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        // --- CÓDIGO DE UPLOAD PARA CLOUDINARY (FOTO DE PERFIL) ---
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        const response = await fetch(CLOUDINARY_URL, {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        const url = data.secure_url;
        await updateDoc(doc(db, "users", userId), { profilePicUrl: url });
        carregarPerfil(userId);
        // --- FIM DO CÓDIGO CLOUDINARY ---
      }
    });
  } else {
    document.querySelector('.follow-btn').addEventListener('click', async (e) => {
      const userToFollowId = e.target.dataset.userid;
      if (e.target.textContent === 'Seguir') {
        await seguirUtilizador(userToFollowId);
      } else {
        await deixarDeSeguirUtilizador(userToFollowId);
      }
    });
  }

  carregarFotosDoUtilizador(targetUserId);
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
    carregarPerfil(userId);
  }
}

function carregarFotosDoUtilizador(targetUserId) {
  const userPostsQuery = query(collection(db, "posts"), where("authorId", "==", targetUserId), orderBy("createdAt", "desc"));
  onSnapshot(userPostsQuery, (snapshot) => {
    profilePhotos.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.imageUrl) {
        const img = document.createElement("img");
        img.src = data.imageUrl;
        img.classList.add("my-photo");
        profilePhotos.appendChild(img);
      }
    });
  });
}

// ---------- MENSAGENS PÚBLICAS E PRIVADAS ----------
const publicChatBtn = document.getElementById("publicChatBtn");
const dmsBtn = document.getElementById("dmsBtn");
const publicChatContainer = document.getElementById("publicChat");
const dmsContainer = document.getElementById("dms");
const publicChatBox = document.getElementById("publicChatBox");
const publicMsgForm = document.getElementById("publicMsgForm");
const dmUserList = document.getElementById("dmUserList");
const privateChatBox = document.getElementById("privateChat");
const dmMsgForm = document.getElementById("dmMsgForm");

publicChatBtn.addEventListener('click', () => {
    publicChatBtn.classList.add('active');
    dmsBtn.classList.remove('active');
    publicChatContainer.style.display = 'block';
    dmsContainer.style.display = 'none';
});
dmsBtn.addEventListener('click', () => {
    dmsBtn.classList.add('active');
    publicChatBtn.classList.remove('active');
    publicChatContainer.style.display = 'none';
    dmsContainer.style.display = 'block';
});

publicMsgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = document.getElementById("publicMsgInput").value;
  if (text.trim() === "") return;
  await addDoc(collection(db, "messages"), { senderId: userId, text, timestamp: serverTimestamp() });
  publicMsgForm.reset();
});
function carregarMensagensPublicas() {
  const msgQuery = query(collection(db, "messages"), orderBy("timestamp", "asc"));
  onSnapshot(msgQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        const div = document.createElement("div");
        div.classList.add("chat-message", data.senderId === userId ? "sent" : "received");
        div.innerHTML = `<span class="message-text">${data.text}</span>`;
        publicChatBox.appendChild(div);
        publicChatBox.scrollTop = publicChatBox.scrollHeight;
      }
    });
  });
}

function carregarDmUserList() {
    dmUserList.innerHTML = "";
    const usersQuery = query(collection(db, "users"), where(documentId(), "!=", userId));
    onSnapshot(usersQuery, (snapshot) => {
        snapshot.forEach(doc => {
            const userData = doc.data();
            const userItem = document.createElement('div');
            userItem.classList.add('dm-user-item');
            userItem.innerHTML = userData.name;
            userItem.addEventListener('click', () => {
                abrirChatPrivado(doc.id, userData.name);
            });
            dmUserList.appendChild(userItem);
        });
    });
}
async function abrirChatPrivado(targetUserId, targetName) {
    const chatIds = [userId, targetUserId].sort();
    currentDmId = chatIds.join('_');

    dmUserList.style.display = 'none';
    privateChatBox.style.display = 'flex';
    dmMsgForm.style.display = 'flex';
    privateChatBox.innerHTML = `<h3>Chat com ${targetName}</h3>`;

    const chatMessagesRef = collection(db, "chats", currentDmId, "messages");
    const chatMessagesQuery = query(chatMessagesRef, orderBy("timestamp", "asc"));
    onSnapshot(chatMessagesQuery, (snapshot) => {
        privateChatBox.innerHTML = `<h3>Chat com ${targetName}</h3>`;
        snapshot.forEach(doc => {
            const data = doc.data();
            const div = document.createElement("div");
            div.classList.add("chat-message", data.senderId === userId ? "sent" : "received");
            div.innerHTML = `<span class="message-text">${data.text}</span>`;
            privateChatBox.appendChild(div);
            privateChatBox.scrollTop = privateChatBox.scrollHeight;
        });
    });
}

dmMsgForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = document.getElementById("dmMsgInput").value;
    if (text.trim() === "" || !currentDmId) return;

    await addDoc(collection(db, "chats", currentDmId, "messages"), {
        senderId: userId,
        text,
        timestamp: serverTimestamp()
    });
    dmMsgForm.reset();
});

// ---------- SEGUIR / DEIXAR DE SEGUIR ----------
async function seguirUtilizador(userToFollowId) {
  const userRef = doc(db, "users", userId);
  const userToFollowRef = doc(db, "users", userToFollowId);
  await updateDoc(userRef, { following: arrayUnion(userToFollowId) });
  await updateDoc(userToFollowRef, { followers: arrayUnion(userId) });

  await addDoc(collection(db, "notifications"), {
      message: `O utilizador ${auth.currentUser.email.split('@')[0]} começou a seguir-te.`,
      targetId: userToFollowId,
      createdAt: serverTimestamp(),
      read: false
  });
  carregarPerfil(currentProfileId);
}

async function deixarDeSeguirUtilizador(userToUnfollowId) {
  const userRef = doc(db, "users", userId);
  const userToUnfollowRef = doc(db, "users", userToUnfollowId);
  await updateDoc(userRef, { following: arrayRemove(userToUnfollowId) });
  await updateDoc(userToUnfollowRef, { followers: arrayRemove(userId) });
  carregarPerfil(currentProfileId);
                                }
        
