/*
domain: reddit.com
*/
fetch("https://www.reddit.com/best.json?limit=50")
  .then((r) => r.json())
  .then((d) => d.data);
