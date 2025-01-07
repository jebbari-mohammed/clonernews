const url = 'https://hacker-news.firebaseio.com/v0'

const existedItem = new Set()

async function getMaxItemId() {
    try {
        const response = await fetch(`${url}/maxitem.json`)
        if (!response.ok) {
            throw new Error('network response was not ok')
        }
        const maxId = await response.json()
        return maxId
    } catch (error) {
        console.error('error fetching the max item id : ', error);
        return
    }
}

async function fetchItem(id) {
    try {
        const response = await fetch(`${url}/item/${id}.json`)
        if (!response.ok) {
            throw new Error('network response was not ok')
        }

        const item = await response.json();
        return item;

    } catch (error) {
        console.error('error fetching item', error);
        return
    }
}

async function loadData() {
    const maxId = await getMaxItemId()

    if (!maxId) return

    for (let i = maxId; i > 0; i--) {
        if (!existedItem.has(i)) {
            const post = await fetchItem(i);

            if (post && (post.type === 'story' || post.type === 'poll' || post.type === 'job')) {
                existedItem.add(i);

                const newDiv = document.createElement('div');
                newDiv.className = 'post';
                newDiv.dataset.id = post.id;
                newDiv.innerHTML = `
                <a href="${post.url || `https://news.ycombinator.com/item?id=${post.id}`}" class="post-title" target="_blank"><h3>${post.title}</h3></a>
                <p>Type: ${post.type}</p>
                   <div> 
                        ${post.text ? `<p>${post.text}</p>` : ''}
                        <p>Posted by: ${post.by || 'Anonymous'}</p>
                    </div>
                   <div class="comments" id="comments-${post.id}"></div>
               `;

                document.getElementById('posts-container').appendChild(newDiv);
            }
        }
    }
}

loadData()
