/*
type: api
args: id, depth=2, limit=10
*/
async function getComments(id, depth, limit) {
  const item = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) =>
    r.json(),
  );
  if (!item.kids || depth === 0) return [];
  const comments = await Promise.all(
    item.kids.slice(0, limit).map(async (kid) => {
      const c = await fetch(`https://hacker-news.firebaseio.com/v0/item/${kid}.json`).then((r) =>
        r.json(),
      );
      c.replies = depth > 1 ? await getComments(kid, depth - 1, limit) : [];
      return c;
    }),
  );
  return comments;
}
getComments(id, depth, limit);
