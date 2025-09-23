import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// SUAS CREDENCIAIS SUPABASE (JÁ INSERIDAS)
const SUPABASE_URL = 'https://nkvmkgzphkrgwdwfgild.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdm1rZ3pwaGtyZ3dkd2ZnaWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Mjg0NDYsImV4cCI6MjA3NDIwNDQ0Nn0.Jf7pXgMKrZC0rr75PXTLi0ywbRbrkvvMV_4_uwVT7YI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CLOUDINARY CONFIG ---
const CLOUDINARY_CLOUD_NAME = 'dya1jd0mx';
const CLOUDINARY_UPLOAD_PRESET = 'Social';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

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
const googleAuthBtn = document.getElementById("googleAuthBtn");

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

// ---------- AUTENTICAÇÃO E INICIALIZAÇÃO ----------
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    userId = session.user.id;
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      alert("Login bem-sucedido!");
    } else {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { name: username }
        }
      });
      if (error) throw error;
      await supabase.from('profiles').insert([
        { id: data.user.id, name: username, email: email, following: [], followers: [] }
      ]);
      alert("Registo bem-sucedido! Verifique o seu email para confirmar.");
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
  await supabase.auth.signOut();
  console.log("Sessão terminada.");
});

// ---------- LOGIN COM GOOGLE ----------
if (googleAuthBtn) {
  googleAuthBtn.addEventListener('click', async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Erro no login com Google:", error);
      alert(`Erro no login com Google: ${error.message}`);
    }
  });
}

// ---------- NOTIFICAÇÕES ----------
notificationBtn.addEventListener("click", () => {
  notificationModal.style.display = "block";
});
closeBtn.addEventListener("click", () => {
  notificationModal.style.display = "none";
});

