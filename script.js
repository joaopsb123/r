import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, setDoc, where, getDocs, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const provider = new GoogleAuthProvider();

// --- CONFIGURAÇÃO DO CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = 'dya1jd0mx';
const CLOUDINARY_UPLOAD_PRESET = 'Social';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;
// --- FIM DA CONFIGURAÇÃO ---

let userId;
let currentProfileId;
let currentDmId = null;
let allUsers = [];

// ---------- UI ELEMENTS ----------
const authSection = document.getElementById("auth");
const appSection = document.getElementById("app");
const authForm = document.getElementById("authForm");
const usernameInput = document.getElementById("username");
const authBtn = document.getElementById("authBtn");
const toggleAuthLink = document.getElementById("toggleAuth");
const logoutBtn = document.getElementById("logoutBtn");
const notificationBtn = document.getElementById("notificationBtn");
const notificationModal = document.getElementById("notificationModal");
const notificationList = document.getElementById("notificationList");
const closeBtn = document.querySelector(".close-btn");
const notificationCount = document.getElementById("notificationCount");
const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");
const profileHeader = document.getElementById("profileHeader");
const profilePhotos = document.getElementById("profilePhotos");
const publicChatBtn = document.getElementById("publicChatBtn");
const dmsBtn = document.getElementById("dmsBtn");
const publicChatContainer = document.getElementById("publicChat");
const dmsContainer = document.getElementById("dms");
const publicChatBox = document.getElementById("publicChatBox");
const publicMsgForm = document.getElementById("publicMsgForm");
const dmUserList = document.getElementById("dmUserList");
const privateChatBox = document.getElementById("privateChat");
const dmMsgForm = document.getElementById("dmMsgForm");
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");
const storiesBox = document.getElementById("storiesBox");
const lightThemeBtn = document.getElementById("lightThemeBtn");
const darkThemeBtn = document.getElementById("darkThemeBtn");
const wallpaperInput = document.getElementById("wallpaperInput");
const clearWallpaperBtn = document.getElementById("clearWallpaperBtn");
const googleAuthBtn = document.getElementById("googleAuthBtn"); // Novo elemento

let isLoginMode = true;

// ---------- TEMA E CONFIGURAÇÕES ----------
function aplicarTema(tema) {
  document.body.className = `${tema}-theme`;
  localStorage.setItem('theme', tema);
}

function carregarTema() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  aplicarTema(savedTheme);
}

function aplicarWallpaper(url) {
  document.body.style.backgroundImage = url ? `url(${url})` : '';
  localStorage.setItem('wallpaper', url || '');
}

function carregarWallpaper() {
  const savedWallpaper = localStorage.getItem('wallpaper');
  aplicarWallpaper(savedWallpaper);
}

lightThemeBtn.addEventListener('click', () => aplicarTema('light'));
darkThemeBtn.addEventListener('click', () => aplicarTema('dark'));
wallpaperInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await response.json();
    aplicarWallpaper(data.secure_url);
  }
});
clearWallpaperBtn.addEventListener('click', () => aplicarWallpaper(null));

// ---------- AUTENTICAÇÃO E INICIALIZAÇÃO ----------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userId = user.uid;
    console.log("Utilizador autenticado:", userId);
    authSection.style.display = "none";
    appSection.style.display = "block";
    currentProfileId = userId;
    
    carregarTema();
    carregarWallpaper();
    carregarFeed();
    carregarMensagensPublicas();
    carregarStories();
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
  const username = usernameInput.value;

  try {
    if (isLoginMode) {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login bem-sucedido!");
    } else {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: username,
        email: email,
        bio: "",
        profilePicUrl: null,
        following: [],
        followers: []
      });
      alert("Registo bem-sucedido!");
    }
  } catch (error) {
    console.error("Erro de autenticação:", error.message);
    alert(`Erro de autenticação: ${error.message}`);
  }
});

toggleAuthLink.addEventListener("click", (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  usernameInput.style.display = isLoginMode ? "none" : "block";
  authBtn.textContent = isLoginMode ? "Entrar" : "Criar conta";
  toggleAuthLink.textContent = isLoginMode ? "Criar conta" : "Entrar";
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  console.log("Sessão terminada.");
});

// ---------- LOGIN COM GOOGLE ----------
if (googleAuthBtn) {
  googleAuthBtn.addEventListener('click', async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          name: user.displayName,
          email: user.email,
          profilePicUrl: user.photoURL,
          bio: "",
          following: [],
          followers: []
        });
      }

      alert("Login com Google bem-sucedido!");
    } catch (error) {
      console.error("Erro no login com Google:", error);
      alert(`Erro no login com Google: ${error.message}`);
    }
  });
}
// ----------------------------------------

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

