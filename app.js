// Глобальные переменные
let currentUser = null;
let viewingProfile = null;

// Инициализация
window.onload = () => {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      loadMainScreen();
    }
  });
};

// Авторизация
function toggleAuthForm() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const toggleText = document.getElementById('toggle-text');
  
  if (loginForm.style.display === 'none') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    toggleText.textContent = 'Нет норки? Зарегистрируйся!';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    toggleText.textContent = 'Уже есть норка? Войди!';
  }
}

function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const bio = document.getElementById('reg-bio').value;
  
  if (!username || !password) {
    alert('Заполни имя и пароль!');
    return;
  }
  
  alert('Пытаюсь зарегистрировать: ' + username);
  
  const email = `${username}@capyspace.com`;
  
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      alert('Аккаунт создан! UID: ' + user.uid);
      
      return db.ref('users/' + user.uid).set({
        username: username,
        bio: bio,
        avatar: '🦫',
        followers: 0,
        following: 0,
        posts: 0
      });
    })
    .then(() => {
      alert('Профиль сохранён! Сейчас загрузим ленту...');
    })
    .catch((error) => {
      alert('ОШИБКА: ' + error.message);
    });
}

function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  if (!username || !password) {
    alert('Заполни все поля!');
    return;
  }
  
  const email = `${username}@capyspace.com`;
  
  firebase.auth().signInWithEmailAndPassword(email, password)
    .catch((error) => {
      alert('Ошибка: ' + error.message);
    });
}

function logout() {
  firebase.auth().signOut();
  currentUser = null;
  showAuthScreen();
}

// Загрузка основного экрана
function loadMainScreen() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('main-screen').classList.add('active');
  
  loadUserProfile();
  loadFeed();
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('main-screen').classList.remove('active');
}

// Загрузка профиля
function loadUserProfile() {
  db.ref('users/' + currentUser.uid).once('value')
    .then((snapshot) => {
      const userData = snapshot.val();
      document.getElementById('profile-avatar').textContent = userData.avatar || '🦫';
      document.getElementById('profile-name').textContent = userData.username;
      document.getElementById('profile-bio').textContent = userData.bio || '';
      document.getElementById('posts-count').textContent = userData.posts || 0;
      document.getElementById('subs-count').textContent = userData.following || 0;
      document.getElementById('current-user').textContent = userData.username;
    });
}

// Создание поста
function createPost() {
  const content = document.getElementById('post-content').value;
  const imageFile = document.getElementById('image-upload').files[0];
  
  if (!content && !imageFile) {
    alert('Напиши что-нибудь или добавь фото!');
    return;
  }
  
  const postRef = db.ref('posts').push();
  const postData = {
    userId: currentUser.uid,
    username: document.getElementById('profile-name').textContent,
    avatar: document.getElementById('profile-avatar').textContent,
    content: content,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    likes: 0,
    comments: 0
  };
  
  if (imageFile) {
    const storageRef = storage.ref('posts/' + postRef.key);
    storageRef.put(imageFile).then((snapshot) => {
      snapshot.ref.getDownloadURL().then((url) => {
        postData.imageUrl = url;
        postRef.set(postData);
        
        db.ref('users/' + currentUser.uid + '/posts')
          .transaction((posts) => (posts || 0) + 1);
        
        document.getElementById('post-content').value = '';
        document.getElementById('image-upload').value = '';
        document.getElementById('image-preview').innerHTML = '';
      });
    });
  } else {
    postRef.set(postData);
    
    db.ref('users/' + currentUser.uid + '/posts')
      .transaction((posts) => (posts || 0) + 1);
    
    document.getElementById('post-content').value = '';
  }
}

// Загрузка ленты
function loadFeed() {
  const feedElement = document.getElementById('posts-feed');
  
  db.ref('posts').orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
    feedElement.innerHTML = '';
    const posts = [];
    snapshot.forEach((child) => {
      posts.unshift({ id: child.key, ...child.val() });
    });
    
    posts.forEach((post) => {
      displayPost(post);
    });
  });
}

