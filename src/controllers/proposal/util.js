export const calculatePropScore = (votes) => {
  let score = 0;
  votes.forEach(vote => {
    score += score !== -1 ? vote.vote : 0;
  })
  return score;
}
