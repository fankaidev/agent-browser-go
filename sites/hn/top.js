/*
type: api
args: limit=10
*/
fetch("https://hacker-news.firebaseio.com/v0/topstories.json")
  .then((r) => r.json())
  .then((data) => data.slice(0, limit));
