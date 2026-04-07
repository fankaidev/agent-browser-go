/*
type: api
args: id
*/
fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json());
