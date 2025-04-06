# My Notion Blog

This repository contains a blog that automatically syncs content from Notion and publishes it to GitHub Pages.

## View the Site

Visit the live site at: https://fatik.github.io/notion-blog/

## How it Works

1. Content is managed in a Notion database
2. GitHub Actions runs every 6 hours to fetch content from Notion
3. The fetched content is built into static HTML pages
4. The built site is automatically deployed to the main branch
5. GitHub Pages serves the content from the main branch

## Manual Deployment

To manually trigger a sync from Notion, go to the Actions tab in this repository and run the "Sync Notion to GitHub Pages" workflow.

## Repository Structure

- Main branch: Contains both the source code and the built static site that is served by GitHub Pages
