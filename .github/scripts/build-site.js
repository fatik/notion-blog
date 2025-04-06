
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Initialize Notion client with hardcoded values (temporary)
// TODO: Replace with proper authentication when database and user auth are implemented
const NOTION_API_KEY = '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';
const NOTION_DATABASE_ID = '1cbc6697-ec64-8123-bb2d-ff0006d0d592';

const notion = new Client({ 
  auth: NOTION_API_KEY || process.env.NOTION_API_KEY,
  notionVersion: '2022-06-28' // Explicitly set Notion API version
});

const databaseId = NOTION_DATABASE_ID || process.env.NOTION_DATABASE_ID;

// Validate environment variables or use hardcoded values
if (!NOTION_API_KEY && !process.env.NOTION_API_KEY) {
  console.error('Error: NOTION_API_KEY environment variable is not set and no default provided');
  process.exit(1);
}

if (!NOTION_DATABASE_ID && !process.env.NOTION_DATABASE_ID) {
  console.error('Error: NOTION_DATABASE_ID environment variable is not set and no default provided');
  process.exit(1);
}

console.log('Using database ID:', databaseId);

async function fetchBlogPosts() {
    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            filter: {
                property: 'Status',
                select: {
                    equals: 'Published'
                }
            },
            sorts: [
                {
                    property: 'Publish Date',
                    direction: 'descending'
                }
            ]
        });
        
        console.log(`Found ${response.results.length} published posts`);
        return response.results;
    } catch (error) {
        console.error('Error querying Notion database:', error);
        throw error;
    }
}

async function getPageContent(pageId) {
    try {
        const blocks = await notion.blocks.children.list({
            block_id: pageId
        });
        
        return blocks.results;
    } catch (error) {
        console.error(`Error fetching content for page ${pageId}:`, error);
        return [];
    }
}

function convertNotionToHtml(blocks) {
    let html = '';
    
    for (const block of blocks) {
        switch (block.type) {
            case 'paragraph':
                if (block.paragraph.rich_text && block.paragraph.rich_text.length > 0) {
                    html += `<p>${block.paragraph.rich_text.map(text => text.plain_text).join('')}</p>`;
                } else {
                    html += '<p></p>';
                }
                break;
            case 'heading_1':
                if (block.heading_1.rich_text && block.heading_1.rich_text.length > 0) {
                    html += `<h1>${block.heading_1.rich_text.map(text => text.plain_text).join('')}</h1>`;
                }
                break;
            case 'heading_2':
                if (block.heading_2.rich_text && block.heading_2.rich_text.length > 0) {
                    html += `<h2>${block.heading_2.rich_text.map(text => text.plain_text).join('')}</h2>`;
                }
                break;
            case 'heading_3':
                if (block.heading_3.rich_text && block.heading_3.rich_text.length > 0) {
                    html += `<h3>${block.heading_3.rich_text.map(text => text.plain_text).join('')}</h3>`;
                }
                break;
            case 'bulleted_list_item':
                if (block.bulleted_list_item.rich_text && block.bulleted_list_item.rich_text.length > 0) {
                    html += `<ul><li>${block.bulleted_list_item.rich_text.map(text => text.plain_text).join('')}</li></ul>`;
                }
                break;
            case 'numbered_list_item':
                if (block.numbered_list_item.rich_text && block.numbered_list_item.rich_text.length > 0) {
                    html += `<ol><li>${block.numbered_list_item.rich_text.map(text => text.plain_text).join('')}</li></ol>`;
                }
                break;
            case 'image':
                try {
                    const imageUrl = block.image.type === 'external' ? block.image.external.url : block.image.file.url;
                    html += `<img src="${imageUrl}" alt="Image" />`;
                } catch (e) {
                    html += '<p>[Image could not be displayed]</p>';
                }
                break;
            default:
                html += `<div>Unsupported block type: ${block.type}</div>`;
        }
    }
    
    return html;
}

