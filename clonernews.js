const content = document.getElementById('content');
let ids, current, lastNewsId, lastJobId;

async function buildPage() {
    document.getElementById('newsButton').addEventListener('click', () => { loadPosts('newstories'); });
    document.getElementById('jobsButton').addEventListener('click', () => { loadPosts('jobstories'); });
    document.getElementById('pollsButton').addEventListener('click', () => { pollDemo(); });

    loadPosts('newstories');
    await fetch('https://hacker-news.firebaseio.com/v0/jobstories.json')
        .then(async response => response.json())
        .then(resp => { lastJobId = resp[0]; });

    setInterval(lookForNewPost, 5000);
}

async function pollDemo() {
    content.innerHTML = '';
    current = '';
    const poll = await loadItem(126809);

    const pollDiv = document.createElement('div');
    pollDiv.classList = 'post';
    content.append(pollDiv);
    buildPostDiv(poll, pollDiv);
    const partContainer = document.createElement('div');
    pollDiv.insertBefore(partContainer, pollDiv.lastChild);

    poll.parts.forEach((id) => {
        const partDiv = document.createElement('div');
        partContainer.append(partDiv);
        partDiv.classList = 'pollOpt';
        loadItem(id).then(resp => { buildPollOpt(resp, partDiv); }).catch((err) => { console.log("can't find poll part : " + err); });
    });
}

function buildPollOpt(data, div) {
    div.innerText = '  =>' + data.text + ' (' + data.score + ')';
}

async function loadPosts(url) {
    if (current == url) {
        return;
    }
    current = url;

    ids = await fetch('https://hacker-news.firebaseio.com/v0/' + url + '.json')
        .then(async response => response.json());

    if (current == 'newstories') {
        lastNewsId = ids[0];
    }
    if (current == 'jobstories') {
        lastJobId = ids[0];
    }

    content.innerHTML = '';
    let postIds = ids.slice(0, 10);

    postIds.forEach((id) => {
        const newDiv = document.createElement('div');
        content.append(newDiv);
        newDiv.classList = 'post';
        newDiv.setAttribute('id', 'postid-' + id);
        loadItem(id).then(resp => { buildPostDiv(resp, newDiv); }).catch(err => { newDiv.innerHTML = 'failed to load post ' + id; });
    });

    let total = 10;
    const loadPostButton = document.createElement('button');
    loadPostButton.classList = 'moreButton';
    loadPostButton.innerText = 'More';
    content.append(loadPostButton);
    loadPostButton.addEventListener('click', () => {
        addPosts(ids, total, loadPostButton);
        total += 10;
        if (total >= ids.length) {
            loadPostButton.remove();
        }
    });
}

async function addPosts(ids, total, div) {
    ids.slice(total, total + 10).forEach((id) => {
        const newDiv = document.createElement('div');
        div.parentNode.insertBefore(newDiv, div);
        newDiv.classList = 'post';
        newDiv.setAttribute('id', 'postid-' + id);
        loadItem(id).then(resp => { buildPostDiv(resp, newDiv); }).catch(err => { newDiv.innerHTML = 'failed to load post ' + id; });
    });
}

async function loadItem(id) {
    const response = await fetch('https://hacker-news.firebaseio.com/v0/item/' + id + '.json');
    const data = await response.json();
    console.log('Fetched data for ID:', id, data);
    return data;
}

function buildPostDiv(data, div) {
    if (data.deleted) {
        div.innerHTML = '[DELETED]';
        return;
    }

    div.innerHTML = `
        <p class="postTitle">Title: ${data.title || 'No Title'}</p>
        <p class="postAuthor">By: ${data.by || 'Unknown'}</p>
        <p class="postDate">At: ${tToS(data.time)}</p>
    `;

    if (data.text && data.text !== '') {
        div.innerHTML += `<p class="postText">${data.text}</p>`;
    }
    if (data.url && data.url !== '') {
        div.innerHTML += `<a class="postUrl" href="${data.url}">Link</a>`;
    }

    div.append(buildCommentButton(data.kids));
}