// Отображение поста
function displayPost(post) {
  const feedElement = document.getElementById('posts-feed');
  const postElement = document.createElement('div');
  postElement.className = 'post';
  postElement.id = `post-${post.id}`;
  
  const time = new Date(post.timestamp).toLocaleString('ru-RU');
  
  postElement.innerHTML = `
    <div class="post-header">
      <span class="post-avatar">${post.avatar}</span>
      <div>
        <span class="post-user">${post.username}</span>
        <div class="post-time">${time}</div>
      </div>
    </div>
    <div class="post-text">${post.content || ''}</div>
    ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image">` : ''}
    <div class="post-actions-bar">
      <button class="like-btn ${isLiked(post.id) ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
        ❤️ <span id="likes-${post.id}">${post.likes || 0}</span>
      </button>
      <button class="comment-btn" onclick="toggleComments('${post.id}')">
        💬 <span>${post.comments || 0}</span>
      </button>
    </div>
    <div class="comments-section" id="comments-${post.id}" style="display:none;">
      <div id="comments-list-${post.id}"></div>
      <div class="comment-input">
        <input type="text" id="comment-input-${post.id}" placeholder="Написать комментарий...">
        <button onclick="addComment('${post.id}')">Отправить</button>
      </div>
    </div>
  `;
  
  feedElement.insertBefore(postElement, feedElement.firstChild);
}

// Лайки
let userLikes = new Set();

function isLiked(postId) {
  return userLikes.has(postId);
}

function toggleLike(postId) {
  const likesRef = db.ref('posts/' + postId + '/likes');
  
  if (isLiked(postId)) {
    userLikes.delete(postId);
    likesRef.transaction((likes) => (likes || 0) - 1);
  } else {
    userLikes.add(postId);
    likesRef.transaction((likes) => (likes || 0) + 1);
  }
  
  const likeBtn = document.querySelector(`#post-${postId} .like-btn`);
  likeBtn.classList.toggle('liked');
}

// Комментарии
function toggleComments(postId) {
  const commentsSection = document.getElementById(`comments-${postId}`);
  const isVisible = commentsSection.style.display !== 'none';
  
  if (isVisible) {
    commentsSection.style.display = 'none';
  } else {
    commentsSection.style.display = 'block';
    loadComments(postId);
  }
}

function loadComments(postId) {
  const commentsList = document.getElementById(`comments-list-${postId}`);
  
  db.ref('comments/' + postId).on('value', (snapshot) => {
    commentsList.innerHTML = '';
    const comments = [];
    snapshot.forEach((child) => {
      comments.push({ id: child.key, ...child.val() });
    });
    
    comments.forEach((comment) => {
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.innerHTML = `
        <span class="comment-user">${comment.username}</span>
        <span>${comment.text}</span>
      `;
      commentsList.appendChild(commentElement);
    });
  });
}

function addComment(postId) {
  const commentInput = document.getElementById(`comment-input-${postId}`);
  const text = commentInput.value;
  
  if (!text) return;
  
  const commentRef = db.ref('comments/' + postId).push();
  commentRef.set({
    userId: currentUser.uid,
    username: document.getElementById('profile-name').textContent,
    text: text,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });
  
  db.ref('posts/' + postId + '/comments')
    .transaction((comments) => (comments || 0) + 1);
  
  commentInput.value = '';
}

// Поиск пользователей
function searchUsers() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const resultsContainer = document.getElementById('search-results');
  
  if (searchTerm.length < 2) {
    resultsContainer.innerHTML = '';
    return;
  }
  
  db.ref('users').once('value')
    .then((snapshot) => {
      resultsContainer.innerHTML = '';
      snapshot.forEach((child) => {
        const user = child.val();
        if (user.username.toLowerCase().includes(searchTerm)) {
          const resultElement = document.createElement('div');
          resultElement.className = 'search-result';
          resultElement.innerHTML = `
            <span style="font-size: 30px; margin-right: 10px;">${user.avatar || '🦫'}</span>
            <span>${user.username}</span>
          `;
          resultElement.onclick = () => showUserProfile(child.key);
          resultsContainer.appendChild(resultElement);
        }
      });
    });
}

