export const getUsers = async (req, res) => {
  let message = { data: 'OK' };
  return res.status(200).send(message);
}
