// Quick script to add sample posts with images
// Run with: node add-sample-posts.js

const fetch = require('node-fetch');

const API_URL = 'http://172.20.10.9:5000';

const samplePosts = [
    {
        content: "Just saw the most beautiful sunset on campus! 🌅 Sometimes you just need to stop and appreciate the little things.",
        category: "wholesome",
        mediaUrl: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&q=80",
        mediaType: "image"
    },
    {
        content: "When the professor says 'this will be on the exam' but you were too busy scrolling 😭",
        category: "confession",
        mediaUrl: "https://images.unsplash.com/photo-1516534775068-ba3e7458af70?w=800&q=80",
        mediaType: "image"
    },
    {
        content: "Coffee: because adulting is hard ☕️ #StudentLife",
        category: "rant",
        mediaUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
        mediaType: "image"
    },
    {
        content: "Found this little guy studying in the library with me 📚🐱",
        category: "wholesome",
        mediaUrl: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80",
        mediaType: "image"
    },
    {
        content: "That feeling when you finally understand the lecture... 3 weeks later 🤯",
        category: "hot-take",
        mediaUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
        mediaType: "image"
    }
];

async function createSamplePosts() {
    console.log('Creating sample posts with images...\n');

    for (let i = 0; i < samplePosts.length; i++) {
        const post = samplePosts[i];

        try {
            const response = await fetch(`${API_URL}/api/confessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...post,
                    // Using a default test user
                    authorId: 'test-user-' + Math.random().toString(36).substr(2, 9),
                    authorAlias: ['Alex', 'Sam', 'Jordan', 'Casey', 'Riley'][i % 5],
                    authorKarma: Math.floor(Math.random() * 500),
                    authorAvatarIndex: i % 10,
                    isAnonymous: true
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✓ Created: "${post.content.substring(0, 50)}..."`);
            } else {
                console.log(`✗ Failed: ${response.statusText}`);
            }
        } catch (error) {
            console.error(`✗ Error creating post: ${error.message}`);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n✓ Done! Refresh your app to see the posts with images.');
}

createSamplePosts();