function carregarNotificacoes() {
  const notifChannel = supabase.channel('notifications_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
      // Logic to handle new notifications
      carregarNotificacoes();
    })
    .subscribe();

  supabase.from('notifications').select('*').eq('targetId', userId).order('createdAt', { ascending: false })
    .then(({ data, error }) => {
      if (error) throw error;
      notificationList.innerHTML = "";
      let unreadCount = 0;
      data.forEach(notif => {
        const div = document.createElement("div");
        div.classList.add("notification-item");
        if (!notif.read) {
          div.classList.add("unread");
          unreadCount++;
        }
        div.innerHTML = `<p>${notif.message}</p>`;
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

    const { error } = await supabase.from('posts').insert([
      { caption, imageUrl, authorId: userId, likes: [], comments: [] }
    ]);
    if (error) throw error;
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
    supabase.from('posts').select('*').order('createdAt', { ascending: false })
        .then(async ({ data: posts, error }) => {
            if (error) throw error;
            feedPosts.innerHTML = "";
            const userIds = posts.map(p => p.authorId);
            const { data: users, error: usersError } = await supabase.from('profiles').select('*').in('id', userIds);
            if (usersError) throw usersError;
            const userMap = new Map(users.map(user => [user.id, user]));

            for (const post of posts) {
                const userData = userMap.get(post.authorId);
                const formattedTime = post.createdAt ? timeSince(new Date(post.createdAt)) : 'agora';
                const div = document.createElement("div");
                div.classList.add("post-card");
                
                const isMyPost = post.authorId === userId;
                
                div.innerHTML = `
                  <div class="post-header">
                      <div class="post-header-left">
                          <img src="${userData?.profilePicUrl || 'https://via.placeholder.com/50'}" class="post-profile-pic" alt="Foto de perfil">
                          <span class="user-name" onclick="mostrarPerfil('${post.authorId}')">${userData?.name || 'Utilizador Desconhecido'}</span>
                      </div>
                      <span class="post-time">${formattedTime}</span>
                      ${isMyPost ? `<button class="delete-post-btn" data-postid="${post.id}">🗑️</button>` : ''}
                  </div>
                  ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="Imagem do post">` : ''}
                  <p class="post-caption">${post.caption}</p>
                  <div class="post-actions">
                      <button class="like-btn" data-postid="${post.id}">
                          ❤️ ${post.likes?.length || 0}
                      </button>
                      <button class="comment-btn" data-postid="${post.id}">
                          💬 Comentar
                      </button>
                  </div>
                  <div class="comments-section" id="comments-${post.id}">
                      ${post.comments.map(c => `<p class="comment-text"><strong>${c.authorId}</strong>: ${c.text}</p>`).join('')}
                  </div>
                `;
                feedPosts.appendChild(div);

                const deleteBtn = div.querySelector('.delete-post-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async () => {
                        if (confirm("Tem certeza que quer apagar esta publicação?")) {
                            await supabase.from('posts').delete().eq('id', post.id);
                        }
                    });
                }

                const commentBtn = div.querySelector(`.comment-btn[data-postid="${post.id}"]`);
                if(commentBtn){
                    commentBtn.addEventListener('click', () => {
                        const commentText = prompt("Escreva o seu comentário:");
                        if (commentText) {
                            supabase.from('posts').update({ comments: [...post.comments, { authorId: userId, text: commentText, timestamp: new Date() }] }).eq('id', post.id)
                                .then(({ error }) => { if (error) console.error(error); });
                        }
                    });
                }
            }
            
            document.querySelectorAll('.like-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const postId = e.currentTarget.dataset.postid;
                    const { data: post, error } = await supabase.from('posts').select('likes').eq('id', postId).single();
                    if (error) { console.error(error); return; }
                    
                    const newLikes = post.likes.includes(userId) ? post.likes.filter(id => id !== userId) : [...post.likes, userId];
                    
                    await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
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
    const expiresAt = new Date().getTime() + 86400000;

    const { error } = await supabase.from('stories').insert([{
      imageUrl: data.secure_url,
      expiresAt: expiresAt,
      authorId: userId
    }]);
    if (error) throw error;
    alert("História publicada!");
  } catch (error) {
    console.error("Erro ao publicar história:", error);
    alert("Erro ao publicar história.");
  }
}

function carregarStories() {
  supabase.from('stories').select('*').order('createdAt', { ascending: false })
    .then(async ({ data: stories, error }) => {
      if (error) throw error;
      storiesBox.innerHTML = "";
      const now = new Date().getTime();
      const uniqueAuthors = new Map();
      const userIds = stories.map(s => s.authorId);
      const { data: users, error: usersError } = await supabase.from('profiles').select('*').in('id', userIds);
      if (usersError) throw usersError;
      const userMap = new Map(users.map(user => [user.id, user]));

      for (const story of stories) {
        if (new Date(story.expiresAt).getTime() > now) {
          if (!uniqueAuthors.has(story.authorId)) {
            const userData = userMap.get(story.authorId);
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
          <img src="${userData?.profilePicUrl || 'https://via.placeholder.com/60'}" alt="História de ${userData?.name}">
          <span class="story-user-name">${userData?.name}</span>
        `;
        div.addEventListener('click', () => {
          alert(`A ver a história de ${userData?.name}: ${userData?.storyUrl}`);
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
  const { data: userData, error } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();

  if (error || !userData) {
    profileHeader.innerHTML = "<p>Utilizador não encontrado.</p>";
    profilePhotos.innerHTML = "";
    return;
  }

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
        <p>Membro desde: ${new Date(supabase.auth.session()?.user?.created_at).toLocaleDateString()}</p>
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
        await supabase.from('profiles').update({ profilePicUrl: url }).eq('id', userId);
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
          await deixarDeSeguirUtilizador(userToFollowId);
        }
      });
    }
  }

  carregarFotosDoUtilizador(targetUserId);
}

async function editarPerfil() {
  const { data: userData, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) return;
  const newName = prompt("Introduza o seu novo nome:", userData.name);
  const newBio = prompt("Introduza a sua nova biografia:", userData.bio);
  
  if (newName !== null && newBio !== null) {
    await supabase.from('profiles').update({ name: newName, bio: newBio }).eq('id', userId);
    carregarPerfil(userId);
  }
}

function carregarFotosDoUtilizador(targetUserId) {
    supabase.from('posts').select('*').eq('authorId', targetUserId).order('createdAt', { ascending: false })
        .then(({ data, error }) => {
            if (error) throw error;
            profilePhotos.innerHTML = "";
            data.forEach((post) => {
                if (post.imageUrl) {
                    const img = document.createElement("img");
                    img.src = post.imageUrl;
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
  const text = document.getElementById("publicMs
