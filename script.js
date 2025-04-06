
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, found 2 posts");
    
    // Display the posts
    const postsContainer = document.getElementById("posts");
    
    if (posts.length === 0) {
        postsContainer.innerHTML = "<p>No blog posts found. Make sure you've published posts in your Notion database.</p>";
        return;
    }
    
    const postsHtml = posts.map(post => `
        <article>
            <h2><a href="posts/${post.slug}.html">${post.title}</a></h2>
            <div class="date">${post.date}</div>
        </article>
    `).join("");
    
    postsContainer.innerHTML = postsHtml;
});

// Posts data from Notion
const posts = [
  {
    "title": "gen debt",
    "slug": "gen-debt",
    "date": "April 6, 2025",
    "excerpt": "No excerpt available for this post."
  },
  {
    "title": "todo modo",
    "slug": "yo",
    "date": "April 4, 2025",
    "excerpt": "No excerpt available for this post."
  }
];