export default {
  routes: [
    {
      method: 'POST',
      path: '/stock-arrivals/bulk',
      handler: 'stock-arrival.bulkCreate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
