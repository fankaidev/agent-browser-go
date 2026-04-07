/*
type: fetch
domain: reddit.com
args: name=me
*/
fetch(`https://www.reddit.com/user/${name}.json`)
  .then((r) => r.json())
  .then((d) => d.data);
