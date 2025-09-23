// A simple array to simulate a database of posts
const posts = [];

// Get references to the HTML elements we'll interact with
const postForm = document.getElementById('post-form');
const postCaptionInput = document.getElementById('post-caption');
const postImageInput = document.getElementById('post-image');
const feedContainer = document.getElementById('feed-container');

// A function to create and render a single post
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');

    postDiv.innerHTML = `
        <img class="post-image" src="${post.imageUrl}" alt="Post image">
        <div class="post-content">
            <p class="post-caption">${post.caption}</p>
            <div class="post-actions">
                <button class="like-button">❤️</button>
                <span class="like-count">${post.likes} likes</span>
            </div>
        </div>
    `;

    // Add a click event listener to the like button
    const likeButton = postDiv.querySelector('.like-button');
    likeButton.addEventListener('click', () => {
        post.likes++;
        postDiv.querySelector('.like-count').textContent = `${post.likes} likes`;
    });

    return postDiv;
}

// A function to render all posts from the 'posts' array
function renderPosts() {
    feedContainer.innerHTML = ''; // Clear the current feed
    posts.forEach(post => {
        feedContainer.prepend(createPostElement(post)); // Add new posts to the top
    });
}

// Handle the form submission to add a new post
postForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent the form from refreshing the page

    const newPost = {
        caption: postCaptionInput.value,
        imageUrl: postImageInput.value,
        likes: 0
    };

    posts.push(newPost);
    renderPosts(); // Re-render the feed to show the new post

    // Clear the form inputs
    postCaptionInput.value = '';
    postImageInput.value = '';
});

// Initial render to show any "pre-existing" posts (none in this case, but good practice)
renderPosts();

