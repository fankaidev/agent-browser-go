/*
type: fetch
domain: reddit.com
args: limit=50
*/
fetch(`https://www.reddit.com/best.json?limit=${limit}`)
  .then((r) => r.json())
  .then((d) => d.data);
