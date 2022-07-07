module.exports = {
  disabled: false,
  mongodb: {
    disabled: true,
  },
  accounts: [
    {
      id: 1,
      username: 'user1',
      password: 'user1',
      isAdmin: true,
      allowMultiLogin: true,
    },
  ],
  admin: { username: 'admin', password: 'admin' },
}
