/*
type: fetch
domain: reddit.com
args: limit=5
*/
fetch(`https://www.reddit.com/best.json?limit=${limit}`)
  .then((r) => r.json())
  .then((d) => d.data);