// ---------- FEED & POSTS ----------
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const caption = document.getElementById("caption").value;
  const imageFile = document.getElementById("postImage").files[0];
  if (!caption && !imageFile) return;

  try {
    let imageUrl = null;
    if (imageFile) {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
      const data = await response.json();
      imageUrl = data.secure_url;
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

function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " anos atrás";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " meses atrás";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " dias atrás";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " horas atrás";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutos atrás";
  return Math.floor(seconds) + " segundos atrás";
}

function carregarFeed() {
  const feedQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(feedQuery, async snapshot => {
    feedPosts.innerHTML = "";
    const userMap = new Map();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let userData = userMap.get(data.authorId);
      if (!userData) {
        const userDoc = await getDoc(doc(db, "users", data.authorId));
        userData = userDoc.data();
        userMap.set(data.authorId, userData);
      }
      const formattedTime = data.createdAt ? timeSince(new Date(data.createdAt.seconds * 1000)) : 'agora';
      const div = document.createElement("div");
      div.classList.add("post-card");
      
      const isMyPost = data.authorId === userId;
      
      div.innerHTML = `
        <div class="post-header">
          <div class="post-header-left">
            <img src="${userData.profilePicUrl || 'https://via.placeholder.com/50'}" class="post-profile-pic" alt="Foto de perfil">
            <span class="user-name" onclick="mostrarPerfil('${data.authorId}')">${userData.name}</span>
          </div>
          <span class="post-time">${formattedTime}</span>
          ${isMyPost ? `<button class="delete-post-btn" data-postid="${doc.id}">🗑️</button>` : ''}
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
        <div class="comments-section" id="comments-${doc.id}">
          ${data.comments.map(c => `<p class="comment-text"><strong>${c.authorId}</strong>: ${c.text}</p>`).join('')}
        </div>
      `;
      feedPosts.appendChild(div);

      const deleteBtn = div.querySelector('.delete-post-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          if (confirm("Tem certeza que quer apagar esta publicação?")) {
            await deleteDoc(doc(db, "posts", doc.id));
          }
        });
      }

      const commentBtn = div.querySelector(`.comment-btn[data-postid="${doc.id}"]`);
      if(commentBtn){
        commentBtn.addEventListener('click', () => {
          const commentText = prompt("Escreva o seu comentário:");
          if (commentText) {
            const postRef = doc(db, "posts", doc.id);
            updateDoc(postRef, {
              comments: arrayUnion({ authorId: userId, text: commentText, timestamp: serverTimestamp() })
            });
          }
        });
      }
    });
    
    document.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const postId = e.currentTarget.dataset.postid;
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, { likes: arrayUnion(userId) });
      });
    });
  });
}

// ---------- STORIES ----------
async function uploadStory(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await response.json();
    const expiresAt = new Date().getTime() + 86400000; // 24 horas em milisegundos

    await addDoc(collection(db, "stories"), {
      imageUrl: data.secure_url,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt,
      authorId: userId
    });
    alert("História publicada!");
  } catch (error) {
    console.error("Erro ao publicar história:", error);
    alert("Erro ao publicar história.");
  }
}

function carregarStories() {
  const storiesQuery = query(collection(db, "stories"), orderBy("createdAt", "desc"));
  onSnapshot(storiesQuery, async (snapshot) => {
    storiesBox.innerHTML = "";
    const now = new Date().getTime();
    const uniqueAuthors = new Map();

    for (const d of snapshot.docs) {
      const story = d.data();
      if (story.expiresAt > now) {
        if (!uniqueAuthors.has(story.authorId)) {
          const userDoc = await getDoc(doc(db, "users", story.authorId));
          const userData = userDoc.data();
          uniqueAuthors.set(story.authorId, {
            ...userData,
            storyUrl: story.imageUrl
          });
        }
      }
    }

    uniqueAuthors.forEach((userData, authorId) => {
      const div = document.createElement("div");
      div.classList.add("story-item");
      div.innerHTML = `
        <img src="${userData.profilePicUrl || 'https://via.placeholder.com/60'}" alt="História de ${userData.name}">
        <span class="story-user-name">${userData.name}</span>
      `;
      div.addEventListener('click', () => {
        alert(`A ver a história de ${userData.name}: ${userData.storyUrl}`);
      });
      storiesBox.appendChild(div);
    });
  });
}

// ---------- PERFIL (COMPLETO) ----------
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
    photoUploader.innerHTML = `
        <div class="profile-upload-container">
            <h3>Carregar foto de perfil</h3>
            <input type="file" id="profilePicInput" accept="image/*">
            <button id="uploadStoryBtn">Publicar História</button>
        </div>
    `;
    profileHeader.appendChild(photoUploader);
    
    document.getElementById('profilePicInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await response.json();
        const url = data.secure_url;
        await updateDoc(doc(db, "users", userId), { profilePicUrl: url });
        carregarPerfil(userId);
      }
    });

    document.getElementById('uploadStoryBtn').addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                uploadStory(e.target.files[0]);
            }
        };
        fileInput.click();
    });

  } else {
    const followBtn = document.querySelector('.follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', async (e) => {
        const userToFollowId = e.target.dataset.userid;
        if (e.target.textContent === 'Seguir') {
          await seguirUtilizador(userToFollowId);
        } else {
          // AQUI ESTÁ A CORREÇÃO
          await deixarDeSeguirUtilizador(userToFollowId);
        }
      });
    }
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
    await updateDoc(userRef, { name: newName, bio: newBio });
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
publicChatBtn.addEventListener('click', () => {
    publicChatBtn.classList.add('active');
    dmsBtn.classList.remove('active');
    publicChatContainer.classList.add('active');
    dmsContainer.classList.remove('active');
});
dmsBtn.addEventListener('click', () => {
    dmsBtn.classList.add('active');
    publicChatBtn.classList.remove('active');
    publicChatContainer.classList.remove('active');
    dmsContainer.classList.add('active');
});

publicMsgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = document.getElementById("public