async function buildSite() {
    console.log('Starting site build process...');
    
    // Create _site directory
    if (!fs.existsSync('_site')) {
        fs.mkdirSync('_site');
        console.log('Created _site directory');
    }
    
    if (!fs.existsSync('_site/posts')) {
        fs.mkdirSync('_site/posts');
        console.log('Created _site/posts directory');
    }
    
    // Fetch blog posts from Notion first
    console.log('Fetching blog posts from Notion...');
    const posts = await fetchBlogPosts();
    console.log(`Successfully fetched ${posts.length} posts`);
    
    // Generate post pages
    console.log('Generating post pages...');
    const postsData = [];
    
    for (const post of posts) {
        try {
            // Extract post data with better error handling
            const title = post.properties.Title?.title?.map(t => t.plain_text).join('') || 'Untitled Post';
            
            // Generate a slug if the Slug property doesn't exist or is empty
            let slug;
            if (post.properties.Slug && post.properties.Slug.rich_text && post.properties.Slug.rich_text.length > 0) {
                slug = post.properties.Slug.rich_text.map(t => t.plain_text).join('');
            } else {
                // Generate a slug from the title or use the page ID if no title
                slug = title !== 'Untitled Post' 
                    ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    : post.id.replace(/-/g, '').substring(0, 12);
                console.log(`No slug found for post "${title}", generated: ${slug}`);
            }
            
            // Handle date with fallback
            const date = post.properties['Publish Date']?.date 
                ? new Date(post.properties['Publish Date'].date.start).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) 
                : 'No date';
            
            // Handle excerpt with fallback
            const excerpt = post.properties.Excerpt?.rich_text?.map(t => t.plain_text).join('') || 
                'No excerpt available for this post.';
            
            console.log(`Processing post: ${title} (${slug})`);
            
            // Get post content
            const blocks = await getPageContent(post.id);
            const content = convertNotionToHtml(blocks);
            
            // Create post HTML
            let postHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | My Notion Blog</title>
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <header>
        <h1><a href="../index.html" style="text-decoration: none; color: inherit;">My Notion Blog</a></h1>
    </header>
    <main class="post-content">
        <h1>${title}</h1>
        <div class="date">${date}</div>
        <div class="content">
            ${content}
        </div>
    </main>
    <footer>
        <p>Powered by Notion & GitHub Pages</p>
    </footer>
</body>
</html>`;
            
            // Write post file
            fs.writeFileSync(`_site/posts/${slug}.html`, postHtml);
            console.log(`Created post page: ${slug}.html`);
            
            // Add to posts data for index page
            postsData.push({
                title,
                slug,
                date,
                excerpt
            });
        } catch (error) {
            console.error(`Error processing post ${post.id}:`, error);
        }
    }
    
    // Now create template files with the posts data
    console.log('Creating template files...');
    
    // Create script.js with posts data
    const scriptContent = `
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, found ${postsData.length} posts");
    
    // Display the posts
    const postsContainer = document.getElementById("posts");
    
    if (posts.length === 0) {
        postsContainer.innerHTML = "<p>No blog posts found. Make sure you've published posts in your Notion database.</p>";
        return;
    }
    
    const postsHtml = posts.map(post => \`
        <article>
            <h2><a href="posts/\${post.slug}.html">\${post.title}</a></h2>
            <div class="date">\${post.date}</div>
        </article>
    \`).join("");
    
    postsContainer.innerHTML = postsHtml;
});

// Posts data from Notion
const posts = ${JSON.stringify(postsData, null, 2)};`;
    
    fs.writeFileSync('_site/script.js', scriptContent);
    
    // Create index.html - now with direct post listing as fallback
    const indexHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Notion Blog</title>
        <link rel="stylesheet" href="styles.css">
    </head>
    <body>
        <header>
            <h1>My Notion Blog</h1>
        </header>
        <main class="blog-list">
            <div id="posts">
                <!-- Fallback content if JavaScript is disabled -->
                ${postsData.length === 0 ? '<p>No blog posts found.</p>' : 
                  postsData.map(post => `
                      <article>
                          <h2><a href="posts/${post.slug}.html">${post.title}</a></h2>
                          <div class="date">${post.date}</div>
                          <div class="excerpt">${post.excerpt}</div>
                          <a href="posts/${post.slug}.html" class="read-more">Read more</a>
                      </article>
                  `).join('')}
            </div>
        </main>
        <footer>
            <p>Powered by Notion & GitHub Pages</p>
        </footer>
        <script src="script.js"></script>
    </body>
    </html>`;
    fs.writeFileSync('_site/index.html', indexHtml);
    
    // Create styles.css
    const cssContent = `
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #37352f;
    max-width: 720px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
}

header {
    margin-bottom: 40px;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 20px;
}

h1 {
    font-weight: 700;
    font-size: 40px;
}

.blog-list article {
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.blog-list h2 {
    margin-bottom: 10px;
}

.blog-list .date {
    color: #888;
    font-size: 14px;
    margin-bottom: 10px;
}

.blog-list .excerpt {
    margin-bottom: 15px;
}

.blog-list .read-more {
    display: inline-block;
    padding: 5px 15px;
    background-color: #f7f6f3;
    color: #37352f;
    text-decoration: none;
    border-radius: 3px;
    font-size: 14px;
}

.blog-list .read-more:hover {
    background-color: #eae9e5;
}

.post-content {
    line-height: 1.8;
}

.post-content h1, .post-content h2, .post-content h3 {
    margin-top: 30px;
    margin-bottom: 15px;
}

.post-content p {
    margin-bottom: 20px;
}

.post-content img {
    max-width: 100%;
    margin: 20px 0;
}

.post-content blockquote {
    border-left: 3px solid #e0e0e0;
    padding-left: 20px;
    margin-left: 0;
    color: #666;
}

footer {
    margin-top: 50px;
    text-align: center;
    color: #888;
    font-size: 14px;
}`;
    fs.writeFileSync('_site/styles.css', cssContent);
    
    console.log('Created template files');
    console.log(`Built site with ${postsData.length} posts`);
}

// Run the build process
buildSite().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
});
