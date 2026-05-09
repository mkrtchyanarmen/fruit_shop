export default {
  routes: [
    {
      method: 'POST',
      path: '/sale-items/bulk',
      handler: 'sale-item.bulkCreate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