// Просмотр профиля
function showUserProfile(userId) {
  viewingProfile = userId;
  const modal = document.getElementById('profile-modal');
  
  db.ref('users/' + userId).once('value')
    .then((snapshot) => {
      const user = snapshot.val();
      document.getElementById('modal-avatar').textContent = user.avatar || '🦫';
      document.getElementById('modal-name').textContent = user.username;
      document.getElementById('modal-bio').textContent = user.bio || '';
      document.getElementById('modal-posts').textContent = user.posts || 0;
      document.getElementById('modal-followers').textContent = user.followers || 0;
      
      const followBtn = document.getElementById('follow-btn');
      if (userId === currentUser.uid) {
        followBtn.style.display = 'none';
      } else {
        followBtn.style.display = 'inline-block';
        checkIfFollowing(userId);
      }
    });
  
  loadUserPosts(userId);
  modal.style.display = 'block';
}

function checkIfFollowing(userId) {
  db.ref('followers/' + currentUser.uid + '/' + userId).once('value')
    .then((snapshot) => {
      const followBtn = document.getElementById('follow-btn');
      if (snapshot.exists()) {
        followBtn.textContent = 'Отписаться 💔';
      } else {
        followBtn.textContent = 'Подписаться 💕';
      }
    });
}

function toggleFollow() {
  if (!viewingProfile || viewingProfile === currentUser.uid) return;
  
  const followRef = db.ref('followers/' + currentUser.uid + '/' + viewingProfile);
  
  followRef.once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        followRef.remove();
        db.ref('users/' + viewingProfile + '/followers')
          .transaction((followers) => (followers || 0) - 1);
        db.ref('users/' + currentUser.uid + '/following')
          .transaction((following) => (following || 0) - 1);
      } else {
        followRef.set(true);
        db.ref('users/' + viewingProfile + '/followers')
          .transaction((followers) => (followers || 0) + 1);
        db.ref('users/' + currentUser.uid + '/following')
          .transaction((following) => (following || 0) + 1);
      }
      
      showUserProfile(viewingProfile);
    });
}

function loadUserPosts(userId) {
  const modalFeed = document.getElementById('modal-posts-feed');
  
  db.ref('posts').orderByChild('userId').equalTo(userId).on('value', (snapshot) => {
    modalFeed.innerHTML = '';
    const posts = [];
    snapshot.forEach((child) => {
      posts.push({ id: child.key, ...child.val() });
    });
    
    posts.reverse().forEach((post) => {
      const postElement = document.createElement('div');
      postElement.className = 'post';
      postElement.innerHTML = `
        <div class="post-text">${post.content || ''}</div>
        ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image">` : ''}
        <div class="post-time">${new Date(post.timestamp).toLocaleString('ru-RU')}</div>
      `;
      modalFeed.appendChild(postElement);
    });
  });
}

function closeProfile() {
  document.getElementById('profile-modal').style.display = 'none';
  viewingProfile = null;
}

function editProfile() {
  const newBio = prompt('Расскажи о себе:', document.getElementById('profile-bio').textContent);
  if (newBio !== null) {
    db.ref('users/' + currentUser.uid + '/bio').set(newBio);
    loadUserProfile();
  }
}

// Предпросмотр изображения
document.getElementById('image-upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('image-preview').innerHTML = 
        `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  }
});

// Закрытие модального окна
window.onclick = (event) => {
  const modal = document.getElementById('profile-modal');
  if (event.target === modal) {
    closeProfile();
  }
};
