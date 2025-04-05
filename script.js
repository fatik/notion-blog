
// This script will be updated by the GitHub Actions workflow
// with real data from your Notion database

document.addEventListener("DOMContentLoaded", () => {
    // Display the posts that are populated by the GitHub Actions workflow
    const postsContainer = document.getElementById("posts");
    
    if (posts.length === 0) {
        postsContainer.innerHTML = "<p>No blog posts found. Make sure you've published posts in your Notion database.</p>";
        return;
    }
    
    const postsHtml = posts.map(post => `
        <article>
            <h2><a href="posts/${post.slug}.html">${post.title}</a></h2>
            <div class="date">${post.date}</div>
            <div class="excerpt">${post.excerpt}</div>
            <a href="posts/${post.slug}.html" class="read-more">Read more</a>
        </article>
    `).join("");
    
    postsContainer.innerHTML = postsHtml;
});

// This posts array will be replaced with actual data from Notion
// by the GitHub Actions workflow
const posts = [];