function buildCommentButton(ids) {
    const res = document.createElement('div');
    res.classList = 'commentContainer';
    const loadComments = document.createElement('button');
    const comments = document.createElement('div');
    res.append(loadComments);
    res.append(comments);
    loadComments.innerText = 'Show comments';
    loadComments.setAttribute('data-isloaded', false);

    let totalComments = 0;
    loadComments.addEventListener('click', async (e) => {
        if (loadComments.getAttribute('data-isloaded') === "true") {
            loadComments.innerText = "Show comments";
            loadComments.setAttribute('data-isloaded', false);
            comments.innerHTML = '';
        } else {
            loadComments.innerText = "Hide comments";
            loadComments.setAttribute('data-isloaded', true);

            if (!ids) {
                comments.innerHTML = '<div>No comments</div>';
            } else {
                comments.innerHTML = '';
                const commentContainer = document.createElement('div');
                comments.append(commentContainer);
                addComments(ids, 0, commentContainer);
                totalComments = Math.min(10, ids.length);
                if (totalComments == 10 && ids.length != 10) {
                    const button = document.createElement('button');
                    button.innerText = 'More';
                    commentContainer.append(button);
                    button.addEventListener('click', () => {
                        addComments(ids, totalComments, button, true);
                        if (totalComments + 10 >= ids.length) {
                            button.remove();
                        } else {
                            totalComments += 10;
                        }
                    });
                }
            }
        }
    });
    return res;
}

async function addComments(ids, total, div, insertBefore) {
    ids.slice(total, total + 10).forEach((id) => {
        const newDiv = document.createElement('div');
        if (insertBefore) {
            div.parentNode.insertBefore(newDiv, div);
        } else {
            div.append(newDiv);
        }
        newDiv.classList = 'comment';
        newDiv.setAttribute('id', 'commentid-' + id);
        loadItem(id).then(resp => { buildCommentDiv(resp, newDiv); }).catch(err => { newDiv.innerHTML = 'failed to load comment ' + id; });
    });
}

function buildCommentDiv(data, div) {
    if (data.deleted) {
        div.innerHTML = '[DELETED]';
        return;
    }

    div.innerHTML += `<p class="postAuthor">By: ${data.by} (${tToS(data.time)})</p>`;
    if (data.text && data.text !== '') {
        div.innerHTML += `<p class="postText">${data.text}</p>`;
    }

    div.append(buildCommentButton(data.kids));
}

function tToS(time) {
    return new Date(time * 1000).toUTCString();
}

async function lookForNewPost() {
    let jobIds, newsIds;

    try {
        await fetch('https://hacker-news.firebaseio.com/v0/jobstories.json').then(async response => response.json()).then(resp => { jobIds = resp; });
    } catch (err) {
        console.error('Failed to fetch job stories:', err);
        return;
    }

    try {
        await fetch('https://hacker-news.firebaseio.com/v0/newstories.json').then(async response => response.json()).then(resp => { newsIds = resp; });
    } catch (err) {
        console.error('Failed to fetch news stories:', err);
        return;
    }

    const popUpMsg = document.getElementById('popUpContainer');
    const popUp = document.getElementById('popUp');
    const liveDataContent = document.getElementById('liveDataContent');
    popUpMsg.innerHTML = '';

    let newContent = false;

    if (newsIds[0] != lastNewsId) {
        lastNewsId = newsIds[0];
        popUpMsg.innerHTML += 'News posted!<br>';
        const newsPost = document.createElement('p');
        newsPost.innerHTML = `New News Post: ${newsIds[0]}`;
        liveDataContent.appendChild(newsPost);
        newContent = true;
    }
    if (jobIds[0] != lastJobId) {
        lastJobId = jobIds[0];
        popUpMsg.innerHTML += 'Job posted!<br>';
        const jobPost = document.createElement('p');
        jobPost.innerHTML = `New Job Post: ${jobIds[0]}`;
        liveDataContent.appendChild(jobPost);
        newContent = true;
    }

    if (newContent) {
        popUp.style.display = 'block';
        setTimeout(() => {
            popUp.style.display = 'none';
        }, 2000); // 1 minute timeout
    }
}

buildPage();